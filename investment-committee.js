// Phase 4D.23 — Scenario Planning, Option Value, Staged Funding Gates & NPC Investment Committee Debates
const IC_VERSION=2;
const SCENARIOS={bull:{name:'Capability boom',prob:.25,themeBoost:{science:1.35,platform:1.1,commercial:1.15,reliability:.9}},base:{name:'Measured expansion',prob:.5,themeBoost:{science:1,platform:1,commercial:1,reliability:1}},bear:{name:'Capital + reliability squeeze',prob:.25,themeBoost:{science:.7,platform:1.05,commercial:.85,reliability:1.35}}};
function ensureInvestmentCommittee(){ensurePortfolioStrategy?.();state.investmentCommittee ||= {version:IC_VERSION,scenarios:{bull:.25,base:.5,bear:.25},gates:{},debates:[],decisions:[],committeeIds:[],optionDiscipline:.5};if(!state.investmentCommittee.committeeIds.length)state.investmentCommittee.committeeIds=(state.npcEmployees||[]).slice(0,4).map(e=>e.id);evaluateOptions()}
function scenarioEV(i){const probs=state.investmentCommittee.scenarios;return Object.entries(SCENARIOS).reduce((sum,[id,s])=>{const boost=s.themeBoost[i.theme]||1;const value=i.upsideM*boost*(1-i.risk)-i.costM;return sum+(probs[id]??s.prob)*value},0)}
function optionValue(i){const ev=scenarioEV(i),uncertainty=i.risk||.2,stage=state.investmentCommittee.gates[i.id]?.stage||0;return ev+Math.max(0,i.upsideM*uncertainty*.22)*(1-stage*.22)}
function evaluateOptions(){if(!state.investmentCommittee||!state.portfolioStrategy)return;const live=state.portfolioStrategy.initiatives.filter(i=>!['killed','completed'].includes(i.status));const staged=live.filter(i=>(state.investmentCommittee.gates[i.id]?.stage||0)>0).length;state.investmentCommittee.optionDiscipline=Math.max(0,Math.min(1,.42+(live.length?staged/live.length*.35:0)+(state.programLearning?.programMaturity||.45)*.2))}
function setScenarioProbability(id,pct){ensureInvestmentCommittee();if(!SCENARIOS[id])return;const v=Math.max(0,Math.min(.9,Number(pct)/100)),others=Object.keys(SCENARIOS).filter(x=>x!==id),remaining=1-v,old=others.reduce((n,x)=>n+state.investmentCommittee.scenarios[x],0)||1;state.investmentCommittee.scenarios[id]=v;for(const x of others)state.investmentCommittee.scenarios[x]=state.investmentCommittee.scenarios[x]/old*remaining;save();render()}
function gateInitiative(id,decision,options={}){
  if(!options.native)ensureInvestmentCommittee();
  const i=state.portfolioStrategy?.initiatives?.find(x=>x.id===id),ic=state.investmentCommittee;
  if(!i||!ic||['killed','completed'].includes(i.status)||!['fund','hold','stop'].includes(decision))return false;
  const current=ic.gates[id]||{stage:0,spentM:0,evidence:0},tranche=Math.max(.15,i.costM*.25);
  if(decision==='fund'&&(!Number.isFinite(tranche)||!Number.isFinite(state.cash)||state.cash<tranche*1e6||current.stage>=3))return false;
  const g=ic.gates[id] ||= current;
  if(decision==='fund'){state.cash-=tranche*1e6;g.stage++;g.spentM+=tranche;g.evidence=Math.min(1,g.evidence+.22+(state.programLearning?.programMaturity||.4)*.08);i.status='funded';i.fundedM=(i.fundedM||0)+tranche;i.progress=Math.min(100,i.progress+10+g.evidence*8);i.risk=Math.max(.05,i.risk-.025-g.evidence*.015)}
  else if(decision==='hold'){g.evidence=Math.min(1,g.evidence+.08);i.progress=Math.max(0,i.progress-2)}
  else if(decision==='stop'){i.status='killed';i.peopleAllocated=0;i.fundedM=0}
  ic.decisions.push({day:state.day||1,id,decision,stage:g.stage});evaluateOptions();
  if(!options.deferSave)save();if(!options.native)render();return true;
}

