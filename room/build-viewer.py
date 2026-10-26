# Builds the props viewer (one self-contained page): room/viewer.tpl.html with room/props.js inlined, the cover and certificate
# images embedded and the FWA mark's path. Usage: python3 room/build-viewer.py <out.html>
# (the images are the room's own, in public/room: kesey, webdesign, motd, sotd, persepolis .jpg)
import base64, json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
src, out = os.path.join(here, '..', 'public', 'room'), sys.argv[-1]
tpl = open(os.path.join(here, 'viewer.tpl.html')).read()
props = open(os.path.join(here, 'props.js')).read().replace('export function makeProps', 'function makeProps')
imgs = {k: 'data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(src, k + '.jpg'), 'rb').read()).decode() for k in ['kesey', 'webdesign', 'motd', 'sotd', 'persepolis']}
logo = open(os.path.join(here, 'fwa-logo.path')).read().strip()
page = tpl.replace('%%PROPS%%', props).replace('%%IMAGES%%', json.dumps(imgs)).replace('%%LOGO%%', json.dumps(logo))
open(out, 'w').write(page)
print(out, len(page) // 1024, 'KB')
