const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha:false });
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let W=innerWidth,H=innerHeight,DPR=Math.min(2,devicePixelRatio||1);
function resize(){W=innerWidth;H=innerHeight;DPR=Math.min(2,devicePixelRatio||1);canvas.width=W*DPR;canvas.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0)} addEventListener('resize',resize); resize();

const TAU=Math.PI*2, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,t)=>a+(b-a)*t, dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function wrapAngle(a){while(a>Math.PI)a-=TAU;while(a<-Math.PI)a+=TAU;return a}
function seeded(n){const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
function formatCash(n){return '$'+Math.max(0,Math.floor(n)).toLocaleString()}

const WORLD=7200, GRID=600, ROAD=180, HALF=WORLD/2;
const keys={}, mouse={x:W/2,y:H/2,down:false,worldX:0,worldY:0};
let playing=false, paused=false, showMap=false, now=0, last=performance.now(), shake=0, globalTime=0;

const colors={road:'#222830',roadLine:'#6b7077',sidewalk:'#6f756f',grass:'#304936',water:'#1d5366',building:'#3a404b',roof:'#454c58'};
const blocks=[];
for(let gx=-5;gx<=5;gx++) for(let gy=-5;gy<=5;gy++){
  const cx=gx*GRID,cy=gy*GRID;
  const r=seeded((gx+20)*93+(gy+20)*41);
  const gap=(GRID-ROAD)/2;
  if(r<.10){blocks.push({type:'park',x:cx-gap,y:cy-gap,w:gap*2,h:gap*2,seed:r})}
  else if(r<.15){blocks.push({type:'lot',x:cx-gap,y:cy-gap,w:gap*2,h:gap*2,seed:r})}
  else{
    const inset=28+seeded(r*999)*35;
    blocks.push({type:'building',x:cx-gap+inset,y:cy-gap+inset,w:gap*2-inset*2,h:gap*2-inset*2,seed:r,height:20+seeded(r*177)*55});
  }
}
function pointInRect(x,y,r,pad=0){return x>r.x-pad&&x<r.x+r.w+pad&&y>r.y-pad&&y<r.y+r.h+pad}
function collidesBuilding(x,y,r=12){for(const b of blocks) if(b.type==='building'&&pointInRect(x,y,b,r)) return b; return null}
function nearestRoadAxis(v){return Math.round(v/GRID)*GRID}
function isRoad(x,y){return Math.abs(x-nearestRoadAxis(x))<ROAD/2 || Math.abs(y-nearestRoadAxis(y))<ROAD/2}
function onWorld(x,y){return x>-HALF+30&&x<HALF-30&&y>-HALF+30&&y<HALF-30}

const saveKey='neonDistrictSaveV2';
const save=JSON.parse(localStorage.getItem(saveKey)||'{}');
const player={x:save.x||0,y:save.y||0,vx:0,vy:0,angle:0,r:15,health:save.health||100,armor:save.armor??45,cash:save.cash??2500,wanted:0,wantedHeat:0,vehicle:null,invuln:0};
const camera={x:player.x,y:player.y,zoom:1};
function persist(){localStorage.setItem(saveKey,JSON.stringify({x:player.x,y:player.y,health:player.health,armor:player.armor,cash:player.cash}))}
setInterval(()=>{if(playing)persist()},4000);

const carTypes=[
 {name:'Comet',color:'#e95f67',mass:1.0,acc:390,max:400,turn:2.35,drag:1.65,w:46,h:24},
 {name:'Vanta',color:'#7f8ea6',mass:1.2,acc:340,max:360,turn:2.1,drag:1.55,w:49,h:25},
 {name:'Metro',color:'#e0bd68',mass:.9,acc:410,max:380,turn:2.55,drag:1.8,w:43,h:22},
 {name:'Atlas',color:'#587b5c',mass:1.55,acc:300,max:330,turn:1.82,drag:1.45,w:53,h:28}
];
const cars=[], peds=[], police=[], particles=[], pickups=[];
let nextId=1;
function roadSpawn(i){
 const axis=i%2, lane=((i%4)<2?-1:1)*42, slot=(i*257)%6600-3300;
 if(axis===0){return {x:slot,y:nearestRoadAxis((i*433)%6600-3300)+lane,angle:lane>0?0:Math.PI,axis:'x'}}
 return {x:nearestRoadAxis((i*389)%6600-3300)+lane,y:slot,angle:lane<0?Math.PI/2:-Math.PI/2,axis:'y'};
}
function makeCar(i,kind='traffic'){
 const s=roadSpawn(i),type=carTypes[i%carTypes.length];
 return {id:nextId++,kind,x:s.x,y:s.y,vx:0,vy:0,angle:s.angle,speed:kind==='parked'?0:70+seeded(i)*80,steer:0,type,health:100,occupied:false,ai:kind==='traffic',axis:s.axis,laneTarget:s.axis==='x'?s.y:s.x,flash:0,hitCd:0};
}
for(let i=0;i<42;i++) cars.push(makeCar(i,i%5===0?'parked':'traffic'));
for(let i=0;i<48;i++){
 let a=roadSpawn(i+100), off=((i%2)?1:-1)*(ROAD/2+28);
 if(a.axis==='x')a.y+=off; else a.x+=off;
 peds.push({x:a.x,y:a.y,angle:seeded(i)*TAU,speed:22+seeded(i+1)*22,panic:0,down:0,phase:seeded(i+4)*10});
}
const missionSpots=[{x:1200,y:600,name:'Courier Run'},{x:-1200,y:-600,name:'Checkpoint Sprint'},{x:1800,y:-1800,name:'Recovery Job'}];
let mission=null;
function newMission(spot){
 const target={x:clamp(-spot.x+Math.round((seeded(globalTime)*1600)-800),-2900,2900),y:clamp(-spot.y+Math.round((seeded(globalTime+4)*1600)-800),-2900,2900)};
 mission={name:spot.name,stage:0,target,timer:spot.name==='Checkpoint Sprint'?65:0,reward:spot.name==='Checkpoint Sprint'?1800:1200};
 missionBanner(spot.name,'Reach the highlighted destination.'); toast('Job started');
}
function missionBanner(title,text){const el=$('#mission');el.querySelector('.missionTitle').textContent=title;el.querySelector('.missionText').textContent=text;el.style.opacity=1;clearTimeout(missionBanner.t);missionBanner.t=setTimeout(()=>el.style.opacity=0,4200)}
function toast(text){const d=document.createElement('div');d.className='toast glass';d.textContent=text;$('#toast').appendChild(d);setTimeout(()=>d.remove(),3000)}

function addParticle(x,y,vx,vy,life,size,type='spark'){particles.push({x,y,vx,vy,life,max:life,size,type})}
function audioTone(freq=440,dur=.08,type='sine',vol=.04){try{const ac=audioTone.ac||(audioTone.ac=new (window.AudioContext||window.webkitAudioContext)());const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g);g.connect(ac.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+dur);o.stop(ac.currentTime+dur)}catch(e){}}
function damagePlayer(d){if(player.invuln>0)return;let left=d;if(player.armor>0){const ab=Math.min(player.armor,left*.7);player.armor-=ab;left-=ab}player.health-=left;player.invuln=.18;shake=Math.max(shake,8);if(player.health<=0) wipeout();}
function wipeout(){playing=false;player.vehicle=null;$('#dead').style.display='grid';player.cash=Math.max(0,player.cash-300);player.health=100;player.armor=Math.max(player.armor,20);player.wanted=0;player.wantedHeat=0;player.x=0;player.y=0;persist();}

function spawnPolice(){
 if(police.length>=Math.min(8,player.wanted*2))return;
 const ang=Math.random()*TAU,d=700+Math.random()*250;
 let x=clamp(player.x+Math.cos(ang)*d,-3300,3300),y=clamp(player.y+Math.sin(ang)*d,-3300,3300);
 if(Math.abs(x-nearestRoadAxis(x))<Math.abs(y-nearestRoadAxis(y)))x=nearestRoadAxis(x)+42;else y=nearestRoadAxis(y)+42;
 const c=makeCar(200+nextId,'police');c.x=x;c.y=y;c.kind='police';c.ai=false;c.type={...carTypes[1],name:'Pursuit',color:'#20262e',acc:430,max:420,turn:2.5};c.health=130;police.push(c);cars.push(c);toast('Pursuit unit entering area');
}
function addWanted(v=1){player.wantedHeat=Math.min(100,player.wantedHeat+28*v);player.wanted=Math.max(player.wanted,Math.min(5,Math.ceil(player.wantedHeat/20)));}
