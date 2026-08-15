// Phase 4A — Persistent Model Lab
// Adds versioned model records, lineage, experiments, checkpoints, eval history, and model dossiers.

const MODEL_LAB_VERSION=4;

function ensureModelLabState(){
  state.modelLab ||= {selectedModelId:null,tab:"overview",experiments:[],nextExperimentId:1};
  state.models ||= [];
  state.models.forEach((m,i)=>upgradeModelRecord(m,i));
}

function upgradeModelRecord(m,i=0){
  m.id ||= `model-${i+1}-${String(m.name||"model").toLowerCase().replace(/[^a-z0-9]+/g,"-")}`;
  m.generation ||= i+1;
  m.parentModelId ??= i>0 ? state.models[i-1]?.id||null : null;
  m.createdDay ||= m.day||state.day||1;
  m.architecture ||= architectureForTier(m.tier);
  m.training ||= {status:"completed",startedDay:m.startedDay||m.day||1,completedDay:m.day||state.day||1,config:{},history:[]};
  m.checkpoints ||= [];
  m.evals ||= [];
  m.experiments ||= [];
  m.postTraining ||= [];
  m.launches ||= [];
  m.incidents ||= [];
  m.costs ||= {trainingM:m.costM||0,simulatedH100h:m.gpuHours||0};
  m.capabilities ||= {};
  m.weaknesses ||= [];
  m.technicalDebt ||= [];
  m.discoveries ||= [];
  return m;
}

function architectureForTier(tierId){
  const t=MODEL_TIERS.find(x=>x.id===tierId)||{};
  const p=t.paramsB||0;
  return {type:t.id==="moe"?"Sparse MoE Transformer":"Dense Transformer",parametersB:p,activeParametersB:t.activeB||p,contextLength:hasTech("longctx")?32768:8192,precision:hasTech("fp8")?"FP8/BF16 mixed":"BF16 mixed",notes:[]};
}

function modelLabCaptureActiveRun(){
  if(!state.activeRun)return;
  const r=state.activeRun;
  r.modelId ||= `run-${String(r.name).toLowerCase().replace(/[^a-z0-9]+/g,"-")}-${r.startedDay||state.day}`;
  r.architecture ||= architectureForTier(r.tier);
  r.config ||= {globalBatchTokens:r.physics?.batch||null,steps:r.physics?.steps||null,tokens:r.physics?.tokens||null,parallelism:{tp:hasTech("3d")?8:1,pp:hasTech("3d")?4:1,dp:"auto"},precision:hasTech("fp8")?"FP8/BF16":"BF16"};
}

function modelLabBackfill(){
  ensureModelLabState();
  state.models.forEach((m,i)=>{
    upgradeModelRecord(m,i);
    if(!m.evals.length){
      const scale=Math.log10((m.architecture.parametersB||.35)+1);
      m.evals.push({day:m.createdDay,suite:"Frontier Capability Suite",scores:{reasoning:Math.round(48+scale*13),coding:Math.round(44+scale*15),math:Math.round(42+scale*14),toolUse:Math.round(46+scale*12),safety:Math.round(72+Math.min(12,scale*5))},note:"Historical baseline reconstructed during Phase 4A migration."});
    }
    if(!m.checkpoints.length)m.checkpoints.push({id:`${m.id}-final`,day:m.createdDay,label:"final",status:"verified",loss:m.loss??null});
  });
  modelLabCaptureActiveRun();
}

function modelLabOpen(){ensureModelLabState();modelLabBackfill();state.view="modelLab";save();render()}
function modelLabSelect(id){ensureModelLabState();state.modelLab.selectedModelId=id;state.view="modelLab";save();render()}
function modelLabTab(tab){state.modelLab.tab=tab;save();render()}
function modelLabClose(){state.view="company";save();render()}

function selectedLabModel(){
  ensureModelLabState();
  return state.models.find(m=>m.id===state.modelLab.selectedModelId)||state.models.at(-1)||null;
}

function modelLabStartExperiment(modelId,kind="throughput"){
  ensureModelLabState();
  const m=state.models.find(x=>x.id===modelId);if(!m)return;
  const templates={throughput:["Parallelism efficiency sweep","Can a lower pipeline degree improve useful throughput?","MFU / throughput"],context:["Long-context stability probe","Does the current recipe remain stable at longer sequence length?","loss / memory"],data:["Data mixture ablation","Does a higher code fraction improve coding without unacceptable regression elsewhere?","coding / reasoning"],precision:["Precision recipe ablation","Can lower precision improve throughput without destabilizing training?","throughput / stability"]};
  const t=templates[kind]||templates.throughput;
  const id=state.modelLab.nextExperimentId++;
  const e={id,modelId,day:state.day,title:t[0],question:t[1],metric:t[2],status:"planned",result:null,decision:null};
  state.modelLab.experiments.push(e);m.experiments.push(id);log(`🧪 Experiment #${id} planned for ${m.name}: ${e.title}.`);save();render();
}

