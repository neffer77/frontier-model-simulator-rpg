// Phase 4D — Persistent Consequences & Technical Debt
// Makes earlier engineering choices alter future reliability, cost, and model lineage.

const TECH_DEBT_VERSION=1;
const DEBT_SEVERITY_WEIGHT={low:1,medium:2,high:4,critical:7};
const DEBT_CATALOG={
  legacy_checkpoints:{title:'Legacy checkpoint format',domain:'infrastructure',severity:'medium',description:'Older checkpoints require compatibility paths and increase restore complexity.',risk:{checkpoint_corruption:.18,recovery_delay:.22},detection:{checkpoint_corruption:-.05},cost:{engineering:.12}},
  scheduler_sprawl:{title:'Mixed scheduler stack',domain:'infrastructure',severity:'high',description:'Multiple launch/scheduler paths create inconsistent retries, placement, and failure handling.',risk:{nccl_timeout:.12,oom:.08},detection:{nccl_timeout:-.08},cost:{engineering:.18}},
  weak_provenance:{title:'Untracked data provenance',domain:'data',severity:'critical',description:'Dataset lineage is incomplete, making contamination and bad-shard investigations slower and riskier.',risk:{contamination:.28,bad_shard:.16},detection:{contamination:-.22,bad_shard:-.14},cost:{engineering:.20}},
  no_pipeline_guardrails:{title:'No pipeline configuration guardrails',domain:'distributed',severity:'high',description:'Parallelism scale-ups can silently create fill/drain inefficiency and unstable utilization.',risk:{pipeline_bubble:.24},detection:{pipeline_bubble:-.12},cost:{compute:.16}},
  fragile_precision:{title:'Fragile mixed-precision recipe',domain:'training',severity:'high',description:'Precision settings have not been hardened across model sizes and data regimes.',risk:{nan:.20},detection:{nan:-.08},cost:{compute:.10}},
  eval_blind_spots:{title:'Sparse eval coverage',domain:'evals',severity:'high',description:'Release gates do not cover enough slices to reliably catch regressions.',risk:{eval_regression:.20,tool_regression:.14},detection:{eval_regression:-.18,tool_regression:-.15},cost:{engineering:.10}},
  serving_cache_debt:{title:'Serving cache fragmentation debt',domain:'inference',severity:'medium',description:'Serving policy has accumulated cache-fragmentation edge cases and queueing inefficiency.',risk:{ttft:.18},detection:{ttft:-.06},cost:{compute:.12}},
  posttrain_coupling:{title:'Coupled post-training objectives',domain:'posttraining',severity:'medium',description:'Preference optimization is too tightly coupled to one aggregate objective.',risk:{tool_regression:.16,refusal_regression:.12},detection:{tool_regression:-.05},cost:{engineering:.08}}
};

