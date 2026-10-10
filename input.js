addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(k==='e'&&!keys._e&&playing&&!paused){keys._e=1;tryEnterExit()}if(k==='p'||k==='escape'){if(playing)togglePause()}if(k==='m'&&playing&&!paused){showMap=!showMap}if(k==='f'){} });
addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys[k]=false;if(k==='e')keys._e=0});
canvas.addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY});canvas.addEventListener('contextmenu',e=>e.preventDefault());
function togglePause(){paused=!paused;$('#pause').style.display=paused?'grid':'none'}
$('#playBtn').onclick=()=>{playing=true;paused=false;$('#start').style.display='none';toast('Welcome to Neon District');audioTone(500,.08,'triangle',.04)};
$('#resumeBtn').onclick=()=>togglePause();
$('#respawnBtn').onclick=()=>{playing=true;$('#dead').style.display='none'};
$('#resetBtn').onclick=()=>{localStorage.removeItem(saveKey);location.reload()};

// Touch controls
const touchCap=('ontouchstart'in window)||navigator.maxTouchPoints>0;if(touchCap)$('#mobile').classList.add('active');
const stick=$('.stick'),knob=$('.knob');let stickId=null,origin={x:0,y:0};
stick.addEventListener('touchstart',e=>{const t=e.changedTouches[0];stickId=t.identifier;const r=stick.getBoundingClientRect();origin={x:r.left+r.width/2,y:r.top+r.height/2};e.preventDefault()},{passive:false});
stick.addEventListener('touchmove',e=>{for(const t of e.changedTouches)if(t.identifier===stickId){let dx=t.clientX-origin.x,dy=t.clientY-origin.y,d=Math.hypot(dx,dy),m=Math.min(42,d);if(d){dx=dx/d*m;dy=dy/d*m}knob.style.transform=`translate(${dx}px,${dy}px)`;keys.w=dy<-10;keys.s=dy>10;keys.a=dx<-10;keys.d=dx>10}e.preventDefault()},{passive:false});
stick.addEventListener('touchend',e=>{knob.style.transform='';keys.w=keys.s=keys.a=keys.d=false;stickId=null});
$('.m-a').addEventListener('touchstart',e=>{if(player.vehicle)keys.shift=true;e.preventDefault()},{passive:false});$('.m-a').addEventListener('touchend',()=>keys.shift=false);
$('.m-b').addEventListener('touchstart',e=>{keys[' ']=true;e.preventDefault()},{passive:false});$('.m-b').addEventListener('touchend',()=>keys[' ']=false);
$('.m-c').addEventListener('touchstart',e=>{tryEnterExit();e.preventDefault()},{passive:false});