function modelLabRunExperiment(id){
  const e=state.modelLab.experiments.find(x=>x.id===id);if(!e||e.status!=="planned")return;
  const m=state.models.find(x=>x.id===e.modelId);if(!m)return;
  const seed=(id*31+(m.generation||1)*17+(state.day||1))%100;
  e.status="complete";
  if(seed<62){e.result="Promising";e.observation="The variant improves the target metric while staying inside the current stability envelope.";e.delta=`+${4+(seed%9)}% target metric`;}
  else if(seed<84){e.result="Ambiguous";e.observation="The target improves, but a secondary metric regresses enough to require another controlled run.";e.delta=`+${3+(seed%5)}% target / tradeoff detected`;}
  else{e.result="Rejected";e.observation="The variant does not beat the control after accounting for instability and simulated compute cost.";e.delta=`-${2+(seed%6)}% adjusted value`;}
  e.completedDay=state.day;state.day++;log(`🔬 Experiment #${id}: ${e.result}. ${e.delta}.`);save();render();
}

function modelLabDecideExperiment(id,decision){
  const e=state.modelLab.experiments.find(x=>x.id===id);if(!e||e.status!=="complete")return;
  e.decision=decision;
  const m=state.models.find(x=>x.id===e.modelId);
  if(decision==="adopt"&&m){m.discoveries.push({day:state.day,experiment:id,text:`Adopted finding from ${e.title}: ${e.delta}.`});state.research++;}
  log(`Experiment #${id} decision: ${decision}.`);save();render();
}

function labScoreRows(scores={}){return Object.entries(scores).map(([k,v])=>`<div class="lab-score"><span>${esc(k.replace(/([A-Z])/g," $1"))}</span><b>${v}</b><i><em style="width:${Math.min(100,v)}%"></em></i></div>`).join("")}
function lineageChildren(id){return state.models.filter(m=>m.parentModelId===id)}
function lineageNode(m,depth=0){return `<div class="lineage-node" style="--depth:${depth}"><button onclick="modelLabSelect('${m.id}')"><span>${esc(m.name)}</span><small>${esc(m.architecture.type)} · ${fmt(m.architecture.parametersB,1)}B</small></button>${lineageChildren(m.id).map(c=>lineageNode(c,depth+1)).join("")}</div>`}

function modelLabOverview(m){
  const ev=m.evals.at(-1)||{};
  return `<div class="lab-grid"><section class="lab-panel lab-hero"><div class="eyebrow">MODEL DOSSIER</div><h2>${esc(m.name)}</h2><p>${esc(m.architecture.type)} · Generation ${m.generation}</p><div class="lab-kpis"><div><span>Parameters</span><b>${fmt(m.architecture.parametersB,1)}B</b></div><div><span>Context</span><b>${fmt(m.architecture.contextLength/1024,0)}K</b></div><div><span>Precision</span><b>${esc(m.architecture.precision)}</b></div><div><span>Created</span><b>Day ${m.createdDay}</b></div></div></section><section class="lab-panel"><div class="eyebrow">LATEST EVAL</div><h3>${esc(ev.suite||"No eval")}</h3>${labScoreRows(ev.scores)}</section><section class="lab-panel"><div class="eyebrow">MODEL MEMORY</div><h3>What this model has lived through</h3><div class="lab-memory"><span>${m.checkpoints.length} checkpoints</span><span>${m.experiments.length} experiments</span><span>${m.incidents.length} incidents</span><span>${m.discoveries.length} discoveries</span></div></section><section class="lab-panel"><div class="eyebrow">QUICK EXPERIMENT</div><h3>Ask the next engineering question</h3><div class="lab-actions"><button onclick="modelLabStartExperiment('${m.id}','throughput')">Parallelism sweep</button><button onclick="modelLabStartExperiment('${m.id}','data')">Data ablation</button><button onclick="modelLabStartExperiment('${m.id}','precision')">Precision recipe</button></div></section></div>`;
}

