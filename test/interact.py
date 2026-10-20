import asyncio, sys, json, os
from playwright.async_api import async_playwright
FLAGS=["--enable-unsafe-webgpu","--use-webgpu-adapter=swiftshader","--enable-features=Vulkan","--use-vulkan=swiftshader","--use-angle=swiftshader","--ignore-gpu-blocklist","--autoplay-policy=no-user-gesture-required"]
INIT="window.__osc=0; const _co=AudioContext.prototype.createOscillator; AudioContext.prototype.createOscillator=function(){window.__osc++;return _co.call(this)};"
async def main():
  url=sys.argv[1]
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True,args=FLAGS)
    pg=await b.new_page(viewport={'width':1280,'height':720}); logs=[]
    pg.on('console',lambda m:logs.append(f'[{m.type}] {m.text}')); pg.on('pageerror',lambda e:logs.append(f'[pageerror] {e}'))
    await pg.add_init_script(INIT)
    await pg.goto(url); await pg.wait_for_function('window.__ready===true',timeout=240000)
    await pg.mouse.click(20,700)
    await pg.evaluate("async()=>{const t=__sky;t.setMode('map');for(let i=0;i<200;i++)t.tickOnly(20);await t.run(2)}")
    # find a ring point on screen: 2015 ring at the ruler angle + .5
    pt=await pg.evaluate("()=>{const t=__sky;const u=(new Date(Date.UTC(2015,0,1)),0);let best=null;for(let a=0;a<6.28;a+=.2){const p=t.ringPoint(Math.pow(1-(15/27),.62),a,0).project(t.camera);const x=(p.x*.5+.5)*innerWidth,y=(-p.y*.5+.5)*innerHeight;if(x>100&&x<innerWidth-300&&y>100&&y<innerHeight-100){best=[x,y];break}}return best}")
    print('ring pt',pt,flush=True)
    await pg.mouse.move(pt[0]+2,pt[1]+1); await pg.evaluate("async()=>{for(let i=0;i<10;i++)__sky.tickOnly(20);await __sky.run(3)}")
    r=await pg.evaluate("({hov:__sky.ringHov&&__sky.ringHov.y, tip:document.getElementById('tip').innerText, osc:__osc, hiA:__sky.timeRings.u.hiA.value})")
    print('hover',r,flush=True)
    await pg.screenshot(path='i_ringhover.png')
    await pg.mouse.click(pt[0]+2,pt[1]+1); await pg.evaluate("async()=>{for(let i=0;i<120;i++)__sky.tickOnly(20);await __sky.run(3)}")
    r=await pg.evaluate("({d:__sky.orbit.dist, yrs:__sky.mapYrs, lvl:[...__sky.mapLvl]})"); print('after click',r)
    await pg.screenshot(path='i_ringzoom.png')
    # star hover at this zoom
    pts=await pg.evaluate("""()=>{const s=__sky,c=s.camera,out=[];for(let i=0;i<s.D.length&&out.length<40;i++){const v=s.starPos(i).project(c);if(Math.abs(v.x)<.7&&Math.abs(v.y)<.7&&v.z<1)out.push([(v.x*.5+.5)*innerWidth,(-v.y*.5+.5)*innerHeight,i])}return out}""")
    print('stars on screen',len(pts))
    if pts:
      x,y,i=pts[len(pts)//2]; await pg.mouse.move(x,y); await pg.evaluate("async()=>{for(let i=0;i<6;i++)__sky.tickOnly(20);await __sky.run(3)}")
      r=await pg.evaluate("({hovI:__sky.hovI, tip:document.getElementById('tip').innerText, osc:__osc})"); print('star hover',r)
      await pg.screenshot(path='i_starhover.png')
    # drag pan
    t0=await pg.evaluate("__sky.orbit.target.toArray()")
    await pg.mouse.move(600,400); await pg.mouse.down(); await pg.mouse.move(700,450,steps=5); await pg.mouse.up()
    t1=await pg.evaluate("__sky.orbit.target.toArray()"); print('pan', [round(b-a) for a,b in zip(t0,t1)])
    # wheel zoom
    d0=await pg.evaluate("__sky.orbit.dist"); await pg.mouse.wheel(0,-600); d1=await pg.evaluate("__sky.orbit.dist"); print('zoom',d0,'->',d1)
    # look panel
    await pg.evaluate("async()=>{__sky.setMode('fly');for(let i=0;i<60;i++)__sky.tickOnly(20);document.getElementById('lbtn').click();await __sky.run(2)}")
    await pg.evaluate("()=>{[...document.querySelectorAll('.lhd')].slice(0,2).forEach(h=>{if(!h.parentElement.classList.contains('open'))h.click()})}")
    await pg.evaluate("async()=>{await __sky.run(2)}")
    await pg.screenshot(path='i_look.png')
    seen=set()
    for l in logs:
      if l[:160] not in seen: seen.add(l[:160]); print(l[:600])
    await b.close()
asyncio.run(main())
