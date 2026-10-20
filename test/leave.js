const s=__sky, V=s.THREE.Vector3; const fast=(n)=>{for(let i=0;i<n;i++)s.tickOnly(50)};
const i=1234, sp=s.starPos(i), out={};
s.player.pos.copy(sp).add(new V(1,0,0).multiplyScalar(s.stopR(i)*1.05)); s.player.vel.set(0,0,0); s.player.cruise=0;
s.aimAt(new V(1,0,0),1); s.player.base.copy(s.rig.q); s.keys.w=true; out.away=[];
for(let k=0;k<16;k++){fast(5); out.away.push([+(k*.25+.25).toFixed(2), Math.round(s.starPos(i).distanceTo(s.player.pos)), Math.round(s.player.vel.length())])}
s.keys.w=false; return out;
