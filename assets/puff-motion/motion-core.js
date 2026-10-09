import { POSES, WALK } from './poses.js';

export const MOTION = Object.freeze({
  duration:3700,walkEnd:1920,crouchEnd:2180,land:3160,recover:3340,
  frameDuration:120,size:240,canvas:1254,floor:570,table:383,
  startX:230,jumpX:375,endX:765,arc:480
});
const scale=MOTION.size/MOTION.canvas;
const poses=new Map(POSES.map(p=>[p.id,p]));
const clamp=v=>Math.min(1,Math.max(0,v));
const lerp=(a,b,t)=>a+(b-a)*t;
export const PHASES=[
  '泡芙正向书桌走来。','压低身体，准备起跳。','后腿蹬地，跳！',
  '腾空，收腿，再伸爪。','轻轻落地，缓冲一下。','泡芙已经站稳在桌上了。'
];
export function footOffset(id){const p=poses.get(id);if(!p)throw new Error(`Unknown Puff pose: ${id}`);return (p.bottom-p.nose[1])*scale;}
export function sampleMotion(elapsed){
  const t=Number.isFinite(elapsed)?Math.min(MOTION.duration,Math.max(0,elapsed)):0;
  let id=WALK[0],x=MOTION.startX,y=MOTION.floor-footOffset(id),sx=1,sy=1,phase=0;
  if(t<MOTION.walkEnd){
    id=WALK[Math.floor(t/MOTION.frameDuration)%WALK.length];
    x=lerp(MOTION.startX,MOTION.jumpX,t/MOTION.walkEnd);
    y=MOTION.floor-footOffset(id);
  }else if(t<MOTION.crouchEnd){
    id='03-crouch';phase=1;x=MOTION.jumpX;
    const q=Math.sin((t-MOTION.walkEnd)/(MOTION.crouchEnd-MOTION.walkEnd)*Math.PI);
    sx=1+.022*q;sy=1-.028*q;y=MOTION.floor-footOffset(id)*sy;
  }else if(t<MOTION.land){
    const u=(t-MOTION.crouchEnd)/(MOTION.land-MOTION.crouchEnd);
    id=u<.14?'04-push-off':u<.42?'05-jump-rise':u<.69?'06-jump-apex':'07-reach-down';
    phase=u<.14?2:3;x=lerp(MOTION.jumpX,MOTION.endX,u);
    y=lerp(MOTION.floor-footOffset('04-push-off'),MOTION.table-footOffset('07-reach-down'),u)-MOTION.arc*u*(1-u);
  }else if(t<MOTION.recover){
    id='08-land-compress';phase=4;x=MOTION.endX;
    const q=Math.sin((t-MOTION.land)/(MOTION.recover-MOTION.land)*Math.PI);
    sx=1+.025*q;sy=1-.035*q;y=MOTION.table-footOffset(id)*sy;
  }else{
    id='09-recover';phase=5;x=MOTION.endX;
    const q=Math.sin(clamp((t-MOTION.recover)/260)*Math.PI);
    sy=1+.018*q;y=MOTION.table-footOffset(id)*sy;
  }
  const floorOpacity=t<MOTION.crouchEnd?.13:.13*(1-clamp((t-MOTION.crouchEnd)/280));
  const airborne=t>=MOTION.crouchEnd&&t<MOTION.land;
  const tableNear=t<MOTION.land?clamp((y-160)/150):1;
  const tableOpacity=t>MOTION.crouchEnd+300?tableNear*.16:0;
  const impact=t>=MOTION.land&&t<MOTION.land+280?Math.sin((t-MOTION.land)/280*Math.PI)*1.5:0;
  const sway=t-MOTION.land-60;
  const cupTilt=sway>0&&sway<330?Math.sin(sway/330*Math.PI*2)*(1-sway/330)*1.3:0;
  return {t,id,x,y,sx,sy,phase,floorOpacity,tableOpacity,tableNear,impact,cupTilt,airborne};
}
