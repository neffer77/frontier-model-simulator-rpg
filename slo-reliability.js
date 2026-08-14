// Phase 4D.7 — SLOs, Error Budgets, Paging Fatigue & Game Days
const SLO_VERSION=1;
const DEFAULT_SLOS={runtime:99.95,checkpoints:99.9,tokenizer:99.95,data:99.9,evals:99.5,serving:99.95};
const ESCALATION_PRESETS={
  conservative:{name:'Conservative',pageThreshold:.55,noise:.18,detectionBonus:.18,description:'Pages early. Faster detection, higher responder fatigue.'},
  balanced:{name:'Balanced',pageThreshold:.7,noise:.1,detectionBonus:.1,description:'Balances page noise and detection latency.'},
  quiet:{name:'Quiet',pageThreshold:.82,noise:.04,detectionBonus:.03,description:'Fewer pages, but subtle failures can run longer.'}
};
const GAME_DAYS={
  runtime:{title:'Training Runtime Failover',component:'runtime',costM:.18,benefit:'Practice launcher rollback, queue isolation, and responder handoff.'},
  checkpoints:{title:'Checkpoint Restore Drill',component:'checkpoints',costM:.14,benefit:'Practice checksum verification and restore/replay under time pressure.'},
  serving:{title:'Serving Scheduler Chaos Drill',component:'serving',costM:.2,benefit:'Practice failover and capacity shedding across serving pools.'},
  data:{title:'Data Pipeline Corruption Drill',component:'data',costM:.16,benefit:'Practice shard isolation and provenance rollback.'},
  evals:{title:'Eval Platform Degradation Drill',component:'evals',costM:.12,benefit:'Practice release-gate continuity when eval infrastructure is impaired.'},
  tokenizer:{title:'Tokenizer Contract Mismatch Drill',component:'tokenizer',costM:.1,benefit:'Practice cross-service tokenizer rollback and validation.'}
};
function ensureSloState(){
  if(typeof ensureOpsState==='function')ensureOpsState();
  state.slo ||= {version:SLO_VERSION,components:{},fatigue:{},gameDays:[],history:[]};
  Object.keys(SHARED_COMPONENTS||{}).forEach(id=>{
    state.slo.components[id] ||= {target:DEFAULT_SLOS[id]||99.9,errorBudget:1,burn:0,availability:100,escalation:'balanced',pages:0,lastIncidentDay:null};
    state.slo.fatigue[id] ||= 0;
  });
}
function sloComponent(id){ensureSloState();return state.slo.components[id]}
function sloSetTarget(id,target){const s=sloComponent(id);if(!s)return;s.target=Math.max(90,Math.min(99.999,Number(target)));sloRecalculate(id);save();render()}
function sloSetEscalation(id,preset){const s=sloComponent(id);if(!s||!ESCALATION_PRESETS[preset])return;s.escalation=preset;state.slo.history.push({day:state.day||1,type:'escalation.changed',component:id,preset});save();render()}
function sloPagingFatigue(){ensureSloState();const vals=Object.values(state.slo.fatigue);return vals.length?vals.reduce((n,x)=>n+x,0)/vals.length:0}
function sloRecalculate(id){const s=sloComponent(id);if(!s)return;const incidents=(state.operations?.incidents||[]).filter(x=>x.component===id);const recent=incidents.filter(x=>(state.day||1)-(x.openedDay||1)<=30);const minutes=recent.reduce((n,x)=>n+(x.minutes||0),0);const totalMinutes=30*24*60;s.availability=Math.max(0,100-minutes/totalMinutes*100);const allowed=Math.max(.0001,100-s.target),consumed=Math.max(0,(100-s.availability)/allowed);s.burn=Number(consumed.toFixed(2));s.errorBudget=Math.max(0,Number((1-consumed).toFixed(2)));const preset=ESCALATION_PRESETS[s.escalation]||ESCALATION_PRESETS.balanced;s.pages=Math.max(0,Math.round(recent.length*(1+preset.noise*2)));state.slo.fatigue[id]=Math.max(0,Math.min(1,s.pages*.035+preset.noise*.22));}
function sloRecalculateAll(){ensureSloState();Object.keys(state.slo.components).forEach(sloRecalculate)}
function runGameDay(id){ensureSloState();const g=GAME_DAYS[id],s=sloComponent(id);if(!g||!s)return;if((state.cashM||0)<g.costM){log?.(`Need $${g.costM.toFixed(2)}M for game day.`);return}state.cashM-=g.costM;const before=state.slo.fatigue[id]||0;state.slo.fatigue[id]=Math.max(0,before-.08);s.errorBudget=Math.min(1,s.errorBudget+.05);state.slo.gameDays.unshift({day:state.day||1,component:id,title:g.title,result:'completed'});state.slo.history.push({day:state.day||1,type:'gameDay',component:id});if(state.operations?.rotations?.[id])state.operations.rotations[id].coverage=Math.min(1,(state.operations.rotations[id].coverage||.7)+.035);save();render()}
function sloAdvance(){sloRecalculateAll();for(const [id,s] of Object.entries(state.slo.components)){const preset=ESCALATION_PRESETS[s.escalation]||ESCALATION_PRESETS.balanced;if(s.burn>preset.pageThreshold){state.slo.fatigue[id]=Math.min(1,(state.slo.fatigue[id]||0)+.02);s.pages++}}save();render()}
function sloOpen(){ensureSloState();sloRecalculateAll();state.view='slo';save();render()}
function sloClose(){state.view='company';save();render()}
function renderSlo(){ensureSloState();sloRecalculateAll();return `<div class="slo-shell"><header class="slo-head"><div><div class="eyebrow">PHASE 4D.7 · SLO & RELIABILITY</div><h1>SLOs, Error Budgets & Paging Fatigue</h1><p>Reliability targets now constrain release speed and responder health. Run game days before incidents teach the lesson for you.</p></div><button onclick="sloClose()">Return to company</button></header><section class="slo-summary"><div><span>Average paging fatigue</span><b>${Math.round(sloPagingFatigue()*100)}%</b></div><div><span>Game days</span><b>${state.slo.gameDays.length}</b></div><div><span>Open incidents</span><b>${(state.operations?.incidents||[]).filter(x=>x.status==='open').length}</b></div></section><section class="slo-grid">${Object.entries(state.slo.components).map(([id,s])=>`<article><header><b>${esc(SHARED_COMPONENTS?.[id]?.name||id)}</b><span>${s.availability.toFixed(3)}% availability</span></header><div><span>Target</span><b>${s.target}%</b></div><div><span>Error budget</span><b>${Math.round(s.errorBudget*100)}%</b></div><div><span>Burn</span><b>${s.burn.toFixed(2)}×</b></div><div><span>Fatigue</span><b>${Math.round((state.slo.fatigue[id]||0)*100)}%</b></div><label>Escalation <select onchange="sloSetEscalation('${id}',this.value)">${Object.entries(ESCALATION_PRESETS).map(([k,p])=>`<option value="${k}" ${s.escalation===k?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label><button onclick="runGameDay('${id}')">Run game day</button></article>`).join('')}</section></div>`}
const sloBaseRender=render;
render=function(){ensureSloState();sloRecalculateAll();if(state.view==='slo'){document.getElementById('app').innerHTML=renderSlo();return}sloBaseRender();if(!state.started)return;const shell=document.querySelector('.game-shell');if(!shell)return;const b=document.createElement('button');b.className='slo-launch';b.onclick=sloOpen;b.innerHTML=`<span>SLO & RELIABILITY</span><b>${Math.round(sloPagingFatigue()*100)}% paging fatigue · ${state.slo.gameDays.length} game days</b><small>Error budgets · escalation · reliability drills →</small>`;shell.insertBefore(b,shell.children[1]||null)};
render();