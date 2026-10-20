"""shots.py URL PREFIX W H 'name:js;name:js' — one page load, several posed screenshots"""
import asyncio, sys, json, os
from playwright.async_api import async_playwright
FLAGS=["--enable-unsafe-webgpu","--use-webgpu-adapter=swiftshader","--enable-features=Vulkan","--use-vulkan=swiftshader","--use-angle=swiftshader","--ignore-gpu-blocklist","--autoplay-policy=no-user-gesture-required"]
POSES=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'poses.js')).read()
async def main():
  url,pre,W,H,spec=sys.argv[1],sys.argv[2],int(sys.argv[3]),int(sys.argv[4]),sys.argv[5]
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True,args=FLAGS)
    pg=await b.new_page(viewport={'width':W,'height':H}); logs=[]
    pg.on('console',lambda m:logs.append(f'[{m.type}] {m.text}')); pg.on('pageerror',lambda e:logs.append(f'[pageerror] {e}'))
    if os.environ.get('INIT'): await pg.add_init_script(os.environ['INIT'])
    await pg.goto(url); await pg.wait_for_function('window.__ready===true',timeout=240000)
    await pg.evaluate('()=>{'+POSES+'}')
    for item in spec.split(';;'):
      name,js=item.split('::',1)
      try:
        r=await pg.evaluate('async()=>{const t=__sky;'+js+'}')
        if r is not None: print(name,'=>',json.dumps(r)[:800])
      except Exception as e: print(name,'ERR',str(e)[:800])
      await pg.screenshot(path=f'{pre}_{name}.png',timeout=180000)
    seen=set()
    for l in logs:
      if l[:160] not in seen: seen.add(l[:160]); print(l[:1500])
    await b.close()
asyncio.run(main())
