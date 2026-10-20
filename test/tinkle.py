import asyncio, sys, json
from playwright.async_api import async_playwright
FLAGS=["--enable-unsafe-webgpu","--use-webgpu-adapter=swiftshader","--enable-features=Vulkan","--use-vulkan=swiftshader","--use-angle=swiftshader","--ignore-gpu-blocklist","--autoplay-policy=no-user-gesture-required"]
INIT="""
window.__osc=0; const _co=AudioContext.prototype.createOscillator; AudioContext.prototype.createOscillator=function(){window.__osc++;return _co.call(this)};
"""
async def main():
  url=sys.argv[1]
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True,args=FLAGS)
    pg=await b.new_page(viewport={'width':1100,'height':700}); logs=[]
    pg.on('console',lambda m:logs.append(f'[{m.type}] {m.text}')); pg.on('pageerror',lambda e:logs.append(f'[pageerror] {e}'))
    await pg.add_init_script(INIT)
    await pg.goto(url)
    await pg.wait_for_function('window.__ready===true',timeout=240000)
    s='window.__sky'
    await pg.mouse.click(30,400)   # user gesture: starts audio
    await pg.evaluate("async()=>{await __sky.run(3)}")
    r0=await pg.evaluate("({osc:__osc, st: (window.AC_STATE||null)})")
    # map mode, find a star on screen and hover it
    await pg.evaluate("async()=>{__sky.setMode('map'); for(let i=0;i<150;i++) __sky.tickOnly(20); await __sky.run(2)}")
    pts=await pg.evaluate("""()=>{const s=__sky,c=s.camera,out=[];for(let i=0;i<s.D.length&&out.length<6;i+=37){const v=s.starPos(i).project(c);if(Math.abs(v.x)<.8&&Math.abs(v.y)<.8&&v.z<1)out.push([(v.x*.5+.5)*innerWidth,(-v.y*.5+.5)*innerHeight,i])}return out}""")
    res=[]
    for x,y,i in pts:
      await pg.mouse.move(x,y); await pg.evaluate("async()=>{await __sky.run(6)}")
      res.append(await pg.evaluate("({osc:__osc, tip: !document.getElementById('tip').hidden})"))
    print('before',r0,'pts',len(pts),'after',res)
    for l in logs[:15]: print(l[:300])
    await b.close()
asyncio.run(main())
