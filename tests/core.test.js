import test from 'node:test';
import assert from 'node:assert/strict';
import { RelayRun, LANES } from '../core.js';

function isolated(type, options={}) {
 const run=new RelayRun(123);run.events=[{id:'fixture',type,d:1,lane:1,done:false,...options}];run.generatedUntil=10000;run.nextRow=10000;run.nextRelay=10000;run.distance=.5;return run;
}
test('equal seeds generate the same track and every relay has two valid choices',()=>{
 const a=new RelayRun(42),b=new RelayRun(42);assert.deepEqual(a.events,b.events);const relay=a.nextGate;assert.equal(relay.routes.filter(r=>r.kind!=='blocked').length,2);
});
test('colliding costs battery once and grants temporary collision protection',()=>{
 const run=isolated('block');run.update(.02);assert.equal(run.hits,1);assert.ok(run.battery<79&&run.battery>77);const after=run.battery;run.update(.02);assert.equal(run.hits,1);assert.ok(after-run.battery<.1);
});
test('a high enough jump clears a barrier and a slide clears a beam',()=>{
 const jumping=isolated('barrier');jumping.y=1.4;jumping.update(.02);assert.equal(jumping.hits,0);assert.ok(jumping.score>=60);
 const sliding=isolated('beam');assert.ok(sliding.duck());sliding.update(.02);assert.equal(sliding.hits,0);assert.ok(sliding.score>=60);
});
test('a blocked relay stores the message until the player changes to an available lane',()=>{
 const run=isolated('relay',{d:10,routes:[{kind:'eco',charge:8},{kind:'blocked',charge:0},{kind:'fast',charge:2}]});run.distance=7;run.battery=60;run.update(.02);assert.equal(run.waiting,true);assert.equal(run.distance,7);assert.equal(run.relays,0);assert.ok(run.battery<60);
 run.move(-1);for(let i=0;i<15;i++)run.update(.02);assert.equal(run.relays,1);assert.ok(run.distance>7);assert.equal(run.waiting,false);assert.equal(run.route,'eco');
});
test('the third relay delivers a message while the endless run continues',()=>{
 const run=isolated('relay',{d:10,routes:[{kind:'eco',charge:8},{kind:'eco',charge:8},{kind:'fast',charge:2}]});run.distance=7;run.relays=2;run.update(.02);assert.equal(run.deliveries,1);assert.equal(run.relays,3);assert.equal(run.over,false);assert.ok(run.score>=1300);run.update(.02);assert.ok(run.distance>7);
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
  if(gate&&gate.d-run.distance<60){const target=gate.routes.findIndex(r=>r.kind==='eco');run.move(Math.sign(target-run.lane));}
  else {
   const threats=run.events.filter(e=>!e.done&&!['relay','battery','data'].includes(e.type)&&e.d-run.distance>0&&e.d-run.distance<15);
   if(threats.some(e=>e.lane===run.lane)){const safe=[0,1,2].find(l=>!threats.some(e=>e.lane===l));if(safe!==undefined)run.move(Math.sign(safe-run.lane));}
  }
  run.update(.02);run.drainFeedback();
  assert.ok(run.events.length<130,'old entities must be discarded');assert.ok(run.events.some(e=>e.d>run.distance));assert.ok(Number.isFinite(run.x));
 }
 assert.ok(run.distance>=30000);assert.ok(run.deliveries>=40);assert.equal(run.over,false);assert.ok(run.speed>=29);
});
