import test from 'node:test';
import assert from 'node:assert/strict';
import { RelayRun, LANES, BALANCE, generateRoutes, randomGenerator } from '../core.js';

function isolated(type, options={}) {
 const run=new RelayRun(123);run.events=[{id:'fixture',type,d:1,lane:1,done:false,...options}];run.generatedUntil=10000;run.nextRow=10000;run.nextRelay=10000;run.distance=.5;return run;
}
test('equal seeds generate the same track and every relay has a valid choice',()=>{
 const a=new RelayRun(42),b=new RelayRun(42);assert.deepEqual(a.events,b.events);const relay=a.nextGate;assert.ok(relay.routes.some(r=>r.kind!=='blocked'));
});
test('all 26 playable route combinations occur, including all-good and all-neutral',()=>{
 const combinations=new Set();const random=randomGenerator(12345);
 for(let i=0;i<12000;i++){const routes=generateRoutes(random);assert.ok(routes.some(r=>r.kind!=='blocked'));combinations.add(routes.map(r=>r.kind).join(','));}
 assert.equal(combinations.size,26);assert.ok(combinations.has('eco,eco,eco'));assert.ok(combinations.has('normal,normal,normal'));assert.ok(combinations.has('blocked,normal,blocked'));assert.equal(combinations.has('blocked,blocked,blocked'),false);
});
test('the all-red draw is repaired before a relay reaches the game',()=>{
 const routes=generateRoutes(()=>.99);assert.ok(routes.some(r=>r.kind!=='blocked'));assert.equal(routes.length,3);
});
test('colliding costs battery once and grants temporary collision protection',()=>{
 const run=isolated('block');run.update(.02);assert.equal(run.hits,1);assert.ok(run.battery<79&&run.battery>77);const after=run.battery;run.update(.02);assert.equal(run.hits,1);assert.ok(after-run.battery<.1);
});
test('a high enough jump clears a barrier and a slide clears a beam',()=>{
 const jumping=isolated('barrier');jumping.y=1.4;jumping.update(.02);assert.equal(jumping.hits,0);assert.ok(jumping.score>=60);
 const sliding=isolated('beam');assert.ok(sliding.duck());sliding.update(.02);assert.equal(sliding.hits,0);assert.ok(sliding.score>=60);
});
test('a red relay deals immediate damage, does not count, and never stops the runner',()=>{
 const run=isolated('relay',{d:10,routes:[{kind:'eco',charge:6},{kind:'blocked',charge:0},{kind:'normal',charge:0}]});run.distance=7;run.battery=60;run.relays=2;run.update(.02);
 assert.ok(Math.abs(run.battery-(60-BALANCE.redDamage-BALANCE.baseDrain*.02))<.0001);assert.equal(run.hits,1);assert.equal(run.relays,2);assert.equal(run.deliveries,0);assert.equal(run.score,0);assert.ok(run.distance>7);assert.equal(run.waiting,false);assert.equal(run.events[0].done,true);
 const after=run.battery;run.update(.02);assert.ok(after-run.battery<.1,'a missed relay damages only once');assert.equal(run.hits,1);
});
test('normal signal has no charge or extra drain, even when it completes a delivery',()=>{
 const run=isolated('relay',{d:10,routes:Array.from({length:3},()=>({kind:'normal',charge:0}))});run.distance=7;run.battery=60;run.relays=2;run.update(.02);
 assert.ok(Math.abs(run.battery-(60-BALANCE.baseDrain*.02))<.0001);assert.equal(run.relays,3);assert.equal(run.deliveries,1);assert.equal(run.route,'normal');
});
test('good signal recharges six percent and uses the efficient drain',()=>{
 const run=isolated('relay',{d:10,routes:Array.from({length:3},()=>({kind:'eco',charge:6}))});run.distance=7;run.battery=60;run.update(.02);
 assert.ok(Math.abs(run.battery-(66-BALANCE.ecoDrain*.02))<.0001);assert.equal(run.relays,1);assert.equal(run.route,'eco');
});
test('relay contact uses the physical lane rather than a queued movement',()=>{
 const run=isolated('relay',{d:10,routes:[{kind:'eco',charge:6},{kind:'blocked',charge:0},{kind:'normal',charge:0}]});run.distance=7;run.move(-1);run.update(.001);assert.equal(run.relays,0);assert.equal(run.hits,1);
});
test('the third relay delivers a message while the endless run continues',()=>{
 const run=isolated('relay',{d:10,routes:[{kind:'eco',charge:6},{kind:'eco',charge:6},{kind:'normal',charge:0}]});run.distance=7;run.relays=2;run.update(.02);assert.equal(run.deliveries,1);assert.equal(run.relays,3);assert.equal(run.over,false);assert.ok(run.score>=1300);run.update(.02);assert.ok(run.distance>7);
});
test('battery depletion ends the run and battery packs never exceed 100%',()=>{
 const empty=isolated('block');empty.battery=1;empty.update(.02);assert.equal(empty.over,true);assert.equal(empty.battery,0);const distance=empty.distance;empty.update(.02);assert.equal(empty.distance,distance);
 const full=isolated('battery');full.battery=99;full.update(.02);assert.ok(full.battery<=100);assert.equal(full.pickups,1);
});
test('endless generation stays bounded and traversable after 30 km',()=>{
 const run=new RelayRun(709);
 // The long-run invariant uses actual physics and controls; it avoids hazards
 // by choosing a lane and replenishes energy only to isolate generation.
 for(let step=0;step<70000&&run.distance<30000;step++){
  run.battery=100;
  const gate=run.nextGate;
  if(gate&&gate.d-run.distance<60){let target=gate.routes.findIndex(r=>r.kind==='eco');if(target<0)target=gate.routes.findIndex(r=>r.kind!=='blocked');run.move(Math.sign(target-run.lane));}
  else {
   const threats=run.events.filter(e=>!e.done&&!['relay','battery','data'].includes(e.type)&&e.d-run.distance>0&&e.d-run.distance<15);
   if(threats.some(e=>e.lane===run.lane)){const safe=[0,1,2].find(l=>!threats.some(e=>e.lane===l));if(safe!==undefined)run.move(Math.sign(safe-run.lane));}
  }
  run.update(.02);run.drainFeedback();
  assert.ok(run.events.length<130,'old entities must be discarded');assert.ok(run.events.some(e=>e.d>run.distance));assert.ok(Number.isFinite(run.x));
 }
 assert.ok(run.distance>=30000);assert.ok(run.deliveries>=40);assert.equal(run.over,false);assert.ok(run.speed>=29);
});
