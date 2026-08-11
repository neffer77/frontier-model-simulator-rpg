// Frontier Lab V3 — return loop without streak pressure.
// Uses unfinished ambitions, current company state, and weakest mastery to make re-entry easy.

const RETURN_BRIEF_GAP_MS=4*60*60*1000;
const _previousSeen=Number(state.lastSeenAt||0);
let _briefingPending=!!(state.started&&_previousSeen&&Date.now()-_previousSeen>RETURN_BRIEF_GAP_MS);

function masteryTarget(){
  const keys=["GRAD","PP","CONTAM","TTFT","DPO","FSDP","FP8","FLASH"];
  return keys.sort((a,b)=>(state.knowledge[a]||0)-(state.knowledge[b]||0))[0];
}
function nextFocusThread(){
  if(state.selectedIncident){const i=INCIDENTS.find(x=>x.id===state.selectedIncident);return i?`Resolve ${i.title}`:"Resolve live incident"}
  if(state.activeRun)return `Advance ${state.activeRun.name} · ${state.activeRun.progress}% complete`;
  if(!state.models.length)return `Launch ${state.prefix}-1 and establish your first model lineage`;
  const ready=TECH_TREE.find(t=>!hasTech(t.id)&&t.requires.every(hasTech)&&state.research>=t.cost);
  if(ready)return `Research ${ready.name} to unlock ${ready.effect.toLowerCase()}`;
  const next=MODEL_TIERS.find(t=>!state.models.some(m=>m.tier===t.name)&&tierAvailable(t));
  if(next)return `Prepare the ${next.name} training run`;
  return `Strengthen ${masteryTarget()} mastery through the next incident`;
}
function nextUnlockText(){
  const locked=MODEL_TIERS.find(t=>!tierAvailable(t));
  if(locked)return `${locked.name}: needs infra ${locked.minInfra}${locked.requires?` + ${locked.requires}`:""}`;
  return "Frontier-scale research campaign";
}
function closeLabBriefing(){_briefingPending=false;const el=document.querySelector('.lab-brief-back');if(el)el.remove()}
function labBriefing(){
  if(!_briefingPending||!state.started)return"";
  const hours=Math.max(4,Math.round((Date.now()-_previousSeen)/3600000));
  const run=state.activeRun?`${state.activeRun.name} · ${state.activeRun.progress}% · ${state.activeRun.phase}`:"No active training run";
  const rival=typeof rivalScore==="function"?rivalScore():"—";
  return `<div class="lab-brief-back"><div class="lab-brief"><div class="eyebrow">LAB BRIEFING · ${hours}H SINCE LAST SESSION</div><h2>${esc(state.company)} is exactly where you left it.</h2><p>No streak lost. No progress expired. Here is the shortest path back into flow.</p><div class="brief-grid"><div><span>TRAINING</span><b>${esc(run)}</b></div><div><span>COMPETITION</span><b>Helix score ${rival}</b></div><div><span>MASTERY TARGET</span><b>${masteryTarget()}</b></div><div><span>NEXT UNLOCK</span><b>${esc(nextUnlockText())}</b></div></div><div class="focus-thread"><span>NEXT THREAD</span><b>${esc(nextFocusThread())}</b></div><button class="primary" onclick="closeLabBriefing()">JUMP BACK IN →</button></div></div>`;
}
function injectFocusThread(){
  if(!state.started)return;const campus=document.querySelector('.campus');if(!campus)return;const old=campus.querySelector('.focus-thread-chip');if(old)old.remove();campus.insertAdjacentHTML('beforeend',`<div class="focus-thread-chip"><span>FOCUS THREAD</span><b>${esc(nextFocusThread())}</b></div>`);if(_briefingPending&&!document.querySelector('.lab-brief-back'))document.body.insertAdjacentHTML('beforeend',labBriefing());
}
const _engagementRender=render;
render=function(){_engagementRender();injectFocusThread()};
window.addEventListener('pagehide',()=>{try{state.lastSeenAt=Date.now();localStorage.setItem('frontier-lab-v3',JSON.stringify(state))}catch(e){}});
window.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){try{state.lastSeenAt=Date.now();localStorage.setItem('frontier-lab-v3',JSON.stringify(state))}catch(e){}}});
injectFocusThread();
