// Phase 4D.2 — Debt-Aware Incident Generation + Model Planning
// Makes technical debt actively influence incidents, planning gates, recurring failure attribution,
// observability, and corrective-action retirement.

const DEBT_INCIDENT_KEYS={
  nan:['fragile_precision','weak_provenance'],
  bubble:['no_pipeline_guardrails','scheduler_sprawl'],
  contam:['weak_provenance','eval_blind_spots'],
  ttft:['serving_cache_debt','scheduler_sprawl'],
  dpo:['posttrain_coupling','eval_blind_spots']
};
const DEBT_ACTION_MATCHERS=[
  {key:'no_pipeline_guardrails',match:/pipeline idle|PP × microbatch|scale-review/i},
  {key:'weak_provenance',match:/provenance|decontamination|near-duplicate|shard anomaly/i},
  {key:'fragile_precision',match:/finite-activation|bad-batch replay|precision/i},
  {key:'eval_blind_spots',match:/release gates|eval|benchmark/i},
  {key:'serving_cache_debt',match:/prefill|long-prompt|serving capacity/i},
  {key:'posttrain_coupling',match:/tool exactness|preference|structured tool/i},
  {key:'scheduler_sprawl',match:/scheduler|checkpoint recovery|launch checklist/i},
  {key:'legacy_checkpoints',match:/checkpoint/i}
];
const TIER_DEBT_POLICY={
  '30b':{score:7,critical:0,label:'Large dense training'},
  '70b':{score:11,critical:0,label:'Frontier dense training'},
  'moe':{score:14,critical:0,label:'Sparse frontier training'}
};

function ensureDebtConsequenceState(){
  ensureTechDebtState?.();
  state.techDebt.consequences ||= {version:1,advanceCount:0,forcedIncidents:0,recurrences:{},lastAttribution:null,planReview:null,planningOverrides:{},retirements:[]};
  state.techDebt.consequences.recurrences ||= {};
  state.techDebt.consequences.planningOverrides ||= {};
  state.techDebt.consequences.retirements ||= [];
}
function openDebtItems(){ensureDebtConsequenceState();return state.techDebt.items.filter(x=>x.status==='open')}
function debtItemsForIncident(type){
  const keys=DEBT_INCIDENT_KEYS[type]||[];
  return openDebtItems().filter(x=>keys.includes(x.key));
}
function debtIncidentPressure(type){
  return debtItemsForIncident(type).reduce((sum,item)=>{
    const def=debtDef(item),base=def.risk?.[type]||0;
    return sum+base*techDebtInterest(item)*(DEBT_SEVERITY_WEIGHT[item.severity]||1);
  },0);
}
function debtIncidentCandidates(){
  return Object.keys(DEBT_INCIDENT_KEYS).map(type=>({type,pressure:debtIncidentPressure(type)})).filter(x=>x.pressure>0).sort((a,b)=>b.pressure-a.pressure);
}
function debtDeterministicRoll(salt=0){
  ensureDebtConsequenceState();
  const n=(state.day||1)*41+(state.activeRun?.progress||0)*17+state.techDebt.consequences.advanceCount*29+salt*13;
  return ((n%997)+1)/998;
}
function maybeTriggerDebtIncident(){
  ensureDebtConsequenceState();
  const r=state.activeRun;if(!r||r.incident||r.progress<=0||r.progress>=100)return false;
  state.techDebt.consequences.advanceCount++;
  const candidates=debtIncidentCandidates();if(!candidates.length)return false;
  const total=candidates.reduce((s,x)=>s+x.pressure,0);
  const chance=Math.min(.34,.025+total*.012);
  if(debtDeterministicRoll()>=chance)return false;
  let pick=debtDeterministicRoll(7)*total,chosen=candidates[0];
  for(const c of candidates){pick-=c.pressure;if(pick<=0){chosen=c;break}}
  r.incident=chosen.type;
  state.techDebt.consequences.forcedIncidents++;
  state.techDebt.consequences.recurrences[chosen.type]=(state.techDebt.consequences.recurrences[chosen.type]||0)+1;
  const debts=debtItemsForIncident(chosen.type);
  state.techDebt.consequences.lastAttribution={day:state.day,type:chosen.type,debtIds:debts.map(x=>x.id),titles:debts.map(x=>x.title),pressure:Number(chosen.pressure.toFixed(2))};
  log?.(`⚠ Debt-triggered incident: ${INCIDENTS.find(x=>x.id===chosen.type)?.title||chosen.type}. Contributing debt: ${debts.map(x=>x.title).join(', ')}.`);
  openIncident(chosen.type);save();return true;
}

