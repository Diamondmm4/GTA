function updateHUD(){
 $('#hpFill').style.width=clamp(player.health,0,100)+'%';$('#armorFill').style.width=clamp(player.armor,0,100)+'%';$('#cash').textContent=formatCash(player.cash);
 $$('.star').forEach((s,i)=>s.classList.toggle('on',i<player.wanted));
 if(player.vehicle){const s=Math.hypot(player.vehicle.vx,player.vehicle.vy);$('#speedo').style.display='block';$('#speedo .speed').textContent=Math.round(s*.44);$('#status').textContent=player.vehicle.type.name+' · '+Math.max(0,Math.round(player.vehicle.health))+'% integrity';}
 else{$('#speedo').style.display='none';$('#status').textContent='On foot'}
}

function worldToScreen(x,y){return {x:(x-camera.x)*camera.zoom+W/2,y:(y-camera.y)*camera.zoom+H/2}}
function drawWorld(){
 const day=(Math.sin(globalTime*.035)*.5+.5),sky=day>.22?'#1b252a':'#121824';ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 const sx=(camera.x-W/(2*camera.zoom)),sy=(camera.y-H/(2*camera.zoom)),ex=(camera.x+W/(2*camera.zoom)),ey=(camera.y+H/(2*camera.zoom));
 ctx.save();ctx.translate(W/2,H/2);ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);
 ctx.fillStyle='#314b37';ctx.fillRect(-HALF,-HALF,WORLD,WORLD);
 ctx.fillStyle=colors.road;for(let i=-6;i<=6;i++){ctx.fillRect(i*GRID-ROAD/2,-HALF,ROAD,WORLD);ctx.fillRect(-HALF,i*GRID-ROAD/2,WORLD,ROAD)}
 ctx.strokeStyle='rgba(210,215,180,.32)';ctx.lineWidth=3;ctx.setLineDash([24,28]);for(let i=-6;i<=6;i++){ctx.beginPath();ctx.moveTo(i*GRID,-HALF);ctx.lineTo(i*GRID,HALF);ctx.stroke();ctx.beginPath();ctx.moveTo(-HALF,i*GRID);ctx.lineTo(HALF,i*GRID);ctx.stroke()}ctx.setLineDash([]);
 for(const b of blocks){if(b.x+b.w<sx-100||b.x>ex+100||b.y+b.h<sy-100||b.y>ey+100)continue;if(b.type==='building')drawBuilding(b);else if(b.type==='park')drawPark(b);else drawLot(b)}
 for(const s of missionSpots) drawMarker(s.x,s.y,'JOB',mission?0:.85);
 if(mission)drawMarker(mission.target.x,mission.target.y,mission.timer?Math.ceil(mission.timer)+'s':'GO',1);
 for(const p of peds) if(p.x>sx-60&&p.x<ex+60&&p.y>sy-60&&p.y<ey+60)drawPed(p);
 for(const c of cars) if(c.x>sx-100&&c.x<ex+100&&c.y>sy-100&&c.y<ey+100)drawCar(c);
 if(!player.vehicle)drawPlayer();
 for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.type==='spark'?'#ffd18a':'#b8b8b8';ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size)}ctx.globalAlpha=1;
 ctx.restore();
 const night=clamp(1-day*.9,.08,.68);ctx.fillStyle=`rgba(10,16,34,${night*.42})`;ctx.fillRect(0,0,W,H);
 if(showMap)drawMapOverlay();
}
function drawBuilding(b){
 ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(b.x+12,b.y+15,b.w,b.h);ctx.fillStyle=colors.roof;ctx.fillRect(b.x,b.y,b.w,b.h);ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=2;ctx.strokeRect(b.x,b.y,b.w,b.h);
 const inset=12;ctx.fillStyle='rgba(118,192,255,.07)';for(let y=b.y+inset;y<b.y+b.h-inset;y+=34)for(let x=b.x+inset;x<b.x+b.w-inset;x+=34)if(seeded(x*.1+y*.03)>.48)ctx.fillRect(x,y,12,6);
 ctx.fillStyle='rgba(255,255,255,.035)';ctx.fillRect(b.x+8,b.y+8,b.w-16,8);
}
function drawPark(b){ctx.fillStyle='#3d6343';ctx.fillRect(b.x,b.y,b.w,b.h);for(let i=0;i<9;i++){const x=b.x+24+seeded(b.seed*1000+i)*Math.max(20,b.w-48),y=b.y+24+seeded(b.seed*2000+i)*Math.max(20,b.h-48);ctx.fillStyle='rgba(0,0,0,.16)';ctx.beginPath();ctx.arc(x+4,y+6,12,0,TAU);ctx.fill();ctx.fillStyle='#24492e';ctx.beginPath();ctx.arc(x,y,11,0,TAU);ctx.fill()}}
function drawLot(b){ctx.fillStyle='#55595a';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=2;for(let x=b.x+24;x<b.x+b.w-15;x+=42){ctx.beginPath();ctx.moveTo(x,b.y+18);ctx.lineTo(x,b.y+62);ctx.stroke()}}
function drawMarker(x,y,label,alpha=1){const pulse=1+Math.sin(globalTime*4)*.08;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.strokeStyle='#78f0ff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,30*pulse,0,TAU);ctx.stroke();ctx.fillStyle='rgba(80,220,255,.13)';ctx.beginPath();ctx.arc(0,0,23*pulse,0,TAU);ctx.fill();ctx.fillStyle='#d9fbff';ctx.font='700 11px system-ui';ctx.textAlign='center';ctx.fillText(label,0,4);ctx.restore()}
function drawPed(p){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=p.down>0?.55:1;ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(4,6,8,5,0,0,TAU);ctx.fill();ctx.fillStyle=['#e8b89a','#c88b6d','#98654e'][p.phase%3|0];ctx.beginPath();ctx.arc(0,-4,4,0,TAU);ctx.fill();ctx.fillStyle=['#5f81a8','#8b637e','#617a5f','#9b7554'][p.phase%4|0];ctx.fillRect(-4,0,8,12);ctx.restore()}
function drawCar(c){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.angle);const w=c.type.w,h=c.type.h;ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(-w/2+4,-h/2+5,w,h);ctx.fillStyle=c.kind==='police'?(Math.sin(c.flash)>0?'#253146':'#1d2631'):c.type.color;ctx.beginPath();roundRect(-w/2,-h/2,w,h,6);ctx.fill();ctx.fillStyle='#171d25';ctx.fillRect(-w*.1,-h*.37,w*.34,h*.74);ctx.fillStyle='rgba(175,226,255,.52)';ctx.fillRect(-w*.05,-h*.3,w*.2,h*.6);ctx.fillStyle='#0c1118';ctx.fillRect(-w*.36,-h*.58,w*.18,3);ctx.fillRect(w*.18,-h*.58,w*.18,3);ctx.fillRect(-w*.36,h*.58-3,w*.18,3);ctx.fillRect(w*.18,h*.58-3,w*.18,3);
 if(c.kind==='police'){ctx.fillStyle=Math.sin(c.flash)>0?'#65a7ff':'#ff6670';ctx.fillRect(-4,-h*.55,8,3)}if(c.flash>0){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(-w/2,-h/2,w,h);c.flash=Math.max(0,c.flash-.02)}ctx.restore()}
