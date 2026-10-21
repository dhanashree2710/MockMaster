#!/usr/bin/env python3
"""
Fill in every launch placeholder in ONE command (run from the project root):

  python3 scripts/configure.py \
      --email  support@yourdomain.com \
      --host   app.yourdomain.com \
      --package com.yourname.mockmaster \
      --sha256 "AA:BB:CC:...:FF"        # Play Console -> Setup -> App signing -> SHA-256

Any option may be omitted and run again later. --sha256 is the *App signing key*
certificate fingerprint shown in Play Console (NOT your local upload key).
"""
import argparse, re, sys, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TOKENS = {
    'email':   'support@REPLACE-WITH-YOUR-DOMAIN.com',
    'host':    'REPLACE-your-host.example.com',
    'package': 'REPLACE.WITH.YOUR.PACKAGE.ID',
    'sha256':  'REPLACE:WITH:THE:SHA256:FINGERPRINT:OF:YOUR:PLAY-APP-SIGNING-KEY',
}
TEXT_EXT = ('.html', '.js', '.json', '.md', '.txt', '.webmanifest', '.ts', '.py')
SKIP_DIRS = {'.git', 'node_modules', 'vendor'}
SKIP_FILES = {'configure.py', 'prelaunch_check.py'}

def validate(k, v):
    ok = {
        'email':   r'^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$',
        'host':    r'^(?!https?://)[A-Za-z0-9.-]+\.[A-Za-z]{2,}$',
        'package': r'^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$',
        'sha256':  r'^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$',
    }[k]
    if not re.match(ok, v):
        sys.exit(f'Invalid --{k}: {v!r}')

def main():
    ap = argparse.ArgumentParser()
    for k in TOKENS: ap.add_argument('--' + k)
    a = vars(ap.parse_args())
    todo = {k: v.strip() for k, v in a.items() if v}
    if not todo: ap.print_help(); return
    for k, v in todo.items(): validate(k, v)
    changed = 0
    for d, dirs, files in os.walk(ROOT):
        dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
        for fn in files:
            if fn in SKIP_FILES or not fn.endswith(TEXT_EXT): continue
            p = os.path.join(d, fn)
            try: s = open(p, encoding='utf8').read()
            except Exception: continue
            n = s
            for k, v in todo.items():
                n = n.replace(TOKENS[k], v)
            if n != s:
                open(p, 'w', encoding='utf8').write(n); changed += 1
                print('updated', os.path.relpath(p, ROOT))
    print(f'\nDone. {changed} file(s) updated. Now run: python3 scripts/prelaunch_check.py')

if __name__ == '__main__':
    main()