// P5.3.2: the committee owns typed request state and monetary mutation. Mail is a
// projection of this ledger, never an alternative source of approval authority.
const FUNDING_MAIL_TYPE='finance.funding-gate';
const fundingCopy=value=>JSON.parse(JSON.stringify(value));
function fundingSource(i){const ic=state.investmentCommittee,g=ic?.gates?.[i.id]||{};return JSON.stringify([i.id,i.key,i.createdDay,i.name,i.status,i.costM,i.fundedM||0,i.risk,i.upsideM,g.stage||0,g.spentM||0,g.evidence||0,(ic?.decisions||[]).filter(d=>d.id===i.id).length])}
function fundingMailRequest(id){return state.investmentCommittee?.mailRequests?.find(r=>r.id===id)||null}
function fundingMailStatus(id){
  const r=fundingMailRequest(id),i=state.portfolioStrategy?.initiatives?.find(i=>i.id===r?.initiativeId);
  if(!r||r.type!==FUNDING_MAIL_TYPE)return {available:false,reason:'request-missing',request:null,delegates:[]};
  const delegates=(state.npcEmployees||[]).filter(e=>state.investmentCommittee.committeeIds.includes(e.id)).map(e=>({id:e.id,name:e.name}));
  let reason=!i?'initiative-missing':['approved','rejected'].includes(r.status)?'already-decided':fundingSource(i)!==r.sourceVersion?'initiative-changed':null;
  const reviewer=r.delegateId?delegates.find(e=>e.id===r.delegateId):delegates[0];
  const followUpRecorded=r.audit.some(a=>a.action==='follow-up');
  const evidenceRecorded=r.audit.some(a=>a.action==='attach-evidence');
  return {available:!reason,reason,request:fundingCopy(r),delegates,canApprove:!reason&&Number.isFinite(state.cash)&&state.cash>=r.amountM*1e6,entityAvailable:!!i,canFollowUp:!reason&&!followUpRecorded&&!!reviewer,followUpRecorded,followUpReviewerId:reviewer?.id||null,canAttachEvidence:!reason&&!evidenceRecorded,evidenceRecorded};
}
// P5.3.4: historical records belong to Finance. Readers receive copies of the
// original audit entry and never regenerate evidence from a live initiative.
function fundingEvidenceSnapshot(requestId,evidenceId){
  const r=fundingMailRequest(requestId);
  const e=r?.type===FUNDING_MAIL_TYPE?r.audit.find(a=>a.action==='attach-evidence'&&a.evidence?.id===evidenceId)?.evidence:null;
  return e?.type==='finance.funding-evidence'&&e.requestId===requestId?fundingCopy(e):null;
}
function captureFundingEvidence(r){
  const ic=state.investmentCommittee,i=state.portfolioStrategy.initiatives.find(i=>i.id===r.initiativeId),g=ic.gates[i.id]||{stage:0,evidence:0,spentM:0};
  const initiative={id:i.id,name:i.name,theme:i.theme,status:i.status,costM:i.costM,fundedM:i.fundedM||0,risk:i.risk,upsideM:i.upsideM};
  const gate={stage:g.stage,spentM:g.spentM,evidence:g.evidence};
  const scenarios=Object.entries(SCENARIOS).map(([id,s])=>({id,name:s.name,probability:ic.scenarios[id]??s.prob,themeMultiplier:s.themeBoost[i.theme]||1}));
  const estimates={scenarioEV:scenarioEV(i),optionValue:optionValue(i)};
  const values=[r.amountM,r.expectedStage,i.costM,initiative.fundedM,i.risk,i.upsideM,...Object.values(gate),...Object.values(estimates),...scenarios.flatMap(s=>[s.probability,s.themeMultiplier])];
  if(!values.every(Number.isFinite)||scenarios.some(s=>s.probability<0||s.probability>1))return null;
  const revision=r.revision+1;
  return {schemaVersion:1,type:'finance.funding-evidence',id:'EVID-'+r.id+'-'+revision,requestId:r.id,requestRevision:revision,capturedDay:state.day||1,capturedAt:r.createdAt+revision,sourceVersion:r.sourceVersion,request:{amountM:r.amountM,expectedStage:r.expectedStage,status:r.status},initiative,gate,scenarios,estimates};
}
function fundingExplanation(request,reviewerId){
  const i=state.portfolioStrategy.initiatives.find(i=>i.id===request.initiativeId),reviewer=state.npcEmployees.find(e=>e.id===reviewerId);
  const gate=state.investmentCommittee.gates[i.id]||{stage:0,evidence:0,spentM:0};
  const inputs={amountM:request.amountM,stage:gate.stage,evidence:gate.evidence,risk:i.risk,upsideM:i.upsideM,costM:i.costM,scenarioEV:scenarioEV(i),optionValue:optionValue(i),stance:committeeStance(reviewer,i)};
  if(!Object.entries(inputs).every(([key,value])=>key==='stance'||Number.isFinite(value)))return null;
  const recommendation={fund:'fund the next tranche',hold:'hold for more evidence',stop:'stop further funding'}[inputs.stance];
  return {question:'What supports this funding gate, and what are the risks?',reviewerId:reviewer.id,reviewerName:reviewer.name,inputs,
    response:'For '+i.name+', gate '+(request.expectedStage+1)+' requests $'+request.amountM.toFixed(2)+'M. Evidence is '+Math.round(inputs.evidence*100)+'%; the initiative risk estimate is '+Math.round(inputs.risk*100)+'%. Under the current committee scenarios, expected net value is $'+inputs.scenarioEV.toFixed(2)+'M and staged option value is $'+inputs.optionValue.toFixed(2)+'M. My recommendation is to '+recommendation+'. These are simulation estimates, not guarantees. No funds moved; the founder still decides.'};
}
function createFundingMailRequest(initiativeId,at){
  const ic=state.investmentCommittee,i=state.portfolioStrategy?.initiatives?.find(i=>i.id===initiativeId);
  if(!ic||!i)return {ok:false,status:'initiative-missing'};
  const sourceVersion=fundingSource(i),existing=ic.mailRequests?.find(r=>r.type===FUNDING_MAIL_TYPE&&r.initiativeId===i.id&&r.sourceVersion===sourceVersion);
  if(existing)return {ok:true,status:'reused',request:fundingCopy(existing)};
  const stage=ic.gates?.[i.id]?.stage||0,amountM=Math.max(.15,i.costM*.25);
  if(['killed','completed'].includes(i.status)||stage>=3||!Number.isFinite(amountM)||i.costM<0)return {ok:false,status:'initiative-unavailable'};
  if(!Number.isSafeInteger(at)||at<=0)return {ok:false,status:'invalid-clock'};
  const id=`FUND-${at}-${i.id}-${stage}`;
  if(ic.mailRequests?.some(r=>r.id===id))return {ok:false,status:'request-id-conflict'};
  const request={id,type:FUNDING_MAIL_TYPE,initiativeId:i.id,initiativeName:i.name,expectedStage:stage,amountM,sourceVersion,createdAt:at,createdDay:state.day||1,status:'pending',revision:0,delegateId:null,audit:[{revision:0,action:'requested',actor:'player',delegateId:null,day:state.day||1,at}]};
  const previous=fundingCopy(ic);ic.version=IC_VERSION;ic.mailRequests ||= [];ic.mailRequests.push(request);
  try{save()}catch(error){state.investmentCommittee=previous;throw error}
  return {ok:true,status:'created',request:fundingCopy(request)};
}
function respondFundingMailRequest({requestId,action,expectedRevision,delegateId=null}={}){
  const r=fundingMailRequest(requestId);
  if(!r||r.type!==FUNDING_MAIL_TYPE)return {ok:false,status:'request-missing'};
  if(!['approve','reject','delegate','follow-up','attach-evidence'].includes(action)||!Number.isInteger(expectedRevision)||expectedRevision<0)return {ok:false,status:'invalid-response'};
  delegateId=action==='delegate'?String(delegateId||''):null;
  const prior=r.audit.find(a=>a.revision===expectedRevision+1);
  if(prior&&prior.action===action&&prior.delegateId===delegateId)return {ok:true,status:'reused',request:fundingCopy(r)};
  if(expectedRevision!==r.revision)return {ok:false,status:'revision-conflict'};
  const live=fundingMailStatus(requestId);
  if(!live.available)return {ok:false,status:live.reason};
  if(action==='approve'&&!live.canApprove)return {ok:false,status:'insufficient-cash'};
  if(action==='delegate'&&(!live.delegates.some(e=>e.id===delegateId)||delegateId===r.delegateId))return {ok:false,status:'invalid-delegate'};
  let followUp=null;
  if(action==='follow-up'){
    if(live.followUpRecorded)return {ok:false,status:'follow-up-already-recorded'};
    if(!live.followUpReviewerId)return {ok:false,status:'reviewer-unavailable'};
    try{followUp=fundingExplanation(r,live.followUpReviewerId)}catch(error){return {ok:false,status:'evidence-unavailable'}}
    if(!followUp)return {ok:false,status:'evidence-unavailable'};
  }
  let evidence=null;
  if(action==='attach-evidence'){
    if(live.evidenceRecorded)return {ok:false,status:'evidence-already-recorded'};
    try{evidence=captureFundingEvidence(r)}catch(error){return {ok:false,status:'evidence-unavailable'}}
    if(!evidence)return {ok:false,status:'evidence-unavailable'};
  }
  // One synchronous transaction saves the money, receipt and audit together. No
  // legacy render/ensure chain runs here: those chains advance portfolio progress.
  const previous={cash:state.cash,committee:fundingCopy(state.investmentCommittee),portfolio:fundingCopy(state.portfolioStrategy)};
  try{
    if(action==='approve'&&!gateInitiative(r.initiativeId,'fund',{native:true,deferSave:true}))return {ok:false,status:'funding-denied'};
    r.revision++;if(!['follow-up','attach-evidence'].includes(action))r.status=action==='approve'?'approved':action==='reject'?'rejected':'delegated';
    if(action==='delegate')r.delegateId=delegateId;
    r.audit.push({revision:r.revision,action,actor:'player',delegateId,delegateName:action==='delegate'?live.delegates.find(e=>e.id===delegateId).name:null,day:state.day||1,at:r.createdAt+r.revision,...(followUp?{followUp}:{}),...(evidence?{evidence}:{})});
    if(action==='approve')Object.assign(state.investmentCommittee.decisions.at(-1),{requestId:r.id,requestRevision:r.revision});
    save();return {ok:true,status:r.status,request:fundingCopy(r)};
  }catch(error){state.cash=previous.cash;state.investmentCommittee=previous.committee;state.portfolioStrategy=previous.portfolio;throw error}
}
function committeeStance(e,i){const skills=e.skills||{},technical=((skills.training||0)+(skills.evals||0))/20,operator=((skills.inference||0)+(skills.distributed||0))/20;const riskTolerance=((e.relationships?.autonomy||50)/100)*.45+technical*.35;const score=optionValue(i)/Math.max(1,i.costM*4)+riskTolerance-i.risk*(.8-operator*.25);return score>.75?'fund':score>.35?'hold':'stop'}
function runCommitteeDebate(id){ensureInvestmentCommittee();const i=state.portfolioStrategy.initiatives.find(x=>x.id===id);if(!i)return;const voices=state.investmentCommittee.committeeIds.map(npcById).filter(Boolean).map(e=>({employeeId:e.id,name:e.name,stance:committeeStance(e,i)}));const counts={fund:0,hold:0,stop:0};voices.forEach(v=>counts[v.stance]++);const recommendation=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];state.investmentCommittee.debates.unshift({day:state.day||1,id,voices,recommendation,ev:scenarioEV(i),option:optionValue(i)});state.investmentCommittee.debates=state.investmentCommittee.debates.slice(0,12);save();render()}
function committeeOpen(){ensureInvestmentCommittee();state.view='investmentCommittee';save();render()}
function committeeClose(){state.view='company';save();render()}
function renderInvestmentCommittee(){ensureInvestmentCommittee();const ic=state.investmentCommittee,items=state.portfolioStrategy.initiatives.filter(i=>!['completed'].includes(i.status));return `<div class="ic-shell"><header class="ic-head"><div><div class="eyebrow">PHASE 4D.23 · INVESTMENT COMMITTEE</div><h1>Scenarios, Option Value & Staged Funding</h1><p>Preserve upside under uncertainty by funding evidence in stages instead of committing the entire portfolio budget at once.</p></div><button onclick="committeeClose()">Return to company</button></header><section class="ic-summary"><div><span>Option discipline</span><b>${Math.round(ic.optionDiscipline*100)}%</b></div>${Object.entries(SCENARIOS).map(([id,s])=>`<div><span>${esc(s.name)}</span><b>${Math.round(ic.scenarios[id]*100)}%</b></div>`).join('')}</section><section class="ic-card"><h2>Scenario assumptions</h2><div class="ic-scenarios">${Object.entries(SCENARIOS).map(([id,s])=>`<label>${esc(s.name)}<input type="range" min="5" max="90" value="${Math.round(ic.scenarios[id]*100)}" onchange="setScenarioProbability('${id}',this.value)"><span>${Math.round(ic.scenarios[id]*100)}%</span></label>`).join('')}</div></section><section class="ic-card"><h2>Initiative gates</h2>${items.map(i=>{const g=ic.gates[i.id]||{stage:0,evidence:0,spentM:0};return `<div class="ic-row ${optionValue(i)<0?'risk':''}"><div><b>${esc(i.name)}</b><span>${i.id} · gate ${g.stage}/3 · evidence ${Math.round(g.evidence*100)}%</span><small>Scenario EV $${scenarioEV(i).toFixed(1)}M · option value $${optionValue(i).toFixed(1)}M · staged spend $${g.spentM.toFixed(1)}M</small></div><div><button onclick="runCommitteeDebate('${i.id}')">Debate</button>${i.status!=='killed'?`<button onclick="gateInitiative('${i.id}','fund')">Fund next gate</button><button onclick="gateInitiative('${i.id}','hold')">Hold</button><button onclick="gateInitiative('${i.id}','stop')">Stop</button>`:''}</div></div>`}).join('')||'<p>Propose initiatives in Portfolio Strategy first.</p>'}</section><section class="ic-card"><h2>Committee debates</h2>${ic.debates.map(d=>`<article><b>${esc(d.id)} · recommendation ${esc(d.recommendation)}</b><span>EV $${d.ev.toFixed(1)}M · option $${d.option.toFixed(1)}M</span><p>${d.voices.map(v=>`${esc(v.name.split(' ')[0])}: ${esc(v.stance)}`).join(' · ')}</p></article>`).join('')||'<p>No committee debate recorded yet.</p>'}</section></div>`}
const icBaseRender=render;render=function(){ensureInvestmentCommittee();if(state.view==='investmentCommittee'){document.getElementById('app').innerHTML=renderInvestmentCommittee();return}icBaseRender();if(!state.started)return;const shell=document.querySelector('.game-shell');if(!shell)return;const b=document.createElement('button');b.className='ic-launch';b.onclick=committeeOpen;b.innerHTML=`<span>INVESTMENT COMMITTEE</span><b>${Math.round(state.investmentCommittee.optionDiscipline*100)}% option discipline · ${state.investmentCommittee.decisions.length} gate decisions</b><small>Scenarios · staged funding · NPC debate →</small>`;shell.insertBefore(b,shell.children[1]||null)};render();
