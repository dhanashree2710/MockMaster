#!/usr/bin/env python3
"""
Self-host every third-party library so the app works on slow/flaky mobile data
and no CDN can break (or tamper with) your Play Store app.

Run ONCE on a machine with internet, from the project root:

    python3 scripts/vendor_assets.py

It downloads the exact pinned versions into ./vendor/ and rewrites the CDN URLs in
all .html/.js files to root-absolute paths (/vendor/...). Host the site at the
domain ROOT (e.g. https://app.yourdomain.com/). Commit the vendor/ folder.

Options:
  --rewrite-only   skip downloading (use if vendor/ is already populated)
  --check          only list which CDN URLs are still referenced

Google Fonts (Inter) is left on the CDN: the app has system-font fallbacks.
"""
import os, re, sys, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# CDN URL  ->  (local path under vendor/)
FILES = {
 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css': 'bootstrap/bootstrap.min.css',
 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js': 'bootstrap/bootstrap.bundle.min.js',
 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css': 'bootstrap-icons/font/bootstrap-icons.min.css',
 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1': 'supabase/supabase.js',
 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js': 'chartjs/chart.umd.min.js',
 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js': 'jspdf/jspdf.umd.min.js',
 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js': 'pdfjs/pdf.min.js',
 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js': 'pdfjs/pdf.worker.min.js',
 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js': 'mammoth/mammoth.browser.min.js',
}
# extra files that are only referenced indirectly (icon-font files used by the CSS)
EXTRA_DOWNLOADS = {
 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff2': 'bootstrap-icons/font/fonts/bootstrap-icons.woff2',
 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff': 'bootstrap-icons/font/fonts/bootstrap-icons.woff',
 # supabase UMD actually lives here (the bare package URL redirects to it)
 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/dist/umd/supabase.js': 'supabase/supabase.js',
}

def download():
    todo = {}
    for url, rel in FILES.items():
        todo[rel] = url
    for url, rel in EXTRA_DOWNLOADS.items():
        todo[rel] = url          # explicit URL wins (supabase)
    for rel, url in todo.items():
        dest = os.path.join(ROOT, 'vendor', rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        print('↓', url)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        data = urllib.request.urlopen(req, timeout=60).read()
        if len(data) < 500:
            sys.exit('Download too small, aborting: ' + url)
        open(dest, 'wb').write(data)

def source_files():
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in ('vendor', 'node_modules', '.git', 'supabase', 'scripts', 'twa')]
        for f in files:
            if f.endswith(('.html', '.js')):
                yield os.path.join(base, f)

def rewrite():
    total = 0
    for path in source_files():
        s = open(path, encoding='utf-8').read(); orig = s
        for url, rel in FILES.items():
            s = s.replace(url, '/vendor/' + rel)
        if s != orig:
            open(path, 'w', encoding='utf-8').write(s)
            total += 1
            print('rewrote', os.path.relpath(path, ROOT))
    print('files changed:', total)

def check():
    pat = re.compile(r'https://(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com)[^"\'`\s)]*')
    for path in source_files():
        for m in pat.finditer(open(path, encoding='utf-8').read()):
            print(os.path.relpath(path, ROOT), m.group(0))

if __name__ == '__main__':
    if '--check' in sys.argv: check(); sys.exit()
    if '--rewrite-only' not in sys.argv: download()
    rewrite()
    print('\nDone. Test locally (python3 -m http.server 8080), then commit vendor/.')
