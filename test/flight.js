const s=__sky, out={speeds:[], log:[]};
const step=async(sec)=>{const n=Math.round(sec/0.05);for(let i=0;i<n;i++){await s.run(0,50)}};
// fast logic stepping without rAF waits
const fast=(sec)=>{const n=Math.round(sec/0.05);for(let i=0;i<n;i++)s.tickOnly(50)};
s.keys.w=true;
for(let t=0;t<=30;t+=2.5){out.speeds.push([t,Math.round(s.player.vel.length()),+s.player.cruise.toFixed(3),s.regionOf(s.player.pos)]);fast(2.5)}
s.keys.w=false; fast(4); out.glide=Math.round(s.player.vel.length());
s.keys.s=true; fast(2); s.keys.s=false; out.braked=Math.round(s.player.vel.length());
// lock onto the nearest visible star ahead and fly to it
const P=s.P; let best=-1,bd=1e18; for(let i=0;i<s.D.length;i++){const dx=P[i*3]-s.player.pos.x,dy=P[i*3+1]-s.player.pos.y,dz=P[i*3+2]-s.player.pos.z,d=dx*dx+dy*dy+dz*dz;if(d<bd&&d>4e8){bd=d;best=i}}
s.focus(best); out.lock={i:best,dist:Math.round(Math.sqrt(bd))}; s.keys.w=true;
for(let k=0;k<40;k++){fast(1); const d=s.starPos(best).distanceTo(s.player.pos); out.log.push([k,Math.round(d),Math.round(s.player.vel.length()),s.lockI()]); if(s.lockI()<0)break}
s.keys.w=false; fast(3); out.parked=Math.round(s.player.vel.length()); out.final=Math.round(s.starPos(best).distanceTo(s.player.pos)); out.stopR=s.stopR(best);
s.setMode('map'); fast(3); out.map=s.S.mode; s.setMode('fly'); fast(2);
s.S.y0=2010; s.S.y1=2012; s.applyFilter(); out.filtered=s.matchCount(); s.S.y0=2000; s.S.y1=2026; s.applyFilter();
s.LOOK.haze=.5; s.LOOK.volumetric=1; s.applyLook(); fast(.5); s.LOOK.volumetric=0; s.applyLook();
out.nan=[s.player.pos.x,s.player.pos.y,s.camera.position.z].some(v=>!Number.isFinite(v));
return out;
