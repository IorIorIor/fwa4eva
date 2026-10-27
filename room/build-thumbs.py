#!/usr/bin/env python3
"""The desk's pixel thumbnails: every screenshot in public/data/shots as one 16×16 square (the middle of its top), packed
into one atlas (public/data/thumbs.png, 32 per row) with its index (public/data/thumbs.json: shot name → slot).
Run it after `npm run data`: python3 room/build-thumbs.py
With --sheets DIR it also packs every screenshot at 400 × 250 into sheets of 10 × 10 (DIR/s0.webp …, the same order): the
single page (INLINE_DATA in build.mjs) shows those in a winner's window, since it can't carry 890 files of its own."""
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
SW, SHH, SC, PER = 400, 250, 10, 100
json.dump({'size': S, 'cols': COLS, 'sheet': {'w': SW, 'h': SHH, 'cols': SC, 'per': PER}, 'shots': {n: i for i, n in enumerate(names)}}, open(os.path.join(OUT, 'thumbs.json'), 'w'), separators=(',', ':'))
print(len(names), 'thumbs', atlas.size)

if '--sheets' in sys.argv:
    out = sys.argv[sys.argv.index('--sheets') + 1]; os.makedirs(out, exist_ok=True)
    for k in range(0, len(names), PER):
        sh = Image.new('RGB', (SC * SW, (PER // SC) * SHH), (0, 0, 0))   # (always full: every sheet the same size)
        for j, n in enumerate(names[k:k + PER]):
            try: sh.paste(Image.open(os.path.join(SHOTS, n[:4], n + '.webp')).convert('RGB').resize((SW, SHH), Image.LANCZOS), ((j % SC) * SW, (j // SC) * SHH))
            except Exception as e: print('skip', n, e, file=sys.stderr)
        sh.save(os.path.join(out, 's%d.webp' % (k // PER)), quality=72, method=4)
    print('sheets in', out)
