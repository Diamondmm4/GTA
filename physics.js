function updateTraffic(c,dt){
 if(!c.ai||c.occupied)return;
 c.hitCd=Math.max(0,c.hitCd-dt);
 const target=95+(c.id%4)*18;
 c.speed=lerp(c.speed,target,dt*.6);
 if(c.axis==='x'){
   c.angle=c.speed>=0?(Math.abs(wrapAngle(c.angle))<1?0:Math.PI):c.angle;
   c.x+=Math.cos(c.angle)*c.speed*dt;c.y=lerp(c.y,c.laneTarget,dt*2);
   if(c.x>HALF+100)c.x=-HALF-100;if(c.x<-HALF-100)c.x=HALF+100;
 }else{
   c.y+=Math.sin(c.angle)*c.speed*dt;c.x=lerp(c.x,c.laneTarget,dt*2);
   if(c.y>HALF+100)c.y=-HALF-100;if(c.y<-HALF-100)c.y=HALF+100;
 }
}
function updateControlledCar(c,dt,aiPolice=false){
 let throttle=0,steer=0,hand=false,boost=false;
 if(aiPolice){
   const t=player.vehicle||player,dx=t.x-c.x,dy=t.y-c.y,desired=Math.atan2(dy,dx),diff=wrapAngle(desired-c.angle);
   steer=clamp(diff*1.9,-1,1);throttle=Math.abs(diff)>1.7?.25:1;boost=player.wanted>=3;
 }else{throttle=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0);steer=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);hand=!!keys[' '];boost=!!keys.shift}
 const t=c.type;
 const forwardX=Math.cos(c.angle),forwardY=Math.sin(c.angle);
 let longitudinal=c.vx*forwardX+c.vy*forwardY;
 const lateral=-c.vx*forwardY+c.vy*forwardX;
 const acc=t.acc*(boost?1.18:1);
 c.vx+=forwardX*throttle*acc*dt;c.vy+=forwardY*throttle*acc*dt;
 const max=t.max*(boost?1.1:1),spd=Math.hypot(c.vx,c.vy);if(spd>max){c.vx*=max/spd;c.vy*=max/spd}
 const grip=hand?2.2:8.5,latDamp=Math.min(1,grip*dt);c.vx+=forwardY*lateral*latDamp;c.vy-=forwardX*lateral*latDamp;
 const drag=Math.max(0,1-t.drag*dt*(throttle?0.35:1));c.vx*=drag;c.vy*=drag;
 longitudinal=c.vx*forwardX+c.vy*forwardY;
 const steerScale=clamp(Math.abs(longitudinal)/95,.12,1.15);c.angle+=steer*t.turn*steerScale*dt*(longitudinal>=-3?1:-1);
 c.x+=c.vx*dt;c.y+=c.vy*dt;
 carWorldCollision(c,dt);
}
function carWorldCollision(c,dt){
 if(!onWorld(c.x,c.y)){c.x=clamp(c.x,-HALF+40,HALF-40);c.y=clamp(c.y,-HALF+40,HALF-40);c.vx*=-.35;c.vy*=-.35;shake=Math.max(shake,5)}
 const b=collidesBuilding(c.x,c.y,Math.max(c.type.w,c.type.h)*.42);
 if(b){
   const cx=clamp(c.x,b.x,b.x+b.w),cy=clamp(c.y,b.y,b.y+b.h),dx=c.x-cx,dy=c.y-cy;
   if(Math.abs(dx)>Math.abs(dy)){c.x=dx>0?b.x+b.w+c.type.w*.48:b.x-c.type.w*.48;c.vx*=-.28;c.vy*=.72}else{c.y=dy>0?b.y+b.h+c.type.w*.48:b.y-c.type.w*.48;c.vy*=-.28;c.vx*=.72}
   const impact=Math.hypot(c.vx,c.vy);c.health-=impact*.018;shake=Math.max(shake,clamp(impact*.03,2,11));for(let i=0;i<5;i++)addParticle(c.x,c.y,(Math.random()-.5)*120,(Math.random()-.5)*120,.4+Math.random()*.3,2,'spark');
   audioTone(90,.08,'sawtooth',.025);
 }
}
function carPairCollisions(){
 for(let i=0;i<cars.length;i++) for(let j=i+1;j<cars.length;j++){
   const a=cars[i],b=cars[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=(a.type.w+b.type.w)*.42;
   if(d>0&&d<min){const nx=dx/d,ny=dy/d,over=min-d;a.x-=nx*over*.5;a.y-=ny*over*.5;b.x+=nx*over*.5;b.y+=ny*over*.5;const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rv<0){const imp=-rv*.58;a.vx-=nx*imp;a.vy-=ny*imp;b.vx+=nx*imp;b.vy+=ny*imp;if(imp>50){a.health-=imp*.025;b.health-=imp*.025;shake=Math.max(shake,imp*.025);if(a===player.vehicle||b===player.vehicle)addWanted(.18)}}}
 }
}
function tryEnterExit(){
 if(player.vehicle){const c=player.vehicle;player.vehicle=null;c.occupied=false;player.x=c.x+Math.cos(c.angle+Math.PI/2)*38;player.y=c.y+Math.sin(c.angle+Math.PI/2)*38;player.vx=c.vx*.15;player.vy=c.vy*.15;toast('Exited '+c.type.name);return}
 let best=null,bd=65;for(const c of cars){const d=dist(player,c);if(d<bd&&c.kind!=='police'){best=c;bd=d}}
 if(best){player.vehicle=best;best.occupied=true;best.ai=false;player.x=best.x;player.y=best.y;toast('Entered '+best.type.name);audioTone(530,.08,'triangle',.03)}
}
function updatePlayer(dt){
 player.invuln=Math.max(0,player.invuln-dt);
 if(player.vehicle){const c=player.vehicle;updateControlledCar(c,dt,false);player.x=c.x;player.y=c.y;player.angle=c.angle;return}
 const mx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),my=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0),m=Math.hypot(mx,my)||1;
 const speed=keys.shift?235:160,acc=14;
 player.vx=lerp(player.vx,mx/m*speed,Math.min(1,acc*dt));player.vy=lerp(player.vy,my/m*speed,Math.min(1,acc*dt));if(!mx&&!my){player.vx*=Math.max(0,1-11*dt);player.vy*=Math.max(0,1-11*dt)}
 let nx=player.x+player.vx*dt,ny=player.y+player.vy*dt;
 if(!collidesBuilding(nx,player.y,player.r)&&onWorld(nx,player.y))player.x=nx;else player.vx=0;
 if(!collidesBuilding(player.x,ny,player.r)&&onWorld(player.x,ny))player.y=ny;else player.vy=0;
 player.angle=Math.atan2(mouse.worldY-player.y,mouse.worldX-player.x);
 for(const c of cars){if(dist(player,c)<player.r+c.type.w*.35){const dx=player.x-c.x,dy=player.y-c.y,d=Math.hypot(dx,dy)||1;player.x+=dx/d*2;player.y+=dy/d*2}}
}
function updatePeds(dt){
 for(const p of peds){if(p.down>0){p.down-=dt;continue}p.phase+=dt;const target=player.vehicle||player;if(dist(p,target)<120&&Math.hypot(target.vx||0,target.vy||0)>130)p.panic=2.5;p.panic=Math.max(0,p.panic-dt);if(p.panic)p.angle=Math.atan2(p.y-target.y,p.x-target.x);
   else p.angle+=Math.sin(p.phase)*.18*dt;
   const sp=(p.panic?95:p.speed);let nx=p.x+Math.cos(p.angle)*sp*dt,ny=p.y+Math.sin(p.angle)*sp*dt;
   if(collidesBuilding(nx,ny,8)||!onWorld(nx,ny)||isRoad(nx,ny)&&!isRoad(p.x,p.y)){p.angle+=Math.PI*.7}else{p.x=nx;p.y=ny}
   if(player.vehicle&&dist(p,player.vehicle)<48&&Math.hypot(player.vehicle.vx,player.vehicle.vy)>70){p.panic=3;p.angle=Math.atan2(p.y-player.vehicle.y,p.x-player.vehicle.x);player.vehicle.vx*=.98;player.vehicle.vy*=.98}
 }
}
function updatePolice(dt){
 if(player.wanted>0){if(police.length<Math.min(8,player.wanted*2)&&Math.random()<dt*.7)spawnPolice();player.wantedHeat=Math.max(0,player.wantedHeat-dt*(police.some(p=>dist(p,player)<500)?0.35:2.5));player.wanted=Math.ceil(player.wantedHeat/20)}
 else player.wantedHeat=Math.max(0,player.wantedHeat-dt*2);
 for(let i=police.length-1;i>=0;i--){const c=police[i];updateControlledCar(c,dt,true);c.flash+=dt*8;const d=dist(c,player.vehicle||player);if(d<60&&player.vehicle){player.vehicle.vx*=1-.4*dt;player.vehicle.vy*=1-.4*dt}
   if(player.wanted===0&&d>900){police.splice(i,1);const idx=cars.indexOf(c);if(idx>=0)cars.splice(idx,1)}
 }
}
function updateMissions(dt){
 const actor=player.vehicle||player;
 if(!mission){for(const s of missionSpots){if(Math.hypot(actor.x-s.x,actor.y-s.y)<60){tip('Press F to start '+s.name);if(keys.f&&!keys._f){keys._f=1;newMission(s)}}}if(!keys.f)keys._f=0;return}
 if(mission.timer){mission.timer-=dt;if(mission.timer<=0){missionBanner('Job failed','Time expired.');mission=null;return}}
 if(dist(actor,mission.target)<75){player.cash+=mission.reward;missionBanner('Job complete','+$'+mission.reward.toLocaleString());toast('Payment received');mission=null;persist();audioTone(780,.12,'triangle',.05)}
}
function tip(t){const el=$('#tip');el.textContent=t;el.style.opacity=1;tip.seen=true}
function updateTip(){if(!tip.seen)$('#tip').style.opacity=0;tip.seen=false}

function update(dt){
 globalTime+=dt;updateTip();updatePlayer(dt);for(const c of cars)if(c!==player.vehicle&&c.kind!=='police')updateTraffic(c,dt);updatePeds(dt);updatePolice(dt);updateMissions(dt);carPairCollisions();
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.95;p.vy*=.95;p.life-=dt;if(p.life<=0)particles.splice(i,1)}
 for(const c of cars){if(c.health<=0){c.health=100;c.vx*=.15;c.vy*=.15;if(c===player.vehicle){player.vehicle=null;c.occupied=false;player.x=c.x+40;player.y=c.y+40}for(let k=0;k<18;k++)addParticle(c.x,c.y,(Math.random()-.5)*170,(Math.random()-.5)*170,.7+Math.random(),2+Math.random()*3,'spark')}}
 const target=player.vehicle||player, lead=player.vehicle?clamp(Math.hypot(target.vx,target.vy)*.55,0,180):0;camera.x=lerp(camera.x,target.x+Math.cos(target.angle||0)*lead,.085);camera.y=lerp(camera.y,target.y+Math.sin(target.angle||0)*lead,.085);camera.zoom=lerp(camera.zoom,player.vehicle?.88:1,.035);shake*=Math.pow(.02,dt);updateHUD();
}
