import { POSES } from './poses.js';
import { MOTION, PHASES, sampleMotion } from './motion-core.js';

const root=document.getElementById('puff-room');
const find=s=>root.querySelector(s);
const actor=find('[data-actor]'),floor=find('[data-floor-shadow]'),table=find('[data-table-shadow]');
const desk=find('[data-desk]'),front=find('[data-front]'),cup=find('[data-cup]');
const status=find('[data-status]'),button=find('[data-play]');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const scale=MOTION.size/MOTION.canvas;
const assets=new Map();
const svgNS='http://www.w3.org/2000/svg';
for(const pose of POSES){
  const node=document.createElementNS(svgNS,'image');
  const url=new URL(`./${pose.id}.png`,import.meta.url).href;
  node.setAttribute('href',url);node.setAttribute('width',MOTION.size);node.setAttribute('height',MOTION.size);
  node.setAttribute('x',-pose.nose[0]*scale);node.setAttribute('y',-pose.nose[1]*scale);
  node.style.visibility='hidden';actor.appendChild(node);assets.set(pose.id,{node,url});
}
let raf=0,lastFrame=null,elapsed=0,currentId='',phase=-1,ready=false,running=false,loading=null;
function draw(t){
  const state=sampleMotion(t);
  if(state.id!==currentId){
    if(currentId)assets.get(currentId).node.style.visibility='hidden';
    assets.get(state.id).node.style.visibility='visible';currentId=state.id;root.dataset.pose=currentId;
  }
  actor.setAttribute('transform',`translate(${state.x.toFixed(2)} ${state.y.toFixed(2)}) scale(${state.sx.toFixed(3)} ${state.sy.toFixed(3)})`);
  floor.setAttribute('cx',state.x-72);floor.setAttribute('opacity',state.floorOpacity.toFixed(3));
  table.setAttribute('cx',Math.max(484,state.x-65));table.setAttribute('rx',38+26*state.tableNear);table.setAttribute('opacity',state.tableOpacity.toFixed(3));
  desk.setAttribute('transform',`translate(0 ${state.impact.toFixed(2)})`);front.setAttribute('transform',`translate(0 ${state.impact.toFixed(2)})`);
  cup.setAttribute('transform',`rotate(${state.cupTilt.toFixed(2)} 888 374)`);
  if(phase!==state.phase){phase=state.phase;status.textContent=PHASES[phase];root.dataset.phase=String(phase);}
}
function cancel(){cancelAnimationFrame(raf);raf=0;lastFrame=null;}
function finishReduced(){cancel();running=false;elapsed=MOTION.duration;phase=-1;draw(elapsed);status.textContent='泡芙已站稳 · 已减少动态效果';}
function tick(now){
  if(!running||document.hidden)return;
  // Frame timestamps share one clock; avoid negative indices on clock reset.
  if(Number.isFinite(now)){
    if(lastFrame!==null)elapsed=Math.min(MOTION.duration,elapsed+Math.max(0,now-lastFrame));
    lastFrame=now;draw(elapsed);
  }
  if(elapsed<MOTION.duration)raf=requestAnimationFrame(tick);
  else{running=false;raf=0;lastFrame=null;}
}
function play(){
  if(!ready)return;
  cancel();phase=-1;elapsed=0;
  if(reduced.matches){finishReduced();return;}
  running=true;draw(0);
  if(!document.hidden)raf=requestAnimationFrame(tick);
}
function loadOne(url){return new Promise((resolve,reject)=>{
  const image=new Image();
  const timer=setTimeout(()=>{image.onload=image.onerror=null;reject(new Error('Puff asset timeout'));},15000);
  image.onload=()=>{clearTimeout(timer);image.decode().catch(()=>{}).then(resolve);};
  image.onerror=()=>{clearTimeout(timer);reject(new Error('Puff asset unavailable'));};
  image.src=url;
});}
async function prepare(){
  if(loading)return loading;
  button.disabled=true;status.textContent='正在准备泡芙的动作…';
  loading=Promise.all([...assets.values()].map(a=>loadOne(a.url))).then(()=>{
    ready=true;button.disabled=false;button.innerHTML='再跳一次 <span aria-hidden="true">↗</span>';play();
  }).catch(()=>{
    status.textContent='动作图片未加载完成，请重试。';button.textContent='重新加载';button.disabled=false;
  }).finally(()=>{loading=null;});
  return loading;
}
button.addEventListener('click',()=>ready?play():prepare());
reduced.addEventListener('change',()=>{if(ready&&reduced.matches)finishReduced();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)cancel();
  else if(running&&!reduced.matches){lastFrame=null;raf=requestAnimationFrame(tick);}
});
window.addEventListener('pagehide',cancel);
window.addEventListener('pageshow',()=>{if(running&&!document.hidden&&!raf)raf=requestAnimationFrame(tick);});
prepare();
