#!/usr/bin/env python3
"""The desk's pixel thumbnails: every screenshot in public/data/shots as one 16×16 square (the middle of its top), packed
into one atlas (public/data/thumbs.png, 32 per row) with its index (public/data/thumbs.json: shot name → slot).
Run it after `npm run data`: python3 room/build-thumbs.py"""
import json, os, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SHOTS, OUT = os.path.join(ROOT, 'public', 'data', 'shots'), os.path.join(ROOT, 'public', 'data')
S, COLS = 16, 32
names = sorted(f[:-5] for y in os.listdir(SHOTS) for f in os.listdir(os.path.join(SHOTS, y)) if f.endswith('.webp'))
rows = (len(names) + COLS - 1) // COLS
atlas = Image.new('RGB', (COLS * S, rows * S), (0, 0, 0))
for i, n in enumerate(names):
    try:
        im = Image.open(os.path.join(SHOTS, n[:4], n + '.webp')).convert('RGB')
        w, h = im.size; s = min(w, h); x0 = (w - s) // 2
        im = im.crop((x0, 0, x0 + s, s)).resize((S, S), Image.BOX)
        atlas.paste(im, ((i % COLS) * S, (i // COLS) * S))
    except Exception as e:
        print('skip', n, e, file=sys.stderr)
atlas.save(os.path.join(OUT, 'thumbs.png'), optimize=True)
json.dump({'size': S, 'cols': COLS, 'shots': {n: i for i, n in enumerate(names)}}, open(os.path.join(OUT, 'thumbs.json'), 'w'), separators=(',', ':'))
print(len(names), 'thumbs', atlas.size)
