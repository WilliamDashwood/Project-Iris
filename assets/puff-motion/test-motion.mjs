import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { POSES, WALK } from './poses.js';
import { MOTION, sampleMotion, footOffset, PHASES } from './motion-core.js';

assert.equal(POSES.length,15);assert.equal(new Set(WALK).size,8);
for(const p of POSES){
  const bytes=fs.readFileSync(new URL(`./${p.id}.png`,import.meta.url));
  assert.equal(bytes.readUInt32BE(16),512);assert.equal(bytes.readUInt32BE(20),512);assert.equal(bytes[25],6,'PNG must retain RGBA');
}
const seen=new Set();
for(let t=0;t<=MOTION.duration;t++){
  const s=sampleMotion(t);assert(POSES.some(p=>p.id===s.id));
  for(const key of ['x','y','sx','sy','floorOpacity','tableOpacity','impact','cupTilt'])assert(Number.isFinite(s[key]));
  if(t<MOTION.walkEnd){seen.add(s.id);assert(Math.abs(s.y+footOffset(s.id)*s.sy-MOTION.floor)<1e-8);}
  if(t>=MOTION.land)assert(Math.abs(s.y+footOffset(s.id)*s.sy-MOTION.table)<1e-8);
}
assert.equal(seen.size,8);
for(const t of [-999,NaN,Infinity,undefined])assert.equal(sampleMotion(t).id,WALK[0]);
assert.equal(sampleMotion(999999).id,'09-recover');

const source=fs.readFileSync(new URL('./page2.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('import.meta.url',JSON.stringify(new URL('./page2.js',import.meta.url).href));
function harness(reducedMotion=false){
  let id=1;const pending=new Map(),nodes={},documentEvents={},windowEvents={},mediaEvents={};
  const make=()=>({attrs:{},style:{},dataset:{},listeners:{},children:[],setAttribute(k,v){this.attrs[k]=v},appendChild(n){this.children.push(n)},addEventListener(k,fn){this.listeners[k]=fn}});
  const root=make();root.querySelector=s=>nodes[s]??=make();
  const media={matches:reducedMotion,addEventListener(k,fn){mediaEvents[k]=fn}};
  const document={hidden:false,getElementById:()=>root,createElementNS:make,addEventListener(k,fn){documentEvents[k]=fn}};
  class Image {decode(){return Promise.resolve()}set src(value){queueMicrotask(()=>this.onload?.())}}
  const context={document,window:{addEventListener(k,fn){windowEvents[k]=fn}},matchMedia:()=>media,Image,URL,MOTION,PHASES,POSES,sampleMotion,setTimeout,clearTimeout,requestAnimationFrame(fn){const key=id++;pending.set(key,fn);return key},cancelAnimationFrame(key){pending.delete(key)}};
  vm.runInNewContext(source,context);
  return {root,nodes,media,mediaEvents,document,documentEvents,pending,step(t){const item=pending.entries().next().value;assert(item,'Frame should be scheduled');pending.delete(item[0]);item[1](t);assert(!/NaN|Infinity/.test(nodes['[data-actor]'].attrs.transform));}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const h=harness();await flush();assert.equal(h.nodes['[data-play]'].disabled,false);
h.step(50);h.step(49);h.step(NaN);
h.nodes['[data-play]'].listeners.click();assert.equal(h.pending.size,1,'Replay must cancel the previous frame');
h.step(0);h.step(1920);h.step(2300);assert.equal(h.root.dataset.phase,'2');
h.document.hidden=true;h.documentEvents.visibilitychange();assert.equal(h.pending.size,0);
h.document.hidden=false;h.documentEvents.visibilitychange();h.step(100000);assert.equal(h.root.dataset.phase,'2','Resume should not jump ahead');
h.step(100900);h.step(101500);assert.equal(h.root.dataset.pose,'09-recover');assert.equal(h.pending.size,0);
h.nodes['[data-play]'].listeners.click();h.media.matches=true;h.mediaEvents.change();assert.equal(h.pending.size,0);assert.equal(h.root.dataset.pose,'09-recover');
const reduced=harness(true);await flush();assert.equal(reduced.pending.size,0);assert.equal(reduced.root.dataset.pose,'09-recover');reduced.nodes['[data-play]'].listeners.click();assert.equal(reduced.pending.size,0);
console.log('PASS: 15 RGBA assets; 8-pose walk; full timeline; floor/table registration; invalid/backwards clocks; replay; background pause/resume; reduced motion.');