function modelLabExperiments(m){
  const es=state.modelLab.experiments.filter(e=>e.modelId===m.id).slice().reverse();
  return `<section class="lab-panel"><div class="eyebrow">EXPERIMENT NOTEBOOK</div><h2>${esc(m.name)} experiments</h2>${es.length?es.map(e=>`<article class="experiment-card"><header><div><span>#${e.id}</span><b>${esc(e.title)}</b></div><em class="${e.status}">${esc(e.status)}</em></header><p>${esc(e.question)}</p><small>Primary readout: ${esc(e.metric)}</small>${e.result?`<div class="experiment-result"><b>${esc(e.result)} · ${esc(e.delta)}</b><p>${esc(e.observation)}</p></div>`:""}<footer>${e.status==="planned"?`<button class="primary" onclick="modelLabRunExperiment(${e.id})">Run controlled experiment</button>`:!e.decision?`<button onclick="modelLabDecideExperiment(${e.id},'adopt')">Adopt finding</button><button onclick="modelLabDecideExperiment(${e.id},'follow-up')">Run follow-up later</button><button onclick="modelLabDecideExperiment(${e.id},'reject')">Reject</button>`:`Decision: <b>${esc(e.decision)}</b>`}</footer></article>`).join(""):`<div class="lab-empty">No experiments yet. Plan one from Overview.</div>`}</section>`;
}

function modelLabHistory(m){
  return `<div class="lab-grid"><section class="lab-panel"><div class="eyebrow">CHECKPOINT HISTORY</div><h3>Recovery points</h3>${m.checkpoints.map(c=>`<div class="history-row"><span>Day ${c.day}</span><b>${esc(c.label)}</b><em>${esc(c.status)}</em></div>`).join("")}</section><section class="lab-panel"><div class="eyebrow">DISCOVERIES</div><h3>Permanent knowledge</h3>${m.discoveries.length?m.discoveries.map(d=>`<div class="history-row"><span>Day ${d.day}</span><b>${esc(d.text)}</b></div>`).join(""):`<div class="lab-empty">No discoveries recorded yet.</div>`}</section><section class="lab-panel wide"><div class="eyebrow">EVALUATION HISTORY</div>${m.evals.map(e=>`<div class="eval-history"><header><b>${esc(e.suite)}</b><span>Day ${e.day}</span></header>${labScoreRows(e.scores)}<small>${esc(e.note||"")}</small></div>`).join("")}</section></div>`;
}

function modelLabLineage(){
  const roots=state.models.filter(m=>!m.parentModelId||!state.models.some(x=>x.id===m.parentModelId));
  return `<section class="lab-panel"><div class="eyebrow">MODEL LINEAGE</div><h2>${esc(state.company)} model family</h2><p class="lab-copy">Every shipped model remains part of company history. Future descendants inherit the technical story rather than replacing it.</p><div class="lineage-tree">${roots.length?roots.map(r=>lineageNode(r)).join(""):`<div class="lab-empty">Train your first model to begin the lineage.</div>`}</div></section>`;
}

function renderModelLab(){
  modelLabBackfill();
  const m=selectedLabModel();
  const tabs=[["overview","Overview"],["experiments","Experiments"],["history","History"],["lineage","Lineage"]];
  return `<div class="model-lab-shell"><header class="model-lab-head"><div><div class="eyebrow">PHASE 4A · PERSISTENT MODEL LAB</div><h1>Model Lab</h1><p>Your models are permanent engineering artifacts: lineage, experiments, evals, checkpoints and discoveries.</p></div><button onclick="modelLabClose()">Return to company</button></header>${state.models.length?`<div class="model-strip">${state.models.map(x=>`<button class="${m?.id===x.id?"active":""}" onclick="modelLabSelect('${x.id}')"><b>${esc(x.name)}</b><span>${fmt(x.architecture.parametersB,1)}B · Gen ${x.generation}</span></button>`).join("")}</div>`:""}<nav class="lab-tabs">${tabs.map(t=>`<button class="${state.modelLab.tab===t[0]?"active":""}" onclick="modelLabTab('${t[0]}')">${t[1]}</button>`).join("")}</nav><main class="lab-content">${!m&&state.modelLab.tab!=="lineage"?`<section class="lab-panel lab-empty"><h2>No models yet</h2><p>Return to the company and launch your first training run. Its complete engineering history will appear here.</p></section>`:state.modelLab.tab==="experiments"?modelLabExperiments(m):state.modelLab.tab==="history"?modelLabHistory(m):state.modelLab.tab==="lineage"?modelLabLineage():modelLabOverview(m)}</main></div>`;
}

// Wrap the existing renderer without replacing its simulation logic.
const modelLabBaseRender=render;
render=function(){
  ensureModelLabState();
  modelLabCaptureActiveRun();
  if(state.view==="modelLab"){
    document.getElementById("app").innerHTML=renderModelLab();
    return;
  }
  modelLabBaseRender();
  if(!state.started)return;
  const shell=document.querySelector(".game-shell");if(!shell)return;
  const btn=document.createElement("button");btn.className="model-lab-launch";btn.onclick=modelLabOpen;btn.innerHTML=`<span>MODEL LAB</span><b>${state.models.length} persistent model${state.models.length===1?"":"s"}</b><small>Lineage · experiments · evals · checkpoints →</small>`;
  shell.insertBefore(btn,shell.children[1]||null);
};

render();