// Inject debt-weighted incidents before the baseline run advancement can choose its own event.
const debtAwareAdvanceRun=advanceRun;
advanceRun=function(){
  if(maybeTriggerDebtIncident())return;
  return debtAwareAdvanceRun();
};

function incidentDebtAttribution(type){
  const debts=debtItemsForIncident(type);
  return debts.map(item=>({id:item.id,key:item.key,title:item.title,severity:item.severity,age:item.age||0,interest:Number(techDebtInterest(item).toFixed(2)),source:item.source,modelId:item.modelId}));
}
const debtAwareOpenIncident=openIncident;
openIncident=function(id){
  const out=debtAwareOpenIncident(id);
  ensureDebtConsequenceState();
  const r=typeof activeIncidentRecord==='function'?activeIncidentRecord():null;
  if(r){
    r.debtAttribution ||= incidentDebtAttribution(id);
    r.recurringFailure=(state.techDebt.consequences.recurrences[id]||0)>1;
    r.detectionModifier=techDebtIncidentModifier(id).detectionMultiplier;
    if(r.debtAttribution.length&&!r.timeline.some(x=>x.type==='debt.attributed'))r.timeline.push({minute:0,day:state.day,type:'debt.attributed',debtIds:r.debtAttribution.map(x=>x.id),detectionModifier:r.detectionModifier});
  }
  save();return out;
};

// Technical debt can make the same incident harder to observe without hiding decisive evidence entirely.
if(typeof inspectWorkstationTool==='function'){
  const debtInspectTool=inspectWorkstationTool;
  inspectWorkstationTool=function(tool){
    const before=ws?.()?.investigated?.includes(tool);
    const out=debtInspectTool(tool);
    if(!before&&state.selectedIncident){
      const mod=techDebtIncidentModifier(state.selectedIncident);
      const w=ws?.();
      if(w&&mod.detectionMultiplier<.9){
        const penalty=Math.max(1,Math.round((1-mod.detectionMultiplier)*5));
        w.minutes+=penalty;
        w.terminalOutput.push(`OBSERVABILITY DEBT: ${penalty} additional simulated minute${penalty===1?'':'s'} spent correlating incomplete telemetry.`);
      }
    }
    save();return out;
  };
}

function planDebtSnapshot(tierId){
  ensureDebtConsequenceState();
  const open=openDebtItems(),impact=techDebtImpact(),policy=TIER_DEBT_POLICY[tierId];
  const critical=open.filter(x=>x.severity==='critical');
  const relevant=open.filter(x=>['distributed','training','data','evals','infrastructure'].includes(x.domain));
  const blockers=[];
  if(policy&&impact.score>=policy.score)blockers.push(`Debt pressure ${impact.score.toFixed(1)} exceeds the ${policy.label} review threshold ${policy.score}.`);
  if(policy&&critical.length>policy.critical)blockers.push(`${critical.length} critical debt item${critical.length===1?'':'s'} remain unresolved.`);
  if(tierId==='moe'&&open.some(x=>x.key==='scheduler_sprawl'))blockers.push('Mixed scheduler paths make expert-parallel failure recovery too fragile for an unreviewed MoE launch.');
  if(['70b','moe'].includes(tierId)&&open.some(x=>x.key==='weak_provenance'))blockers.push('Untracked provenance creates unacceptable measurement/data-debugging ambiguity at frontier scale.');
  return {tierId,policy,impact,relevant,critical,blockers,blocked:blockers.length>0};
}
function approveDebtPlan(tierId){
  ensureDebtConsequenceState();const snap=planDebtSnapshot(tierId);
  state.techDebt.consequences.planningOverrides[tierId]={day:state.day,score:Number(snap.impact.score.toFixed(1)),debtIds:snap.relevant.map(x=>x.id)};
  state.techDebt.history.push({day:state.day,type:'planning-risk-accepted',tierId,debtIds:snap.relevant.map(x=>x.id)});
  log?.(`📌 Accepted technical-debt risk for ${MODEL_TIERS.find(x=>x.id===tierId)?.name||tierId}. The decision is now auditable.`);save();render();
}
function clearDebtPlanOverride(tierId){ensureDebtConsequenceState();delete state.techDebt.consequences.planningOverrides[tierId];save();render()}

