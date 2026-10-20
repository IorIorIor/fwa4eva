window.__pose=(t,name)=>{const V=t.THREE.Vector3,up=new V(0,1,0).applyQuaternion(t.GQ),side=new V(1,0,0).applyQuaternion(t.GQ);let target=t.GC.clone();
 if(name==='far'){t.player.pos.copy(t.GC).addScaledVector(side,1400000).addScaledVector(up,420000)}
 else if(name==='arm'){t.player.pos.copy(t.ringPoint(.42,1.0,2500))}
 else if(name==='armout'){t.player.pos.copy(t.ringPoint(.75,2.2,9000));target=t.ringPoint(.55,2.9,0)}
 else if(name==='bh'){t.player.pos.copy(t.GC).addScaledVector(side,90000).addScaledVector(up,20000)}
 else if(name==='star'){const p=t.starPos(1234);t.player.pos.copy(p).add(new V(1,.3,.5).normalize().multiplyScalar(t.stopR(1234)*4));target=p}
 if(name==='map'){t.setMode('map');return}
 if(name!=='start'){t.aimAt(target.clone().sub(t.player.pos),1);t.player.base.copy(t.rig.q);t.player.quat.copy(t.rig.q);t.player.vel.set(0,0,0)}
 const a=document.getElementById('arrive');if(a)a.style.display='none'};
window.__bhAt=(t,d,up)=>{const V=t.THREE.Vector3,u=new V(0,1,0).applyQuaternion(t.GQ),side=new V(1,0,0).applyQuaternion(t.GQ);t.player.pos.copy(t.GC).addScaledVector(side,d).addScaledVector(u,d*(up??.22));t.aimAt(t.GC.clone().sub(t.player.pos),1);t.player.base.copy(t.rig.q);t.player.quat.copy(t.rig.q);t.player.vel.set(0,0,0);const a=document.getElementById('arrive');if(a)a.style.display='none'};
