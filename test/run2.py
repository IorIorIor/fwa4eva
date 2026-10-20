import asyncio, sys, json
from playwright.async_api import async_playwright
FLAGS=["--enable-unsafe-webgpu","--use-webgpu-adapter=swiftshader","--enable-features=Vulkan","--use-vulkan=swiftshader","--use-angle=swiftshader","--ignore-gpu-blocklist"]
async def main():
  url,js=sys.argv[1],open(sys.argv[2]).read()
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True,args=FLAGS); pg=await b.new_page(viewport={'width':800,'height':500}); logs=[]
    pg.on('pageerror',lambda e:logs.append(f'[pageerror] {e}')); pg.on('console',lambda m:logs.append(f'[{m.type}] {m.text}') if m.type=='error' else None)
    await pg.goto(url+'&norender'); await pg.wait_for_function('window.__ready===true',timeout=240000)
    r=await pg.evaluate('async()=>{'+js+'}'); print(json.dumps(r,indent=0)[:6000])
    for l in logs[:10]: print(l[:500])
    await b.close()
asyncio.run(main())