function roundRect(x,y,w,h,r){ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r)}
function drawPlayer(){ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.angle);ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(3,5,11,7,0,0,TAU);ctx.fill();ctx.fillStyle=player.invuln>0&&Math.floor(globalTime*20)%2?'#fff':'#63d7e8';ctx.beginPath();ctx.arc(0,0,10,0,TAU);ctx.fill();ctx.fillStyle='#1b2733';ctx.fillRect(5,-3,13,6);ctx.restore()}
function drawMapOverlay(){ctx.fillStyle='rgba(3,6,10,.76)';ctx.fillRect(0,0,W,H);const size=Math.min(W,H)*.78,ox=W/2-size/2,oy=H/2-size/2,sc=size/WORLD;ctx.save();ctx.translate(W/2,H/2);ctx.scale(sc,sc);ctx.translate(-0,-0);ctx.fillStyle='#294031';ctx.fillRect(-HALF,-HALF,WORLD,WORLD);ctx.fillStyle='#2b3038';for(let i=-6;i<=6;i++){ctx.fillRect(i*GRID-ROAD/2,-HALF,ROAD,WORLD);ctx.fillRect(-HALF,i*GRID-ROAD/2,WORLD,ROAD)}for(const b of blocks)if(b.type==='building'){ctx.fillStyle='#5a626d';ctx.fillRect(b.x,b.y,b.w,b.h)}ctx.fillStyle='#7df1ff';ctx.beginPath();ctx.arc(player.x,player.y,28,0,TAU);ctx.fill();if(mission){ctx.strokeStyle='#7df1ff';ctx.lineWidth=12;ctx.beginPath();ctx.arc(mission.target.x,mission.target.y,70,0,TAU);ctx.stroke()}ctx.restore();ctx.strokeStyle='rgba(255,255,255,.24)';ctx.lineWidth=2;ctx.strokeRect(ox,oy,size,size);ctx.fillStyle='#fff';ctx.font='800 16px system-ui';ctx.textAlign='center';ctx.fillText('CITY MAP · M TO CLOSE',W/2,oy-16)}

function loop(t){requestAnimationFrame(loop);let dt=Math.min(.033,(t-last)/1000);last=t;now=t;if(playing&&!paused&&!showMap)update(dt);drawWorld();updateMouseWorld();}
function updateMouseWorld(){mouse.worldX=(mouse.x-W/2)/camera.zoom+camera.x;mouse.worldY=(mouse.y-H/2)/camera.zoom+camera.y;$('#crosshair').style.display='none'}
requestAnimationFrame(loop);