function ensureTechDebtState(){
  state.techDebt ||= {version:TECH_DEBT_VERSION,items:[],nextId:1,history:[],selectedId:null,policy:{autoSeeded:false},lastRiskSnapshot:null};
  state.techDebt.items ||= [];state.techDebt.history ||= [];
  state.models?.forEach(m=>{m.technicalDebt ||= []});
  if(!state.techDebt.policy.autoSeeded){seedInitialDebt();state.techDebt.policy.autoSeeded=true;save?.()}
}
function seedInitialDebt(){
  const seeds=[];
  if((state.organization?.incidents?.length||0)>=2)seeds.push('scheduler_sprawl');
  if((state.models?.length||0)>=2)seeds.push('legacy_checkpoints');
  if(state.dataEvals && !state.dataEvals.provenanceVerified)seeds.push('weak_provenance');
  if(state.artifactLab?.appliedConfig?.pipeline_parallel>=8)seeds.push('no_pipeline_guardrails');
  if(state.codeLab?.runs?.some?.(r=>r.fault==='nan'))seeds.push('fragile_precision');
  if((state.models?.at(-1)?.evals?.length||0)<2)seeds.push('eval_blind_spots');
  seeds.slice(0,4).forEach(k=>techDebtAdd(k,'migration'));
}
function techDebtAdd(key,source='decision',modelId=null){
  ensureTechDebtState();const def=DEBT_CATALOG[key];if(!def)return null;
  const existing=state.techDebt.items.find(x=>x.key===key&&x.status!=='resolved');if(existing)return existing;
  const item={id:state.techDebt.nextId++,key,title:def.title,domain:def.domain,severity:def.severity,description:def.description,status:'open',createdDay:state.day||1,source,modelId:modelId||state.models?.at(-1)?.id||null,age:0,interest:0,lastPaidDay:null};
  state.techDebt.items.push(item);if(item.modelId){const m=state.models?.find(x=>x.id===item.modelId);if(m&&!m.technicalDebt.includes(item.id))m.technicalDebt.push(item.id)}
  state.techDebt.history.push({day:state.day||1,type:'created',id:item.id,key});
  if(typeof log==='function')log(`⚠ Technical debt added: ${def.title}.`);return item;
}
function techDebtOpen(){ensureTechDebtState();state.view='techDebt';save();render()}
function techDebtClose(){state.view='company';save();render()}
function techDebtSelect(id){state.techDebt.selectedId=id;save();render()}
function debtDef(item){return DEBT_CATALOG[item.key]||{risk:{},detection:{},cost:{}}}
function techDebtInterest(item){return Math.min(3,1+(item.age||0)*0.06+(item.interest||0))}
function techDebtImpact(){
  ensureTechDebtState();const open=state.techDebt.items.filter(x=>x.status==='open'),risk={},detection={},cost={engineering:0,compute:0};
  open.forEach(item=>{const d=debtDef(item),interest=techDebtInterest(item);Object.entries(d.risk||{}).forEach(([k,v])=>risk[k]=(risk[k]||0)+v*interest);Object.entries(d.detection||{}).forEach(([k,v])=>detection[k]=(detection[k]||0)+v*interest);Object.entries(d.cost||{}).forEach(([k,v])=>cost[k]=(cost[k]||0)+v*interest)});
  return {risk,detection,cost,score:open.reduce((n,x)=>n+(DEBT_SEVERITY_WEIGHT[x.severity]||1)*techDebtInterest(x),0)};
}
function techDebtAge(days=1){ensureTechDebtState();state.techDebt.items.filter(x=>x.status==='open').forEach(x=>{x.age=(x.age||0)+days;if(x.age>15)x.interest=Math.min(1.5,(x.interest||0)+.02*days)});state.techDebt.lastRiskSnapshot=techDebtImpact()}
function techDebtPay(id,mode='fix'){
  ensureTechDebtState();const item=state.techDebt.items.find(x=>x.id===id);if(!item||item.status!=='open')return;
  const w=DEBT_SEVERITY_WEIGHT[item.severity]||1;const engineeringDays=Math.max(1,Math.round(w*techDebtInterest(item)));const cashM=Number((w*.12*techDebtInterest(item)).toFixed(2));
  if(mode==='fix'){
    item.status='resolved';item.resolvedDay=state.day||1;item.lastPaidDay=state.day||1;state.day=(state.day||1)+engineeringDays;
    if(typeof state.money==='number')state.money=Math.max(0,state.money-cashM);
    state.techDebt.history.push({day:state.day,type:'resolved',id:item.id,engineeringDays,cashM});
    const m=item.modelId&&state.models?.find(x=>x.id===item.modelId);if(m){m.discoveries ||= [];m.discoveries.push({day:state.day,text:`Retired technical debt: ${item.title}.`})}
    if(typeof log==='function')log(`🧹 Retired ${item.title} (${engineeringDays} engineering day${engineeringDays===1?'':'s'}).`);
  }else{
    item.status='accepted';item.acceptedDay=state.day||1;state.techDebt.history.push({day:state.day,type:'accepted',id:item.id});if(typeof log==='function')log(`📌 Accepted risk: ${item.title}.`)
  }
  save();render();
}
function techDebtReopen(id){const item=state.techDebt.items.find(x=>x.id===id);if(!item||item.status!=='accepted')return;item.status='open';state.techDebt.history.push({day:state.day||1,type:'reopened',id});save();render()}
function techDebtIncidentModifier(type){const i=techDebtImpact();return {riskMultiplier:Math.max(.5,1+(i.risk[type]||0)),detectionMultiplier:Math.max(.35,1+(i.detection[type]||0)),engineeringCostMultiplier:1+i.cost.engineering,computeCostMultiplier:1+i.cost.compute}}
function techDebtMaybeSeedFromSystems(){
  ensureTechDebtState();
  const last=state.models?.at(-1),cfg=last?.training?.config||{};
  if((cfg.pipeline_parallel||0)>=8)techDebtAdd('no_pipeline_guardrails','parallelism-scale',last?.id);
  if(String(cfg.precision||'').toLowerCase().includes('fp8'))techDebtAdd('fragile_precision','precision-choice',last?.id);
  if(state.dataEvals?.contamination?.status==='unresolved')techDebtAdd('weak_provenance','data-eval',last?.id);
  if(state.dataEvals?.releaseGate?.status==='overridden')techDebtAdd('eval_blind_spots','release-override',last?.id);
}
function techDebtInheritanceFor(parent){
  ensureTechDebtState();if(!parent)return[];return state.techDebt.items.filter(x=>x.status==='open'&&x.modelId===parent.id).map(x=>({debtId:x.id,key:x.key,title:x.title,severity:x.severity,interest:Number(techDebtInterest(x).toFixed(2))}));
}
function techDebtAttachInheritance(){
  const models=state.models||[];for(let i=1;i<models.length;i++){const m=models[i],p=models.find(x=>x.id===m.parentModelId)||models[i-1];m.inheritedDebt ||= [];techDebtInheritanceFor(p).forEach(d=>{if(!m.inheritedDebt.some(x=>x.debtId===d.debtId))m.inheritedDebt.push(d)});}
}
function debtSeverityClass(s){return `debt-sev-${s}`}
function renderDebtItem(item){const d=debtDef(item),interest=techDebtInterest(item),mult=techDebtIncidentModifier(Object.keys(d.risk||{})[0]||'generic');return `<article class="debt-item ${debtSeverityClass(item.severity)} ${item.status}"><header><div><span>${esc(item.domain)}</span><h3>${esc(item.title)}</h3></div><b>${esc(item.severity)}</b></header><p>${esc(item.description)}</p><div class="debt-metrics"><span>Age <b>${item.age||0}d</b></span><span>Interest <b>${interest.toFixed(2)}×</b></span><span>Eng. drag <b>+${Math.round((mult.engineeringCostMultiplier-1)*100)}%</b></span></div><div class="debt-effects">${Object.entries(d.risk||{}).map(([k,v])=>`<span>↑ ${esc(k.replaceAll('_',' '))} ${Math.round(v*interest*100)}%</span>`).join('')}${Object.entries(d.detection||{}).map(([k,v])=>`<span>↓ detect ${esc(k.replaceAll('_',' '))} ${Math.round(Math.abs(v)*interest*100)}%</span>`).join('')}</div><footer>${item.status==='open'?`<button onclick="techDebtPay(${item.id},'fix')">Pay down debt</button><button onclick="techDebtPay(${item.id},'accept')">Accept risk</button>`:item.status==='accepted'?`<button onclick="techDebtReopen(${item.id})">Reconsider</button>`:`<span>Resolved day ${item.resolvedDay}</span>`}</footer></article>`}
function renderTechDebt(){
  ensureTechDebtState();techDebtMaybeSeedFromSystems();techDebtAttachInheritance();const impact=techDebtImpact(),items=state.techDebt.items.slice().sort((a,b)=>(a.status==='resolved')-(b.status==='resolved')||(DEBT_SEVERITY_WEIGHT[b.severity]-DEBT_SEVERITY_WEIGHT[a.severity]));const latest=state.models?.at(-1);return `<div class="debt-shell"><header class="debt-head"><div><div class="eyebrow">PHASE 4D · PERSISTENT CONSEQUENCES</div><h1>Technical Debt Board</h1><p>Shortcuts compound. Debt increases incident probability, reduces observability, raises engineering/compute cost, and can follow a model lineage forward.</p></div><button onclick="techDebtClose()">Return to company</button></header><section class="debt-summary"><div><span>Open debt</span><b>${state.techDebt.items.filter(x=>x.status==='open').length}</b></div><div><span>Debt pressure</span><b>${impact.score.toFixed(1)}</b></div><div><span>Engineering drag</span><b>+${Math.round(impact.cost.engineering*100)}%</b></div><div><span>Compute drag</span><b>+${Math.round(impact.cost.compute*100)}%</b></div></section>${latest?`<section class="debt-lineage"><div><span>Current model</span><b>${esc(latest.name)}</b></div><div><span>Inherited debt</span><b>${(latest.inheritedDebt||[]).length}</b></div><p>${(latest.inheritedDebt||[]).length?(latest.inheritedDebt||[]).map(x=>esc(x.title)).join(' · '):'No inherited debt recorded on this model yet.'}</p></section>`:''}<main class="debt-grid">${items.length?items.map(renderDebtItem).join(''):`<div class="debt-empty"><h2>No active technical debt</h2><p>That will change when shortcuts, overrides, or deferred reliability work accumulate.</p></div>`}</main></div>`}

const debtBaseRender=render;
render=function(){ensureTechDebtState();techDebtMaybeSeedFromSystems();techDebtAttachInheritance();if(state.view==='techDebt'){document.getElementById('app').innerHTML=renderTechDebt();return}debtBaseRender();if(!state.started)return;const shell=document.querySelector('.game-shell');if(!shell)return;const impact=techDebtImpact(),open=state.techDebt.items.filter(x=>x.status==='open').length;const b=document.createElement('button');b.className='debt-launch';b.onclick=techDebtOpen;b.innerHTML=`<span>TECH DEBT</span><b>${open} open · pressure ${impact.score.toFixed(1)}</b><small>Consequences · recurrence · lineage →</small>`;shell.insertBefore(b,shell.children[1]||null)};

// Age debt when the game advances by wrapping common day-advance operations opportunistically.
const debtSave=save;
save=function(){if(state?.started&&state.techDebt){const prev=state.techDebt._lastSeenDay||state.day||1;const now=state.day||1;if(now>prev)techDebtAge(now-prev);state.techDebt._lastSeenDay=now}return debtSave()};
render();
