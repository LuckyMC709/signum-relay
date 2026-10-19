import * as THREE from './vendor/three.module.js';
import { RelayRun, LANES, MESSAGES } from './core.js';

const $ = id => document.getElementById(id);
const canvas = $('world');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); }
catch (error) { $('loading').innerHTML = '<div class="modal"><h2>Necesitamos un poco más de señal.</h2><p>Este navegador no pudo activar los gráficos 3D. Probá en una versión actual de Chrome, Safari, Edge o Firefox con aceleración gráfica habilitada.</p></div>'; throw error; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#242e47');
scene.fog = new THREE.Fog('#2a3850', 42, 170);
const camera = new THREE.PerspectiveCamera(52, 1, .1, 380);
scene.add(new THREE.HemisphereLight('#c2eff0', '#313148', 2.7));
const sunLight = new THREE.DirectionalLight('#ffc391', 3.3); sunLight.position.set(-15, 28, -35); scene.add(sunLight);
const rim = new THREE.DirectionalLight('#79f4c5', 1.6); rim.position.set(8, 6, 12); scene.add(rim);
const geometries = { box: new THREE.BoxGeometry(1,1,1), sphere: new THREE.SphereGeometry(1,12,8), cylinder: new THREE.CylinderGeometry(1,1,1,10), torus: new THREE.TorusGeometry(1,.035,5,32), diamond: new THREE.OctahedronGeometry(1) };
const mat = (color, emissive = null, opacity = 1) => new THREE.MeshStandardMaterial({ color, roughness: .75, metalness: .08, ...(emissive ? {emissive, emissiveIntensity: .7} : {}), ...(opacity < 1 ? {transparent:true,opacity,depthWrite:false} : {}) });
const mats = { road:mat('#344350'), lane:mat('#8eacaf','#334d5a'), rail:mat('#518188'), railLight:mat('#8ef3c2','#7bd8a6'), orange:mat('#ff9962','#a74b26'), dark:mat('#14273a'), navy:mat('#243a53'), pale:mat('#e8eece'), mint:mat('#8bd5bc'), battery:mat('#bcf469','#a5e565'), packet:mat('#75eed6','#4bc3ad'), red:mat('#f18375','#b63f39'), window:mat('#e6c98c','#ad894c'), eye:mat('#9ff6d9','#72d9cd'), white:mat('#f3f2dc'), shadow:new THREE.MeshBasicMaterial({color:'#07131f',transparent:true,opacity:.45,depthWrite:false}) };
function mesh(geo, material, scale, pos, parent = scene) { const object = new THREE.Mesh(geometries[geo], material); object.scale.set(...scale); object.position.set(...pos); parent.add(object); return object; }
function box(material, scale, pos, parent=scene) { return mesh('box', material, scale, pos, parent); }
function labelTexture(text, color = '#c0f86c', dark=false, size=32) {
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');
  if(dark){ctx.fillStyle='#122735';ctx.beginPath();ctx.roundRect(0,0,512,128,18);ctx.fill();}
  ctx.font=`900 ${size}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,256,66);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function label(text, pos, width, color='#dffbe4', parent=scene) { const texture=labelTexture(text,color,true);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sprite.position.set(...pos);sprite.scale.set(width,width/4,1);sprite.userData.texture=texture;parent.add(sprite);return sprite; }
// Original procedural art: the city, courier and phones need no remote assets.
const sky = new THREE.Mesh(new THREE.PlaneGeometry(650,300), new THREE.ShaderMaterial({depthWrite:false,uniforms:{},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv; void main(){vec3 low=vec3(.56,.48,.46); vec3 high=vec3(.10,.19,.29); float t=smoothstep(0.,.9,vUv.y); gl_FragColor=vec4(mix(low,high,t),1.);}' }));
sky.position.set(0,77,-255);scene.add(sky);
const sun=mesh('sphere',new THREE.MeshBasicMaterial({color:'#f3b27c'}),[19,19,1],[-45,22,-240]);
box(mat('#263c4b'),[700,1,700],[0,-1,-80]);
box(mats.road,[10.6,.25,300],[0,-.2,-132]);
for (const x of [-5.4,5.4]) {box(mats.dark,[.5,.9,290],[x,.18,-130]);box(mats.railLight,[.08,.08,290],[x,.68,-130]);}
for(const x of [-1.5,1.5])box(mats.lane,[.055,.015,285],[x,-.055,-130]);
const stripeMeshes=[];
for(let i=0;i<35;i++)for(const x of [-4.7,4.7]){const b=box(mats.orange,[.12,.025,2.4],[x,-.05,-i*8]);stripeMeshes.push({mesh:b,z:-i*8});}
const scenery=[];
const cityColors=['#354e5a','#405260','#2c4958','#456578','#324857'];
for(let i=0;i<30;i++){
 const side=i%2===0?-1:1, index=Math.floor(i/2), group=new THREE.Group(), width=3.8+(i*7%5), height=4+(i*11%16), depth=5+(i*3%4);
 const material=mat(cityColors[i%cityColors.length]);
 box(material,[width,height,depth],[0,height/2,0],group);box(mats.dark,[width+.15,.25,depth+.15],[0,height+.1,0],group);
 for(let row=0;row<Math.min(4,Math.floor(height/2));row++){const color=(i+row)%3===0?mats.window:mats.mint;box(color,[width*.62,.12,.04],[0,2+row*2,depth/2+.03],group);}
 if(i%4===0){box(mats.orange,[.22,height*.7,.12],[side*width*.32,height*.56,depth/2+.06],group);}
 group.position.set(side*(9+(i*13%10)),0,-index*18);scenery.push({group,z:-index*18});scene.add(group);
}
// Signal arches and sidewalk equipment add a readable sense of speed.
const lampGroups=[];
for(let i=0;i<10;i++)for(const side of [-1,1]){
 const group=new THREE.Group();box(mats.dark,[.16,4,.16],[side*6.4,2,0],group);box(mats.railLight,[1,.09,.24],[side*6,4,0],group);
 if(i%3===0)box(mats.navy,[1.1,.9,1.1],[side*6.6,.45,1.8],group);
 group.position.z=-i*25;scene.add(group);lampGroups.push({group,z:-i*25});
}
// A small messenger robot, shown from behind. Its backpack carries the packet.
const player=new THREE.Group();scene.add(player);
const body=new THREE.Group();player.add(body);
box(mats.pale,[.88,.91,.57],[0,1.28,0],body);
box(mats.dark,[.62,.36,.42],[0,.69,0],body);
const head=box(mats.pale,[.89,.66,.64],[0,2.08,-.02],body);box(mats.dark,[.93,.29,.05],[0,2.1,-.35],body);
box(mats.eye,[.19,.07,.04],[-.22,2.12,-.39],body);box(mats.eye,[.19,.07,.04],[.22,2.12,-.39],body);
box(mats.orange,[.8,.13,.65],[0,1.75,.01],body);box(mats.orange,[.18,.49,.06],[.31,1.52,.36],body);
box(mats.navy,[.65,.67,.25],[0,1.35,.41],body);
const envelope=box(mats.battery,[.45,.31,.025],[0,1.39,.55],body);
const v1=box(mats.dark,[.27,.027,.01],[-.103,1.42,.57],body);v1.rotation.z=-.55;const v2=box(mats.dark,[.27,.027,.01],[.103,1.42,.57],body);v2.rotation.z=.55;
const arms=[],legs=[];
for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.62,1.62,0);box(mats.mint,[.24,.57,.27],[0,-.25,0],arm);box(mats.dark,[.28,.22,.29],[0,-.57,0],arm);body.add(arm);arms.push(arm);const leg=new THREE.Group();leg.position.set(side*.24,.77,0);box(mats.navy,[.28,.55,.32],[0,-.27,0],leg);box(mats.dark,[.35,.2,.55],[0,-.59,-.1],leg);body.add(leg);legs.push(leg);}
box(mats.dark,[.06,.4,.06],[.24,2.59,0],body);mesh('sphere',mats.battery,[.1,.1,.1],[.24,2.8,0],body);
const shadow=mesh('cylinder',mats.shadow,[.72,.015,.46],[0,-.02,.06]);
const playerRing=mesh('torus',mats.battery,[.76,.76,.76],[0,.025,0]);playerRing.rotation.x=Math.PI/2;
const particles=[];
function burst(x,y,z,color,count=14){for(let i=0;i<count;i++){const m=mesh('box',mats[color]||mats.packet,[.08,.08,.08],[x,y,z]);particles.push({mesh:m,life: .6+Math.random()*.5,vx:(Math.random()-.5)*7,vy:2+Math.random()*5,vz:(Math.random()-.5)*5});}}
const entities=new Map();
function makeEntity(e){
 const group=new THREE.Group();group.userData.type=e.type;
 if(e.type==='battery') {box(mats.battery,[.6,.9,.43],[0,1.15,0],group);box(mats.white,[.25,.12,.3],[0,1.67,0],group);box(mats.dark,[.15,.43,.015],[0,1.2,.226],group);box(mats.dark,[.36,.14,.018],[0,1.2,.23],group);}
 else if(e.type==='data'){mesh('diamond',mats.packet,[.22,.3,.22],[0,1.15,0],group);}
 else if(e.type==='barrier'){
  box(mats.orange,[2.35,1,.46],[0,.65,0],group);for(const x of [-.75,0,.75]){const b=box(mats.dark,[.23,.96,.02],[x,.65,.25],group);b.rotation.z=-.45;}for(const x of [-.86,.86])box(mats.navy,[.17,.4,.7],[x,.2,0],group);
 }
 else if(e.type==='beam'){
  for(const x of [-1.2,1.2])box(mats.navy,[.2,3.2,.4],[x,1.6,0],group);box(mats.orange,[2.8,.85,.65],[0,2.2,0],group);box(mats.dark,[2.3,.05,.02],[0,1.88,.34],group);label('↓ DESLIZÁ',[0,3.24,0],2.6,'#ffd3ae',group);
 }
 else if(e.type==='block'){
  box(mats.navy,[2.2,3,.95],[0,1.5,0],group);box(mats.orange,[1.8,.15,.025],[0,2.25,.49],group);box(mats.orange,[1.8,.15,.025],[0,.75,.49],group);const slash=box(mats.orange,[.16,1.6,.025],[0,1.5,.5],group);slash.rotation.z=-.65;
 }
 else if(e.type==='deadzone'){
  box(mats.red,[2.7,.04,3],[0,.01,0],group);const ring=mesh('torus',mats.red,[.8,.8,.8],[0,.07,0],group);ring.rotation.x=Math.PI/2;label('SIN SEÑAL',[0,1.6,0],2.5,'#ffb3a0',group);
 }
 else if(e.type==='relay'){
  e.routes.forEach((route,i)=>{
   const phone=new THREE.Group();phone.position.x=LANES[i];const blocked=route.kind==='blocked',color=blocked?mats.red:route.kind==='eco'?mats.battery:mats.packet;
   // The phone floats above its lane, leaving the running path visible.
   box(mats.dark,[1.25,2.15,.22],[0,3.55,0],phone);box(color,[1.04,1.77,.025],[0,3.56,.13],phone);box(mats.dark,[.32,.06,.03],[0,4.46,.13],phone);
   const symbol=label(blocked?'×':route.kind==='eco'?'III':'II',[0,3.65,.2],1.3,blocked?'#522a31':'#172f32',phone);symbol.material.depthTest=true;
   box(color,[2.7,.05,2.2],[0,.04,0],phone);for(const x of [-1.3,1.3]){box(color,[.06,4,.06],[x,2,0],phone);}
   label(blocked?'FUERA DE ALCANCE':route.kind==='eco'?'BUEN ENLACE':'SEÑAL DÉBIL',[0,5.18,0],3,blocked?'#ffc5b9':'#d6ffc1',phone);group.add(phone);
  });
 }
 if(e.lane!==undefined)group.position.x=LANES[e.lane];scene.add(group);return group;
}
function removeEntity(object){object.traverse(child=>{if(child.userData.texture){child.userData.texture.dispose();child.material.dispose();}});scene.remove(object);}
function clearEntities(){for(const object of entities.values())removeEntity(object);entities.clear();}

class AudioEngine{
 constructor(){this.enabled=true;this.ctx=null;this.beat=0;this.next=0;}
 init(){try{if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.14;this.master.connect(this.ctx.destination);}if(this.ctx.state==='suspended')this.ctx.resume();}catch{this.enabled=false;}}
 tone(freq,duration=.09,type='sine',vol=.35,delay=0){if(!this.ctx||!this.enabled)return;const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.007);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.02);}
 cue(name){if(name==='battery'){this.tone(659,.08,'sine');this.tone(988,.12,'sine',.3,.065);}else if(name==='data')this.tone(1320,.045,'sine',.12);else if(name==='relay'){[440,554,659].forEach((f,i)=>this.tone(f,.18,'triangle',.3,i*.075));}else if(name==='delivery'){[523,659,784,1047].forEach((f,i)=>this.tone(f,.28,'triangle',.4,i*.1));}else if(name==='hit'){this.tone(78,.23,'sawtooth',.24);}else if(name==='jump')this.tone(350,.09,'sine',.13);else if(name==='over'){[330,277,220].forEach((f,i)=>this.tone(f,.3,'triangle',.3,i*.15));}}
 update(running){if(!running||!this.ctx||!this.enabled)return;const t=this.ctx.currentTime;if(t>this.next){this.next=t+.27;const notes=[110,0,165,0,130.81,0,164.81,196];if(this.beat%2===0)this.tone(53,.075,'sine',.5);if(notes[this.beat%8])this.tone(notes[this.beat%8],.16,'triangle',.12);this.beat++;}}
}
const audio=new AudioEngine();
let state='home', model=new RelayRun(), demo=new RelayRun(91), previous=performance.now(), clock=0, countdown=0, idle=0, hitFlash=0, shake=0, lastToast=0, currentRouteId='', saved=false, hudTimer=0;
let records=[];try{const raw=JSON.parse(localStorage.getItem('signum-relay-records-v1')||'[]');if(Array.isArray(raw))records=raw.filter(r=>typeof r.name==='string'&&Number.isFinite(r.distance)&&Number.isFinite(r.points)&&Number.isFinite(r.deliveries)).slice(0,5);}catch{}
function format(n){return Math.floor(n).toLocaleString('es-AR');}
function updateHomeRecord(){ $('homeRecord').textContent=records.length?`${records[0].name}  ·  ${format(records[0].distance)} m  ·  ${records[0].deliveries} entregas`:'Sé el primero en llevar la señal'; }
updateHomeRecord();
function showToast(main,detail='',color=''){ $('toast').replaceChildren();const text=document.createElement('span');text.textContent=main;$('toast').append(text);if(detail){const sub=document.createElement('small');sub.textContent=detail;$('toast').append(sub);}$('toast').style.color=color||'';$('toast').classList.add('show');lastToast=clock;}
function toggle(id,visible){$(id).classList.toggle('hidden',!visible);}
function hideScreens(){['home','help','pause','result','about'].forEach(id=>toggle(id,false));}
function resetWorld(){clearEntities();for(const p of particles)scene.remove(p.mesh);particles.length=0;currentRouteId='';}
function start(){audio.init();hideScreens();model=new RelayRun();state='countdown';countdown=1.65;idle=0;saved=false;hitFlash=0;resetWorld();document.body.classList.add('playing');toggle('hud',true);toggle('pauseBtn',true);toggle('touchControls',true);toggle('desktopHint',true);toggle('countdown',true);$('countdown').textContent='3';$('relayNotice').classList.add('hidden');$('toast').classList.remove('show');updateHUD();}
function goHome(){state='home';idle=0;hideScreens();toggle('home',true);toggle('hud',false);toggle('pauseBtn',false);toggle('touchControls',false);toggle('desktopHint',false);toggle('relayNotice',false);toggle('countdown',false);document.body.classList.remove('playing');$('toast').classList.remove('show');demo=new RelayRun(Date.now());resetWorld();updateHomeRecord();}
function pause(){if(state!=='playing')return;state='paused';toggle('pause',true);toggle('touchControls',false);toggle('relayNotice',false);$('toast').classList.remove('show');$('resumeBtn').focus();}
function resume(){if(state!=='paused')return;state='playing';toggle('pause',false);toggle('touchControls',true);idle=0;}
function renderRanking(){const container=$('ranking');container.replaceChildren();if(!records.length)return;const heading=document.createElement('div');heading.className='ranking-title';heading.textContent='RANKING DE ESTA PANTALLA';container.append(heading);records.forEach((r,i)=>{const row=document.createElement('div');row.className='ranking-row';const place=document.createElement('span');place.textContent=String(i+1).padStart(2,'0');const name=document.createElement('strong');name.textContent=r.name;const distance=document.createElement('span');distance.textContent=format(r.distance)+' m';const deliveries=document.createElement('small');deliveries.textContent=r.deliveries+' entregas';distance.append(deliveries);row.append(place,name,distance);container.append(row);});}
function endRun(){if(state==='result')return;state='result';idle=0;updateHUD();toggle('result',true);toggle('touchControls',false);toggle('relayNotice',false);toggle('desktopHint',false);toggle('pauseBtn',false);$('resultDistance').textContent=format(model.distance);$('resultDeliveries').textContent=model.deliveries;$('resultRelays').textContent=model.relays;$('resultPoints').textContent=format(model.points);const newRecord=!records.length||model.distance>records[0].distance;$('resultEyebrow').textContent=newRecord?'¡NUEVO RÉCORD DE DISTANCIA!':'LA BATERÍA SE AGOTÓ';$('resultTitle').textContent=model.deliveries?'Tus mensajes llegaron.':'Dejaste tu señal.';$('resultLesson').textContent=model.deliveries?'Cada teléfono acercó el mensaje a alguien. ¿Quién sigue?':'En el próximo intento, buscá teléfonos verdes y juntá baterías.';$('initials').value='';$('saveRecordBtn').disabled=false;$('saveRecordBtn').textContent='Guardar marca';$('recordStatus').textContent='El ranking se guarda solo en este dispositivo.';renderRanking();audio.cue('over');$('toast').classList.remove('show');$('replayBtn').focus();}
function saveRecord(){if(saved)return;const name=($('initials').value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ0-9]/g,'').slice(0,3)||'VOS');const entry={name,distance:Math.floor(model.distance),points:model.points,deliveries:model.deliveries};records.push(entry);records.sort((a,b)=>b.distance-a.distance||b.points-a.points);records=records.slice(0,5);let persistent=true;try{localStorage.setItem('signum-relay-records-v1',JSON.stringify(records));}catch{persistent=false;}saved=true;$('saveRecordBtn').disabled=true;$('saveRecordBtn').textContent='Marca guardada ✓';$('recordStatus').textContent=persistent?'¡Listo! Que siga la próxima persona.':'Guardado en esta sesión. El navegador no permite almacenamiento persistente.';renderRanking();updateHomeRecord();}
function action(action){idle=0;if(state==='home'&&(action==='start'||action==='jump')){start();return;}if(state!=='playing')return;if(action==='left')model.move(-1);else if(action==='right')model.move(1);else if(action==='jump')model.jump();else if(action==='slide')model.duck();}
$('startBtn').addEventListener('click',start);$('helpPlayBtn').addEventListener('click',start);$('replayBtn').addEventListener('click',start);$('restartPauseBtn').addEventListener('click',start);$('homePauseBtn').addEventListener('click',goHome);$('resultHomeBtn').addEventListener('click',goHome);$('resumeBtn').addEventListener('click',resume);$('pauseBtn').addEventListener('click',pause);$('helpBtn').addEventListener('click',()=>{toggle('help',true);$('helpPlayBtn').focus();});$('aboutBtn').addEventListener('click',()=>{toggle('about',true);});document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',()=>toggle(el.dataset.close,false)));$('saveRecordBtn').addEventListener('click',saveRecord);$('initials').addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ0-9]/g,'').slice(0,3);});$('initials').addEventListener('keydown',e=>{if(e.key==='Enter')saveRecord();});
document.querySelector('.wordmark').addEventListener('click',e=>{e.preventDefault();if(state==='playing')pause();else goHome();});
$('soundBtn').addEventListener('click',()=>{audio.init();audio.enabled=!audio.enabled;$('soundBtn').classList.toggle('muted',!audio.enabled);$('soundBtn').setAttribute('aria-label',audio.enabled?'Silenciar sonido':'Activar sonido');});
$('fullscreenBtn').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else showToast('Usá el modo de pantalla completa del navegador');}catch{showToast('Pantalla completa no disponible en este navegador');}});
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement)return;idle=0;const map={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'jump',w:'jump',W:'jump',' ':'jump',ArrowDown:'slide',s:'slide',S:'slide'};if(map[e.key]){e.preventDefault();if(!e.repeat)action(map[e.key]);}if(e.key==='p'||e.key==='P'||e.key==='Escape'){e.preventDefault();if(state==='playing')pause();else if(state==='paused')resume();else{toggle('help',false);toggle('about',false);}}if(e.key==='Enter'&&(state==='home'||state==='result')&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();start();}});
document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('pointerdown',e=>{e.preventDefault();action(btn.dataset.action);}));
let touchStart=null;
canvas.addEventListener('pointerdown',e=>{touchStart={x:e.clientX,y:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!touchStart||touchStart.id!==e.pointerId)return;const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;if(Math.max(Math.abs(dx),Math.abs(dy))<25)return;action(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy<0?'jump':'slide');touchStart=null;});
canvas.addEventListener('pointerup',()=>{touchStart=null;});canvas.addEventListener('pointercancel',()=>{touchStart=null;});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('blur',()=>{if(state==='playing')pause();});

function updateHUD(){const energy=Math.max(0,Math.ceil(model.battery));$('batteryValue').textContent=energy+'%';$('batteryFill').style.width=energy+'%';$('batteryFill').style.background=energy<25?'#ff9175':energy<50?'#ffd07a':'#c0f86c';$('batteryHint').textContent=model.waiting?'Buscá otro teléfono':energy<25?'¡Necesitás una batería!':'Mantené viva la señal';$('distanceValue').textContent=format(model.distance);$('deliveriesValue').textContent=String(model.deliveries).padStart(2,'0');$('scoreValue').textContent=format(model.points)+' PTS';$('missionText').textContent=MESSAGES[model.deliveries%MESSAGES.length];$('relayDots').querySelectorAll('i').forEach((el,i)=>el.classList.toggle('active',i<model.relays%3));
 const gate=model.nextGate, upcoming=state==='playing'&&gate&&gate.d-model.distance<100;toggle('relayNotice',upcoming);
 if(upcoming){$('relayTitle').textContent=model.waiting?'SIN ENLACE · CAMBIÁ DE CARRIL':'RELEVO '+(model.relays%3+1)+'/3 · ELEGÍ UN TELÉFONO';$('relayDistance').textContent=Math.max(0,Math.round(gate.d-model.distance))+' m';if(currentRouteId!==gate.id){currentRouteId=gate.id;$('routeOptions').replaceChildren();gate.routes.forEach((route,i)=>{const el=document.createElement('div');el.className='route-option'+(route.kind==='blocked'?' blocked':'');el.innerHTML=route.kind==='blocked'?'<span>×</span>':'<span class="route-bars"><i></i><i></i><i></i></span>';const text=document.createElement('span');text.textContent=route.label;el.append(text);$('routeOptions').append(el);});}$('routeOptions').querySelectorAll('.route-option').forEach((el,i)=>el.classList.toggle('selected',i===model.lane));}
}
function handleFeedback(){for(const e of model.drainFeedback()){
 if(e.type==='battery'){audio.cue('battery');burst(model.x,1.3,0,'battery',10);if(model.combo%5===0)showToast('¡SEÑAL IMPARABLE!','Racha de '+model.combo+' acciones');}
 else if(e.type==='data')audio.cue('data');
 else if(e.type==='hit'){audio.cue('hit');hitFlash=.75;shake=.5;burst(model.x,1.1,0,'orange',18);showToast(e.obstacle==='deadzone'?'ZONA SIN SEÑAL':'¡CUIDADO CON EL OBSTÁCULO!','−'+(e.obstacle==='deadzone'?'14':'22')+'% de batería','#ffd0b3');if(navigator.vibrate)navigator.vibrate(45);}
 else if(e.type==='no-signal')showToast('EL MENSAJE ESPERA','Cambiá de carril para encontrar un enlace','#ffb7a0');
 else if(e.type==='relay'){audio.cue('relay');burst(LANES[e.lane],2,0,'packet',32);showToast('¡RELEVO CONECTADO!',e.route==='eco'?'Buen enlace · menor consumo de batería':'Señal débil · más velocidad y más consumo');}
 else if(e.type==='delivery'){audio.cue('delivery');burst(0,4,-3,'battery',60);showToast('¡MENSAJE ENTREGADO!','Entrega '+e.count+' · +1.000 puntos · otro mensaje te necesita');}
 else if(e.type==='jump')audio.cue('jump');
 else if(e.type==='over')endRun();
}}
function autopilot(m){const gate=m.nextGate;if(gate&&gate.d-m.distance<62){const target=gate.routes.findIndex(r=>r.kind==='eco');if(target!==m.lane)m.move(Math.sign(target-m.lane));}
 else {const next=m.events.filter(e=>!e.done&&e.type!=='relay'&&e.d-m.distance>2&&e.d-m.distance<18&&e.lane===m.lane).sort((a,b)=>a.d-b.d)[0];if(next){if(next.type==='barrier')m.jump();else if(next.type==='beam')m.duck();else if(next.type==='block'||next.type==='deadzone')m.move(m.lane===2?-1:1);}else if(Math.floor(m.distance)%80<2){const battery=m.events.find(e=>e.type==='battery'&&!e.done&&e.d-m.distance>4&&e.d-m.distance<35);if(battery)m.move(Math.sign(battery.lane-m.lane));}}
 m.battery=Math.max(65,m.battery);
}
function animateWorld(m,dt){
 const d=m.distance, isHome=state==='home', active=state==='playing'||isHome;
 stripeMeshes.forEach(e=>{e.mesh.position.z=e.z+(d%280);if(e.mesh.position.z>15)e.mesh.position.z-=280;});
 scenery.forEach(e=>{e.group.position.z=e.z+(d%270);if(e.group.position.z>24)e.group.position.z-=270;});
 lampGroups.forEach(e=>{e.group.position.z=e.z+(d%250);if(e.group.position.z>18)e.group.position.z-=250;});
 const alive=new Set();
 for(const e of m.events){const distance=e.d-d;if(e.done||distance>180||distance< -6)continue;alive.add(e.id);let entity=entities.get(e.id);if(!entity){entity=makeEntity(e);entities.set(e.id,entity);}entity.position.z=-distance;const pickup=e.type==='battery'||e.type==='data';if(pickup){entity.rotation.y=clock*(e.type==='data'?2:1.2);entity.position.y=Math.sin(clock*3+e.d)*.12;}}
 for(const [id,object] of entities)if(!alive.has(id)){removeEntity(object);entities.delete(id);}
 player.position.x=m.x;player.position.y=m.y;player.rotation.z=(LANES[m.lane]-m.x)*-.08;
 const slideScale=m.slide>0?.43:1;body.scale.y+= (slideScale-body.scale.y)*(1-Math.exp(-20*dt));body.rotation.x=m.slide>0?-.45:0;
 const stride=active?Math.sin(clock*(m.waiting?3:15)):0;legs[0].rotation.x=stride*.65;legs[1].rotation.x=-stride*.65;arms[0].rotation.x=-stride*.5;arms[1].rotation.x=stride*.5;body.position.y=(active&&m.y===0&&m.slide<=0)?Math.abs(stride)*.065:0;
 player.visible=m.invincible<=0||Math.floor(clock*14)%2===0;shadow.position.x=m.x;shadow.scale.set(.72*(1-m.y*.13),.015,.46*(1-m.y*.13));playerRing.position.x=m.x;playerRing.material=mats.battery;playerRing.visible=m.slide<=0;playerRing.scale.setScalar(.73+Math.sin(clock*4)*.025);
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){scene.remove(p.mesh);particles.splice(i,1);continue;}p.mesh.position.x+=p.vx*dt;p.mesh.position.y+=p.vy*dt;p.mesh.position.z+=p.vz*dt;p.vy-=12*dt;p.mesh.rotation.x+=dt*3;p.mesh.scale.setScalar(Math.min(.12,p.life*.15));}
 const mobile=window.innerWidth<800, baseY=mobile?6.3:5.7, baseZ=mobile?12.9:11.7;
 camera.position.set(m.x*.14+(isHome?1.5:0),baseY,baseZ);
 if(shake>0){camera.position.x+=(Math.random()-.5)*shake*.3;camera.position.y+=(Math.random()-.5)*shake*.18;shake=Math.max(0,shake-dt);}
 camera.lookAt(m.x*.17,.9,-15);
 camera.fov=(mobile?67:53)+(active?Math.min(7,(m.speed-17)*.4):0);
 if(isHome&&!mobile)camera.setViewOffset(window.innerWidth,window.innerHeight,-window.innerWidth*.2,0,window.innerWidth,window.innerHeight);else camera.clearViewOffset();camera.updateProjectionMatrix();
 hitFlash=Math.max(0,hitFlash-dt*2);$('impact').style.opacity=hitFlash;
}
function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);resize();
function frame(now){const dt=Math.min(.05,(now-previous)/1000);previous=now;clock+=dt;idle+=dt;
 if(state==='home'){autopilot(demo);demo.update(dt);demo.drainFeedback();if(demo.distance>1800){demo=new RelayRun(91);resetWorld();}}
 if(state==='countdown'){countdown-=dt;const number=Math.max(1,Math.ceil(countdown/.55));$('countdown').textContent=number;if(countdown<=0){state='playing';toggle('countdown',false);showToast('¡QUE NO SE CORTE!','Flechas o deslizá para moverte');}}
 if(state==='playing'){model.update(dt);handleFeedback();hudTimer+=dt;if(hudTimer>.075){hudTimer=0;updateHUD();}audio.update(true);}
 if(state==='result'&&idle>35)goHome();
 if(clock-lastToast>2.5)$('toast').classList.remove('show');
 animateWorld(state==='home'?demo:model,dt);renderer.render(scene,camera);requestAnimationFrame(frame);
}
renderer.compile(scene,camera);$('loading').classList.add('hidden');requestAnimationFrame(frame);
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
