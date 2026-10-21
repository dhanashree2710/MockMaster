#!/usr/bin/env python3
"""
MockMaster pre-launch verifier. Run from the project root:
    python3 scripts/prelaunch_check.py
Options:
    --fix                 delete known dev leftovers / legacy insecure SQL files, then check
    --allow-placeholders  treat unfilled REPLACE values as WARN (use in CI during development)
Exit code 1 if any FAIL. WARN = recommended but not blocking.
"""
import os, re, sys, json, glob, base64, shutil, subprocess, tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
os.chdir(ROOT)
FIX = '--fix' in sys.argv
ALLOW_PH = '--allow-placeholders' in sys.argv

# Files that must NOT ship: dev demos and the OLD insecure schema (custom login, open policies)
LEGACY = ['supabase-schema.sql', 'mockmaster-schema-and-rls.sql', 'pages/loader-demo.html',
          'flip-card-loader.html', 'assets/snippets', 'uploads']
if FIX:
    import shutil as _sh
    for x in LEGACY:
        if os.path.isdir(x): _sh.rmtree(x); print('removed dir ', x)
        elif os.path.exists(x): os.remove(x); print('removed file', x)
res = {'PASS': 0, 'WARN': 0, 'FAIL': 0}
def say(level, msg):
    res[level] += 1
    print(f'[{level}] {msg}')

def read(p):
    return open(p, encoding='utf8', errors='ignore').read()

HTML = ['index.html'] + glob.glob('pages/*.html') + glob.glob('pages/*/*.html')
JS = glob.glob('assets/js/*.js') + ['sw.js']
SCAN = HTML + JS + ['manifest.webmanifest', 'twa/twa-manifest.json', '.well-known/assetlinks.json']


# --fix also repairs protected pages that load auth-guard but not the Supabase client
if FIX:
    PUBLIC_FIX = {'index.html', 'login.html', 'register.html', 'privacy.html', 'delete-account.html', 'reset-password.html'}
    CDN_SB = '<script src="/vendor/supabase/supabase.js"></script>'
    for f in HTML:
        if os.path.basename(f) in PUBLIC_FIX: continue
        t = open(f, encoding='utf8').read()
        if 'auth-guard.js' in t and 'supabase-client.js' not in t:
            m = re.search(r'([ \t]*)<script src="((?:\.\./)*)assets/js/config\.js"></script>', t)
            if m:
                ind, pre = m.group(1), m.group(2)
                blk = f'{ind}{CDN_SB}\n{ind}<script src="{pre}assets/js/supabase-client.js"></script>\n'
                open(f, 'w', encoding='utf8').write(t.replace(m.group(0), blk + m.group(0), 1))
                print('repaired    ', f, '(added supabase client)')

# 1. placeholders
bad = []
for f in SCAN:
    if os.path.exists(f) and re.search(r'REPLACE[-_.:A-Za-z]*', read(f)) and 'prelaunch' not in f:
        bad.append(f)
if bad: say('WARN' if ALLOW_PH else 'FAIL', 'Unfilled REPLACE placeholders (run scripts/configure.py): ' + ', '.join(sorted(bad)))
else:   say('PASS', 'No placeholders left')

# 2. secrets
secret_pat = [(r'gsk_[A-Za-z0-9]{20,}', 'Groq key'), (r'sk-[A-Za-z0-9_-]{20,}', 'OpenAI key'),
              (r'AIza[0-9A-Za-z_-]{30,}', 'Google API key'), (r'-----BEGIN [A-Z ]*PRIVATE KEY-----', 'private key')]
leak = []
for f in SCAN + glob.glob('supabase/**/*', recursive=True):
    if os.path.isfile(f):
        t = read(f)
        for pat, name in secret_pat:
            if re.search(pat, t): leak.append(f'{f} ({name})')
if leak: say('FAIL', 'Possible secret in code: ' + '; '.join(leak))
else:    say('PASS', 'No API keys / private keys in shipped files')

# 3. Supabase key must be the anon key, never service_role
t = read('assets/js/supabase-client.js')
m = re.search(r"SUPABASE_ANON_KEY\s*=\s*'([^']+)'", t)
if m:
    try:
        seg = m.group(1).split('.')[1]; seg += '=' * (-len(seg) % 4)
        role = json.loads(base64.urlsafe_b64decode(seg)).get('role')
        say('PASS' if role == 'anon' else 'FAIL', f'Supabase key role = {role}' + ('' if role == 'anon' else '  <-- NEVER ship service_role!'))
    except Exception:
        say('WARN', 'Could not decode Supabase key')
