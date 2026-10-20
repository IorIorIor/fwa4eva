const s=__sky, out={};
const fast=(sec,dt=50)=>{const n=Math.round(sec*1000/dt);for(let i=0;i<n;i++)s.tickOnly(dt)};
const V=s.THREE.Vector3;
// 1) W cruise curve
s.keys.w=true; out.cruise=[]; for(let t=0;t<=30;t+=5){out.cruise.push([t,Math.round(s.player.vel.length())]);fast(5)} s.keys.w=false; fast(3);
// 2) boost only: keeps going the way it's going
s.player.vel.set(0,0,0); fast(1); const d0=s.player.vel.clone(); s.player.vel.set(300,0,0); s.keys.shift=true; fast(1.5); out.boostOnly={vel:s.player.vel.toArray().map(Math.round)}; s.keys.shift=false; fast(4);
// 3) lock on a star and fly there; lock should hold on arrival
let best=-1,bd=1e18; for(let i=0;i<s.D.length;i++){const d=s.starPos(i).distanceTo(s.player.pos);if(d<bd&&d>2e4){bd=d;best=i}}
s.focus(best); s.keys.w=true; out.lockLog=[]; for(let k=0;k<60;k++){fast(1); const d=s.starPos(best).distanceTo(s.player.pos); out.lockLog.push([k,Math.round(d),Math.round(s.player.vel.length())]); if(d<s.stopR(best)*1.3)break}
s.keys.w=false; fast(4); out.arrive={lock:s.lockI(),i:best,dist:+s.starPos(best).distanceTo(s.player.pos).toFixed(1),stopR:+s.stopR(best).toFixed(1),vel:+s.player.vel.length().toFixed(2)};
// 4) bounce: aim at the star at an angle, slow
const sp=s.starPos(best), n=s.player.pos.clone().sub(sp).normalize(), t=new V(0,1,0).cross(n).normalize();
s.focus(-1); s.player.pos.copy(sp).addScaledVector(n,s.stopR(best)*2.5); s.player.vel.copy(n).multiplyScalar(-40).addScaledVector(t,25); s.aimAt(s.player.vel.clone(),1); s.player.base.copy(s.rig.q); s.keys.w=true; out.bounce=[];
let minD=1e9; for(let k=0;k<80;k++){s.tickOnly(50); const d=s.starPos(best).distanceTo(s.player.pos); minD=Math.min(minD,d); if(k%6===0) out.bounce.push([k,+d.toFixed(1),+s.player.vel.dot(n).toFixed(1),+s.player.vel.dot(t).toFixed(1)])}
s.keys.w=false; out.bounceMin={minD:+minD.toFixed(1),hard:+(s.stopR(best)/1.35*1.06).toFixed(1)};
// 5) approach a far star fast without lock: how speed falls with distance
s.lockI(); let far=-1; for(let i=0;i<s.D.length;i++){const d=s.starPos(i).distanceTo(s.player.pos);if(d>3e5&&d<5e5){far=i;break}}
s.player.pos.copy(s.starPos(far)).add(new V(1,0,0).multiplyScalar(4e5)); s.aimAt(s.starPos(far).clone().sub(s.player.pos),1); s.player.base.copy(s.rig.q); s.player.vel.set(-6e5,0,0);
s.keys.w=true; out.approach=[]; for(let k=0;k<160;k++){s.tickOnly(50); const d=s.starPos(far).distanceTo(s.player.pos)-s.stopR(far); if(k%8===0) out.approach.push([Math.round(d),Math.round(s.player.vel.length()),s.nearI===far,Math.round(s.player.pos.distanceTo(s.GC)),s.nearI>=0?Math.round(s.starPos(s.nearI).distanceTo(s.player.pos)):-1]) } s.keys.w=false; fast(2);
out.nan=[s.player.pos.x,s.player.pos.y,s.camera.position.z].some(v=>!Number.isFinite(v));
return out;