const debtAwareLaunchTier=launchTier;
launchTier=function(id){
  ensureDebtConsequenceState();const snap=planDebtSnapshot(id),override=state.techDebt.consequences.planningOverrides[id];
  if(snap.blocked&&!override){
    state.techDebt.consequences.planReview={tierId:id,day:state.day,snapshot:{score:Number(snap.impact.score.toFixed(1)),blockers:snap.blockers,debtIds:snap.relevant.map(x=>x.id)}};
    log?.(`🛑 Model plan review required before ${MODEL_TIERS.find(x=>x.id===id)?.name||id}: ${snap.blockers[0]}`);
    state.view='techDebt';save();render();return;
  }
  const beforeModels=state.models?.length||0;
  const out=debtAwareLaunchTier(id);
  if(state.activeRun&&override){state.activeRun.acceptedDebtRisk={...override,tierId:id};delete state.techDebt.consequences.planningOverrides[id]}
  if((state.models?.length||0)>beforeModels)techDebtAttachInheritance?.();
  save();return out;
};

function debtResolveFromAction(item,action){
  if(!item||item.status!=='open')return false;
  item.status='resolved';item.resolvedDay=state.day;item.resolvedByAction=action.id;
  state.techDebt.history.push({day:state.day,type:'resolved-by-corrective-action',id:item.id,actionId:action.id});
  state.techDebt.consequences.retirements.push({day:state.day,debtId:item.id,actionId:action.id,title:item.title});
  const m=item.modelId&&state.models?.find(x=>x.id===item.modelId);if(m){m.discoveries ||= [];m.discoveries.push({day:state.day,text:`Corrective action ${action.id} retired debt: ${item.title}.`})}
  return true;
}
function debtApplyCorrectiveAction(action){
  ensureDebtConsequenceState();if(!action)return[];
  const text=`${action.title||''} ${action.effect||''}`;
  const keys=DEBT_ACTION_MATCHERS.filter(x=>x.match.test(text)).map(x=>x.key);
  const retired=[];
  openDebtItems().filter(x=>keys.includes(x.key)).forEach(item=>{if(debtResolveFromAction(item,action))retired.push(item.title)});
  if(retired.length)log?.(`🧹 Corrective action retired technical debt: ${retired.join(', ')}.`);
  return retired;
}
if(typeof completeCorrectiveAction==='function'){
  const debtCorrective=completeCorrectiveAction;
  completeCorrectiveAction=function(id){
    const action=state.organization?.actionItems?.find(x=>x.id===id);const wasOpen=action&&action.status!=='complete';
    const out=debtCorrective(id);
    if(wasOpen&&action){action.retiredDebt=debtApplyCorrectiveAction(action);save()}
    return out;
  };
}

// Extend postmortems with recurring-failure and debt-causality context.
if(typeof renderPostmortemCard==='function'){
  const debtPostmortemCard=renderPostmortemCard;
  renderPostmortemCard=function(pm){
    const base=debtPostmortemCard(pm),r=state.organization?.incidents?.find(x=>x.id===pm.incidentId);if(!r)return base;
    const attrs=r.debtAttribution||[];if(!attrs.length&&!r.recurringFailure)return base;
    const block=`<section class="pm-debt-causality"><h3>Technical-debt causality</h3>${r.recurringFailure?'<p class="bad">↻ Recurring failure: this incident class has been triggered more than once while related debt remained active.</p>':''}${attrs.map(x=>`<p>• <b>${esc(x.title)}</b> · ${esc(x.severity)} · interest ${x.interest.toFixed(2)}×</p>`).join('')}<small>Detection multiplier at incident open: ${Number(r.detectionModifier||1).toFixed(2)}×</small></section>`;
    return base.replace('<section class="pm-actions">',`${block}<section class="pm-actions">`);
  };
}

// Add plan-review details to the existing Technical Debt Board.
if(typeof renderTechDebt==='function'){
  const debtPlanningRender=renderTechDebt;
  renderTechDebt=function(){
    ensureDebtConsequenceState();let html=debtPlanningRender();const review=state.techDebt.consequences.planReview;if(!review)return html;
    const tier=MODEL_TIERS.find(x=>x.id===review.tierId),snap=planDebtSnapshot(review.tierId),override=state.techDebt.consequences.planningOverrides[review.tierId];
    const panel=`<section class="debt-plan-review"><div class="eyebrow">MODEL PLAN REVIEW</div><h2>${esc(tier?.name||review.tierId)}</h2><p>Current technical debt materially changes the risk of this training plan.</p>${snap.blockers.map(x=>`<div class="debt-plan-blocker">⚠ ${esc(x)}</div>`).join('')}<div class="debt-plan-actions">${override?`<button onclick="clearDebtPlanOverride('${review.tierId}')">Revoke accepted risk</button><span>Risk accepted on day ${override.day}</span>`:`<button onclick="approveDebtPlan('${review.tierId}')">Accept risk and allow launch</button>`}</div></section>`;
    return html.replace('<main class="debt-grid">',`${panel}<main class="debt-grid">`);
  };
}