else:
    say('FAIL', 'SUPABASE_ANON_KEY not found')

# 4. schema safety - EVERY .sql file in the project, not just the new one
sqls = [f for f in glob.glob('**/*.sql', recursive=True) if 'node_modules' not in f]
stray = [f for f in sqls if f != 'supabase/schema.sql']
say('FAIL' if stray else 'PASS',
    ('Extra/legacy SQL files would re-open the database if run: ' + ', '.join(stray) + '  (fix: python3 scripts/prelaunch_check.py --fix)')
    if stray else 'Only supabase/schema.sql exists')
for f in sqls:
    t = re.sub(r'--.*', '', read(f))
    pol = re.findall(r'CREATE POLICY.*?;', t, re.S | re.I)
    anon_pol = [x.split()[2] for x in pol if re.search(r'\bTO\b[^;]*\banon\b', x, re.I)]
    open_pol = [x.split()[2] for x in pol if re.search(r'USING\s*\(\s*true\s*\)', x, re.I)]
    pw = re.search(r'password_hash\s+text', t, re.I) is not None
    probs = []
    if anon_pol: probs.append(f'policies for anon: {anon_pol}')
    if open_pol: probs.append(f'USING (true) policies: {open_pol}')
    if pw: probs.append('creates password_hash column')
    say('FAIL' if probs else 'PASS', f'{f}: ' + ('; '.join(probs) if probs else 'RLS safe (no anon, no open policy, no password column)'))
if os.path.exists('supabase/schema.sql'):
    s2 = read('supabase/schema.sql')
    say('PASS' if 'delete_my_account' in s2 else 'FAIL', 'delete_my_account() present')
    say('PASS' if len(re.findall('ENABLE ROW LEVEL SECURITY', s2)) >= 14 else 'FAIL', 'RLS enabled on all 14 tables')
else:
    say('FAIL', 'supabase/schema.sql missing')

# 4b. dev leftovers
left = [x for x in LEGACY[2:] if os.path.exists(x)]
say('FAIL' if left else 'PASS', ('Dev/demo leftovers present: ' + ', '.join(left) + '  (fix: --fix)') if left else 'No demo pages / leftover folders')

# 5. JS syntax
if shutil.which('node'):
    errs = []
    for f in JS:
        r = subprocess.run(['node', '--check', f], capture_output=True, text=True)
        if r.returncode: errs.append(f)
    for f in HTML:
        for m in re.finditer(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', read(f), re.S):
            code = m.group(1)
            if not code.strip(): continue
            tmp = tempfile.mktemp(suffix='.js'); open(tmp, 'w', encoding='utf8').write(code)
            r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True); os.remove(tmp)
            if r.returncode: errs.append(f + ' (inline script)')
    say('FAIL' if errs else 'PASS', 'JavaScript syntax OK' if not errs else 'JS syntax errors: ' + ', '.join(errs))
else:
    say('WARN', 'node not installed - skipped JS syntax check')

# 6. every page loads safe-html.js; guarded pages load auth-guard
nosafe = [f for f in HTML if 'safe-html.js' not in read(f)]
say('FAIL' if nosafe else 'PASS', 'safe-html.js on every page' if not nosafe else f'Missing safe-html.js: {nosafe}')


# 6b. script load order + login-guard coverage
PUBLIC_PAGES = {'index.html', 'login.html', 'register.html', 'privacy.html', 'delete-account.html', 'reset-password.html'}
order = []
for f in HTML:
    srcs = re.findall(r'<script[^>]+src="([^"]+)"', read(f))
    idx = lambda k: next((i for i, x in enumerate(srcs) if k in x), None)
    sbl, cli, ag = idx('supabase-js') if idx('supabase-js') is not None else idx('vendor/supabase/supabase.js'), idx('supabase-client.js'), idx('auth-guard.js')
    name = os.path.basename(f)
    if cli is not None and (sbl is None or sbl > cli): order.append(f'{f}: supabase-client.js before/without the supabase library')
    if name not in PUBLIC_PAGES:
        if ag is None: order.append(f'{f}: protected page without auth-guard.js')
        elif cli is None: order.append(f'{f}: auth-guard without supabase-client.js (session cannot be verified, credits do not sync)')
say('FAIL' if order else 'PASS', 'Script order OK and every protected page verifies the session' if not order else 'Script/guard problems: ' + ' | '.join(order[:6]))

# 7. local references exist
miss = []
for f in HTML:
    d = os.path.dirname(f)
    for m in re.finditer(r'(?:src|href)="([^"#?]+)"', read(f)):
        u = m.group(1)
        if u.startswith(('http', 'mailto', 'tel', 'data:', 'javascript', '/', '$', '{')) or '${' in u: continue
        if not os.path.exists(os.path.normpath(os.path.join(d, u))): miss.append(f'{f} -> {u}')
say('FAIL' if miss else 'PASS', 'All local file references exist' if not miss else 'Broken refs: ' + '; '.join(miss[:8]))

# 8. manifest + icons + service worker precache
man = json.load(open('manifest.webmanifest', encoding='utf8'))
try:
    from PIL import Image
    ok = True
    for ic in man.get('icons', []):
        p = ic['src']
        if not os.path.exists(p): ok = False; say('FAIL', f'Manifest icon missing: {p}'); continue
        w, h = Image.open(p).size
        if f'{w}x{h}' != ic['sizes']: ok = False; say('FAIL', f'Icon {p} is {w}x{h}, manifest says {ic["sizes"]}')
    if ok: say('PASS', 'Manifest icons exist with correct sizes')
except ImportError:
    say('WARN', 'Pillow not installed - skipped icon size check')
pre = re.search(r'PRECACHE\s*=\s*\[(.*?)\]', read('sw.js'), re.S).group(1)
missing_pre = [u for u in re.findall(r"'\./?([^']*)'", pre) if u and not os.path.exists(u)]
say('FAIL' if missing_pre else 'PASS', 'Service worker precache files exist' if not missing_pre else f'SW precache missing: {missing_pre}')

# 9. privacy / delete pages
for p in ('pages/privacy.html', 'pages/delete-account.html'):
    say('PASS' if os.path.exists(p) else 'FAIL', f'{p} present')
say('PASS' if 'privacy.html' in read('pages/login.html') and 'delete' in read('pages/settings.html').lower() else 'FAIL',
    'Privacy link on sign-up + delete-account in Settings')

# 10. TWA files
tw = read('twa/twa-manifest.json'); al = read('.well-known/assetlinks.json')
say('PASS' if 'REPLACE' not in tw + al else 'WARN', 'TWA manifest + assetlinks filled in' if 'REPLACE' not in tw + al else 'TWA / assetlinks still have placeholders (needed before building the AAB)')

# 11. CDN dependencies
cdn = set()
for f in HTML + JS:
    cdn |= set(re.findall(r'https://(?:cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)/[^"\'\s)]+', read(f)))
cdn = {u for u in cdn if 'esm.sh' not in u}
if cdn: say('WARN', f'{len(cdn)} CDN URL(s) still used. Run `python3 scripts/vendor_assets.py` (needs internet) to self-host for reliability.')
else:   say('PASS', 'All libraries self-hosted')

# 12. consistency checks
try:
    al_json = json.load(open('.well-known/assetlinks.json', encoding='utf8'))
    tw_json = json.load(open('twa/twa-manifest.json', encoding='utf8'))
    say('PASS', 'assetlinks.json and twa-manifest.json are valid JSON')
    pk_a = al_json[0]['target']['package_name']; pk_t = tw_json['packageId']
    say('PASS' if pk_a == pk_t else 'FAIL', f'Package id matches in assetlinks and TWA ({pk_a})' if pk_a == pk_t else f'Package id mismatch: assetlinks={pk_a} twa={pk_t}')
except Exception as e:
    say('FAIL', f'TWA/assetlinks JSON problem: {e}')
cfg = read('assets/js/config.js'); sc = read('assets/js/supabase-client.js')
u = re.search(r"SUPABASE_URL\s*=\s*'([^']+)'", sc); pr = re.search(r"aiProxyUrl:\s*'([^']*)'", cfg)
if u and pr:
    say('PASS' if pr.group(1).startswith(u.group(1)) else 'FAIL', 'AI proxy URL points at the same Supabase project')
hdr = read('_headers') if os.path.exists('_headers') else ''
say('PASS' if 'Content-Security-Policy' in hdr else 'WARN', 'CSP/security headers file present' if 'Content-Security-Policy' in hdr else '_headers has no CSP')
vc = tw_json.get('appVersionCode') if 'tw_json' in dir() else None
say('PASS' if isinstance(vc, int) and vc >= 1 else 'WARN', f'appVersionCode = {vc}')

print(f"\nSummary: {res['PASS']} pass, {res['WARN']} warn, {res['FAIL']} fail")
sys.exit(1 if res['FAIL'] else 0)
