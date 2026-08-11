const SOURCES={
  FSDP:{title:"PyTorch FSDP",url:"https://docs.pytorch.org/docs/stable/fsdp.html"},
  FP8:{title:"NVIDIA Transformer Engine FP8 Primer",url:"https://docs.nvidia.com/deeplearning/transformer-engine/user-guide/examples/fp8_primer.html"},
  DPO:{title:"Direct Preference Optimization",url:"https://arxiv.org/abs/2305.18290"},
  FLASH:{title:"FlashAttention",url:"https://arxiv.org/abs/2205.14135"},
  CHINCHILLA:{title:"Chinchilla Scaling Laws",url:"https://arxiv.org/abs/2203.15556"},
  VLLM:{title:"PagedAttention / vLLM",url:"https://arxiv.org/abs/2309.06180"}
};

const EXPLAIN={
  MFU:{q:"How much of theoretical accelerator math becomes useful model FLOPs. High GPU utilization does not necessarily mean high MFU.",e:"MFU divides estimated model FLOPs performed per second by accelerator peak throughput. Communication, bubbles, dataloading, idle time and recomputation can lower end-to-end efficiency.",d:"Treat MFU as a model-centric efficiency approximation. Precise accounting depends on the model FLOP convention and hardware peak chosen; profile kernels and collectives rather than optimizing MFU blindly."},
  TP:{q:"Split tensor operations inside each layer across GPUs.",e:"Tensor parallelism reduces per-GPU parameter/activation pressure, but adds frequent collectives inside transformer layers.",d:"TP works best when fast interconnects make frequent communication affordable. Excessive TP can make communication dominate useful compute."},
  PP:{q:"Put different layer ranges on different pipeline stages.",e:"Pipeline parallelism reduces per-device model memory but introduces idle pipeline bubbles unless enough microbatches keep stages occupied.",d:"The schedule, number of stages and number of microbatches determine bubble fraction. Interleaved schedules can reduce bubbles at extra complexity."},
  DP:{q:"Different replicas process different data, then synchronize training state.",e:"Classic data parallelism replicates the model; sharded variants distribute parameters, gradients and optimizer state.",d:"Communication typically happens around gradient synchronization. Global batch grows with the data-parallel degree unless microbatching/accumulation changes."},
  FSDP:{q:"Shard model training state across data-parallel workers.",e:"PyTorch FULL_SHARD shards parameters, gradients and optimizer states, materializing parameters when needed with collectives.",d:"FSDP trades memory for communication. Real designs tune wrapping, prefetch, mixed precision, device mesh and checkpoint strategy.",src:"FSDP"},
  BF16:{q:"16-bit float with FP32-like exponent range.",e:"BF16 is widely used for transformer training because it has a wide exponent range while using half the storage of FP32 values.",d:"Some operations and optimizer states still use higher precision; mixed-precision policy matters for stability."},
  FP8:{q:"8-bit floating point used selectively for faster tensor-core math on supported accelerators.",e:"Modern FP8 training uses formats such as E4M3/E5M2 plus scaling recipes. Not every operation is safe in FP8.",d:"NVIDIA Transformer Engine exposes delayed/current/block scaling strategies; realistic FP8 training is a mixed-precision system, not simply storing everything in eight bits.",src:"FP8"},
  DPO:{q:"Preference optimization using chosen/rejected responses and a reference policy.",e:"DPO turns preference learning into a classification-style objective rather than requiring a separate reward-model RL loop.",d:"The beta parameter controls the strength of the preference/reference tradeoff; implementations commonly describe larger beta as constraining deviation more strongly from the reference policy.",src:"DPO"},
  FLASH:{q:"Exact attention reorganized to reduce expensive GPU memory traffic.",e:"FlashAttention uses tiling and IO-aware computation to reduce reads/writes between HBM and on-chip memory while computing exact attention.",d:"Its key insight is IO complexity, not an approximation of attention. Faster attention can make longer contexts practically feasible.",src:"FLASH"},
  KV:{q:"Cached attention keys and values for tokens already processed during generation.",e:"KV cache prevents recomputing earlier attention states every decode step, but consumes substantial serving memory at long context.",d:"Paged KV systems improve memory management and batching; serving schedulers must balance cache capacity, prefill work and decode latency.",src:"VLLM"},
  TTFT:{q:"Time from request arrival until the first generated token.",e:"Queueing and prompt prefill often dominate TTFT. Decode speed can remain healthy while TTFT collapses.",d:"Production systems use prompt-length-aware routing, admission control, batching limits and sometimes disaggregated prefill/decode to protect latency SLOs."},
  GRAD:{q:"Magnitude of the gradients before an optimizer step.",e:"A sudden gradient-norm spike can flag pathological data, instability or numerical problems.",d:"Gradient clipping can limit update magnitude, but should not replace root-cause investigation when failures reproduce on specific batches."},
  CONTAM:{q:"Training data overlaps with evaluation examples or close variants.",e:"Contamination can inflate benchmark scores without representing genuine generalization.",d:"Strong eval systems use provenance, exact/fuzzy matching, temporal holdouts and decontaminated reporting."},
  FLOPS:{q:"Approximate arithmetic work required by training.",e:"A common dense-transformer teaching approximation is training FLOPs ≈ 6 × parameters × training tokens.",d:"This is useful for scaling intuition but omits architecture-specific details, embeddings, attention/context effects, sparsity, recomputation and hardware inefficiencies.",src:"CHINCHILLA"}
};

const TECH_TREE=[
  {id:"flash",name:"FlashAttention",cost:2,requires:[],effect:"Training throughput +8%",term:"FLASH"},
  {id:"fsdp",name:"FSDP",cost:2,requires:[],effect:"Large-model memory headroom +25%",term:"FSDP"},
  {id:"fp8",name:"FP8 Training",cost:3,requires:["flash"],effect:"Training throughput +14%",term:"FP8"},
  {id:"longctx",name:"Long Context",cost:3,requires:["flash"],effect:"Unlock 32K context experiments",term:"KV"},
  {id:"3d",name:"3D Parallelism",cost:4,requires:["fsdp"],effect:"Unlock 30B+ model tier",term:"PP"},
  {id:"moe",name:"Mixture of Experts",cost:6,requires:["3d","fp8"],effect:"Unlock sparse frontier model tier",term:"TP"}
];

const MODEL_TIERS=[
  {id:"350m",name:"350M Dense",paramsB:.35,minInfra:1,costM:.20,tokensB:12,rep:2},
  {id:"1b",name:"1.3B Dense",paramsB:1.3,minInfra:1,costM:.45,tokensB:35,rep:4},
  {id:"7b",name:"7B Dense",paramsB:7,minInfra:2,costM:1.8,tokensB:180,rep:9},
  {id:"30b",name:"30B Dense",paramsB:30,minInfra:3,costM:6.5,tokensB:650,rep:18,requires:"3d"},
  {id:"70b",name:"70B Dense",paramsB:70,minInfra:4,costM:14,tokensB:1500,rep:32,requires:"fp8"},
  {id:"moe",name:"8×22B MoE",paramsB:176,activeB:44,minInfra:5,costM:28,tokensB:3000,rep:55,requires:"moe"}
];

const ROLES=["Research Scientist","Training Engineer","Data Engineer","Post-Training Engineer","Evals Engineer","Inference Engineer","Safety Engineer","Model Product Engineer","Full-Stack Frontier Engineer"];

const INCIDENTS=[
  {id:"nan",role:"Training Engineer",title:"Run anomaly: gradient explosion",term:"GRAD",brief:"Loss is stable, then spikes and reaches NaN. The failure began exactly when a new data shard entered the loader.",tabs:{metrics:["loss 1.923 → 1.928 → 2.741 → 6.883 → NaN","grad_norm 0.81 → 0.84 → 7.94 → 81.2 → NaN","MFU 51.6% → 50.9%"],systems:["NCCL collective latency: normal","GPU clocks: nominal","worker heartbeat: healthy"],data:["shard web_en_091778 activated at failing step","256-example replay reproduces activation spike in blocks 57–63"]},choices:[
    ["lr","Cut LR 10× and resume","The trigger is reproducible on a specific shard; lowering LR may mask symptoms without isolating the cause."],
    ["data","Quarantine shard, bisect examples, add finite/activation guards, resume from verified checkpoint","Evidence localizes the trigger to the shard. Preserve/replay the bad batch, isolate preprocessing/content pathology, then harden validation.",true],
    ["nccl","Replace the slowest node","Communication telemetry does not fit the failure."],
    ["clip","Raise grad clipping from 1 to 10","That weakens a safety mechanism during an exploding-gradient event."]]},
  {id:"bubble",role:"Training Engineer",title:"Scale-up: 8× GPUs, only 2.1× throughput",term:"PP",brief:"The model is stable, but pipeline idle time reaches 38% after increasing PP stages from 2 to 8.",tabs:{metrics:["MFU 54% → 31%","PP bubble 38%","compute kernels healthy"],systems:["network packet loss: none","TP collectives: expected range","long idle windows at pipeline fill/drain"],data:["dataloader wait <1%","global batch held constant"]},choices:[
    ["mb","Increase microbatch count / tune schedule and reconsider PP degree","The profiler directly identifies bubble overhead; more useful in-flight microbatches or a different PP degree attacks the dominant idle time.",true],
    ["tp","Increase TP 8 → 32","More TP adds frequent communication and does not fix pipeline idle windows."],
    ["clock","Force maximum clocks","Clocks are already nominal."],
    ["wd","Lower weight decay","Optimizer regularization cannot explain pipeline idle time."]]},
  {id:"contam",role:"Evals Engineer",title:"Benchmark jumped +14 points",term:"CONTAM",brief:"A private coding benchmark improves 14 points after a data refresh while three controls improve only 1–3 points.",tabs:{metrics:["private holdout 61 → 75","control A +2","control B +1","newer temporal holdout +2.4"],systems:["evaluation harness unchanged","sampling configuration unchanged"],data:["312 prompts >0.85 MinHash similarity to training docs","196 solutions contain long matching spans from scraped tutorials"]},choices:[
    ["ship","Announce the +14 gain","The gain is inconsistent with controls and direct overlap evidence exists."],
    ["clean","Invalidate contaminated slice, trace provenance and rebuild a temporal holdout","This protects measurement validity and makes the contamination auditable rather than hiding it.",true],
    ["temp","Raise temperature","Sampling cannot repair train/test overlap."],
    ["variants","Add nearby variants of the same tasks","Variants can preserve leakage; provenance-aware clean tasks are needed."]]},
  {id:"ttft",role:"Inference Engineer",title:"p99 TTFT explodes under burst load",term:"TTFT",brief:"At 3× traffic, TTFT goes 1.8s → 11.4s while inter-token latency barely changes.",tabs:{metrics:["TTFT p99 11.4s","ITL p99 35ms vs 31ms steady","GPU utilization 96%"],systems:["prefill queue 8.2s","decode queue 0.4s","KV eviction +7%"],data:["long-context requests share pool with short interactive traffic","prefill consumes large contiguous compute bursts"]},choices:[
    ["route","Use prompt-cost-aware routing, prefill token caps, admission control and dedicated long-prompt capacity","The dominant problem is queued prefill; scheduling and routing can protect interactive TTFT without buying 3× hardware.",true],
    ["spec","Only enable speculative decoding","Speculation mainly targets decode work, not the dominant prefill queue."],
    ["kv","Disable paged KV","That can worsen memory management and does not solve prefill scheduling."],
    ["temp","Lower sampling temperature","Sampling temperature is unrelated to prefill queueing."]]},
  {id:"dpo",role:"Post-Training Engineer",title:"DPO: helpfulness up, tool reliability down",term:"DPO",brief:"Preference win-rate improves, but exact tool JSON falls 9 points and benign refusal rises 4.1 points.",tabs:{metrics:["helpfulness +6.2 pts","tool exactness -9.0 pts","benign refusal +4.1 pts"],systems:["training stable","no data-loader errors"],data:["preference pairs overrepresent conversational style","structured tool trajectories are underrepresented","higher-β pilot recovers ~5 tool points while preserving part of helpfulness gain"]},choices:[
    ["release","Release because aggregate preference win-rate improved","Critical product slices regressed despite the aggregate win."],
    ["target","Rebalance data, add tool/safety constraints, run beta/data ablations and gate on slice regressions","This treats preference optimization as a multi-objective product problem; the higher-beta pilot is consistent with stronger reference-policy constraint.",true],
    ["beta","Lower beta further","In standard DPO parameterizations, lower beta generally permits more deviation from the reference, which is opposite the observed recovery direction."],
    ["ignore","Ignore tool evals until serving","Serving cannot restore policy behavior lost during post-training."]]}
];

const defaultState=()=>({version:3,company:"Nova Frontier",prefix:"NOVA",day:1,cashM:2.4,compute:18000,reputation:0,research:0,infra:1,employees:5,role:"Full-Stack Frontier Engineer",tech:[],models:[],activeRun:null,runHistory:[],selectedIncident:null,incidentTab:"metrics",knowledge:{},feed:["You founded a frontier-model lab. Every model, failure and breakthrough now belongs to this company."],started:false});
let state=load();
function load(){try{const x=JSON.parse(localStorage.getItem("frontier-lab-v3"));return x&&x.version===3?x:defaultState()}catch{return defaultState()}}
function save(){localStorage.setItem("frontier-lab-v3",JSON.stringify(state))}
function esc(s){return String(s??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function fmt(n,d=1){return Number(n).toLocaleString(undefined,{maximumFractionDigits:d})}
function money(n){return `$${fmt(n,2)}M`}
function log(m){state.feed.unshift(m);state.feed=state.feed.slice(0,30)}
function nextModelName(){return `${state.prefix}-${state.models.length+1}`}
function hasTech(id){return state.tech.includes(id)}
function tierAvailable(t){return state.infra>=t.minInfra&&(!t.requires||hasTech(t.requires))}
function infraName(){return ["","Garage Lab","Colocation Suite","Private GPU Hall","Frontier Datacenter","Multi-Site Cluster","Hyperscale Campus"][state.infra]||"Frontier Campus"}

function foundLab(){
  const c=document.getElementById("companyName").value.trim(); const p=document.getElementById("modelPrefix").value.trim().toUpperCase().replace(/[^A-Z0-9-]/g,"").slice(0,10);
  if(c)state.company=c;if(p)state.prefix=p;state.started=true;save();render();
}
function switchRole(r){state.role=r;log(`Role switched to ${r}.`);save();render()}
function researchTech(id){const t=TECH_TREE.find(x=>x.id===id);if(!t||hasTech(id))return; if(!t.requires.every(hasTech)){log("Prerequisite research is not complete.");return} if(state.research<t.cost){log(`Need ${t.cost} research insight. Solve incidents or ship models to earn it.`);return} state.research-=t.cost;state.tech.push(id);log(`🔬 Breakthrough: ${t.name}. ${t.effect}`);save();render()}
function upgradeInfra(){const cost=[0,0,.8,2.5,7,18,40][state.infra+1];if(!cost)return;if(state.cashM<cost){log(`Infrastructure expansion requires ${money(cost)}.`);return}state.cashM-=cost;state.infra++;state.employees+=Math.round(state.infra*4);log(`🏗️ Expanded to ${infraName()}. New model tiers are now feasible.`);save();render()}
function trainingPhysics(t){
  const params=t.paramsB*1e9, tokens=t.tokensB*1e9;
  const flops=6*params*tokens;
  const gpuHours=Math.ceil(flops/(3.3e14*3600)); // teaching effective throughput, not peak hardware spec
  const techBoost=(hasTech("flash")?.08:0)+(hasTech("fp8")?.14:0)+(hasTech("3d")?.05:0);
  const adjusted=Math.ceil(gpuHours/(1+techBoost));
  const globalBatchTokens=Math.max(262144,Math.round((t.paramsB<2?262144:t.paramsB<10?1048576:4194304)/8192)*8192);
  const steps=Math.ceil(tokens/globalBatchTokens);
  const exactTokens=steps*globalBatchTokens;
  return {flops,gpuHours:adjusted,batch:globalBatchTokens,steps,tokens:exactTokens,techBoost};
}
function launchTier(id){
  if(state.activeRun){log("Finish the active run before starting another.");return}
  const t=MODEL_TIERS.find(x=>x.id===id);if(!t||!tierAvailable(t))return;
  const ph=trainingPhysics(t); const cash=t.costM;
  if(state.cashM<cash||state.compute<ph.gpuHours){log(`Insufficient resources. Need ${money(cash)} and ${fmt(ph.gpuHours,0)} simulated H100-hours.`);return}
  state.cashM-=cash;state.compute-=ph.gpuHours;
  state.activeRun={name:nextModelName(),tier:t.id,progress:0,phase:"validation",physics:ph,startedDay:state.day,loss:Math.max(2.1,5.8-Math.log10(t.paramsB+1)),incident:null};
  log(`🚀 ${state.activeRun.name} launch sequence started. ${fmt(ph.steps,0)} optimizer steps are derived from ${fmt(ph.tokens/1e9,1)}B tokens ÷ ${fmt(ph.batch/1e6,3)}M tokens/update.`);save();render();
}
function advanceRun(){
  const r=state.activeRun;if(!r)return;
  if(r.incident){state.selectedIncident=r.incident;render();return}
  const increments=[4,7,9,12];const inc=increments[Math.floor(Math.random()*increments.length)];r.progress=Math.min(100,r.progress+inc);state.day+=Math.max(1,Math.round(inc/3));r.phase=r.progress<8?"warmup":r.progress<90?"pretraining":"final evals";r.loss=Math.max(1.3,r.loss*(.965+Math.random()*.012));
  if(r.progress>25&&r.progress<88&&Math.random()<.24){const pool=INCIDENTS.filter(i=>state.role==="Full-Stack Frontier Engineer"||i.role===state.role||i.id==="nan");r.incident=(pool[Math.floor(Math.random()*pool.length)]||INCIDENTS[0]).id;state.selectedIncident=r.incident;log(`🔴 ${r.name}: engineering incident requires intervention.`)}
  if(r.progress>=100){completeRun();return}
  save();render();
}
function completeRun(){const r=state.activeRun,t=MODEL_TIERS.find(x=>x.id===r.tier);const model={name:r.name,tier:t.name,paramsB:t.paramsB,tokensB:r.physics.tokens/1e9,steps:r.physics.steps,batch:r.physics.batch,day:state.day,score:Math.round(42+Math.log10(t.paramsB+1)*18+state.tech.length*1.5),costM:t.costM,incidents:state.runHistory.filter(x=>x.run===r.name).length};state.models.push(model);state.reputation+=t.rep;state.research+=Math.max(1,Math.round(t.rep/5));state.cashM+=Math.max(.15,t.costM*.35);log(`🏆 ${model.name} shipped. Capability index ${model.score}. The model is now part of your permanent lineage.`);state.activeRun=null;save();render()}
function openIncident(id){state.selectedIncident=id;state.incidentTab="metrics";save();render()}
function inspectTab(tab){state.incidentTab=tab;save();render()}
function solveIncident(choiceId){const inc=INCIDENTS.find(i=>i.id===state.selectedIncident);if(!inc)return;const c=inc.choices.find(x=>x[0]===choiceId);const correct=!!c[3];state.knowledge[inc.term]=(state.knowledge[inc.term]||0)+(correct?2:1);log(`${correct?"✅":"⚠️"} ${inc.title}: ${c[2]}`);if(correct){state.research+=1;state.reputation+=2;if(state.activeRun&&state.activeRun.incident===inc.id){state.runHistory.push({run:state.activeRun.name,incident:inc.id,day:state.day});state.activeRun.incident=null}}else{state.day+=1;if(state.activeRun)state.activeRun.progress=Math.max(0,state.activeRun.progress-2)}state.selectedIncident=null;save();render()}
function resetGame(){if(confirm("Reset your entire Frontier Lab company and model lineage?")){localStorage.removeItem("frontier-lab-v3");state=defaultState();render()}}
function tooltip(term){const x=EXPLAIN[term];if(!x)return term;return `<button class="term" onclick="showExplain('${term}')">${term}<span>?</span></button>`}
function showExplain(term){const x=EXPLAIN[term];if(!x)return;const src=x.src?SOURCES[x.src]:null;document.getElementById("modalRoot").innerHTML=`<div class="modal-back" onclick="closeModal(event)"><div class="modal"><button class="x" onclick="document.getElementById('modalRoot').innerHTML=''">×</button><div class="eyebrow">TECHNICAL EXPLAINER</div><h2>${term}</h2><h3>Quick</h3><p>${x.q}</p><h3>Engineer</h3><p>${x.e}</p><h3>Deep dive</h3><p>${x.d}</p>${src?`<a class="source" href="${src.url}" target="_blank" rel="noopener">Primary source ↗ ${src.title}</a>`:""}</div></div>`}
function closeModal(e){if(e.target.classList.contains("modal-back"))document.getElementById("modalRoot").innerHTML=""}

function render(){const app=document.getElementById("app");if(!state.started){app.innerHTML=founderScreen();return}
 const r=state.activeRun; const tier=r?MODEL_TIERS.find(x=>x.id===r.tier):null; const ph=r?r.physics:null;
 app.innerHTML=`<div class="game-shell">
 <header class="hud"><div><div class="eyebrow">${esc(infraName())}</div><h1>${esc(state.company)}</h1><div class="sub">Model family <b>${esc(state.prefix)}</b> · Day ${state.day} · ${state.employees} people</div></div><div class="resource-strip"><div><span>Cash</span><b>${money(state.cashM)}</b></div><div><span>Compute</span><b>${fmt(state.compute,0)} H100h</b></div><div><span>Reputation</span><b>${state.reputation}</b></div><div><span>Insight</span><b>${state.research}</b></div></div></header>
 <nav class="rolebar">${ROLES.map(x=>`<button class="${state.role===x?"active":""}" onclick='switchRole(${JSON.stringify(x)})'>${x.replace(" Engineer","")}</button>`).join("")}</nav>
 <main class="world-grid">
   <section class="campus panel"><div class="panel-title"><div><div class="eyebrow">LIVE COMPANY</div><h2>${infraName()}</h2></div><button class="ghost" onclick="upgradeInfra()">Expand campus</button></div>${campusScene()}
   <div class="ticker"><span class="pulse"></span>${esc(state.feed[0]||"All systems nominal")}</div></section>
   <section class="run panel"><div class="panel-title"><div><div class="eyebrow">TRAINING OPERATIONS</div><h2>${r?esc(r.name):"No active training run"}</h2></div>${r?`<div class="status ${r.incident?"danger":"live"}">${r.incident?"INCIDENT":"LIVE"}</div>`:""}</div>
   ${r?runPanel(r,tier,ph):launchPanel()}</section>
   <section class="models panel"><div class="panel-title"><div><div class="eyebrow">MODEL LINEAGE</div><h2>Your models</h2></div><span class="counter">${state.models.length}</span></div>${lineage()}</section>
   <section class="tech panel"><div class="panel-title"><div><div class="eyebrow">RESEARCH TREE</div><h2>Technology</h2></div><span class="counter">${state.tech.length}/${TECH_TREE.length}</span></div>${techTree()}</section>
   <section class="career panel"><div class="panel-title"><div><div class="eyebrow">ENGINEERING MASTERY</div><h2>Your knowledge model</h2></div></div>${knowledgePanel()}</section>
   <section class="feedpanel panel"><div class="panel-title"><div><div class="eyebrow">LAB HISTORY</div><h2>Company log</h2></div><button class="ghost" onclick="resetGame()">Reset</button></div><div class="feed">${state.feed.map(x=>`<div>${esc(x)}</div>`).join("")}</div></section>
 </main></div><div id="modalRoot"></div>${state.selectedIncident?incidentOverlay():""}`;
}
function founderScreen(){return `<div class="founder"><div class="founder-card"><div class="logo-orbit"><i></i><i></i><i></i><b>F</b></div><div class="eyebrow">FRONTIER LAB · NEW COMPANY</div><h1>Build the model company you wish existed.</h1><p>You start with five people, a garage lab and a finite compute budget. Every model, failure, benchmark and infrastructure decision persists.</p><label>Company name<input id="companyName" value="Nova Frontier" /></label><label>Model family prefix<input id="modelPrefix" value="NOVA" maxlength="10" /></label><button class="primary huge" onclick="foundLab()">Found the lab →</button><div class="truth">Simulation values are derived where possible. Teaching approximations are labeled in explainers and linked to primary sources.</div></div></div>`}
function campusScene(){const racks=Math.min(14,2+state.infra*2);return `<div class="campus-scene infra-${state.infra}"><div class="sky-glow"></div><div class="building research-b"><span>RESEARCH</span><i></i><i></i><i></i></div><div class="building data-b"><span>DATA</span><i></i><i></i></div><div class="gpu-hall"><span>GPU HALL</span><div class="racks">${Array.from({length:racks},(_,i)=>`<i class="rack" style="--i:${i}"></i>`).join("")}</div></div><div class="network-line a"></div><div class="network-line b"></div><div class="satellite">◈</div>${state.activeRun?`<div class="data-flow">${Array.from({length:8},(_,i)=>`<i style="--i:${i}"></i>`).join("")}</div>`:""}</div>`}
function runPanel(r,t,ph){const currentStep=Math.floor(ph.steps*r.progress/100),tokens=currentStep*ph.batch;return `<div class="run-progress"><div class="progress-head"><b>${r.phase.toUpperCase()}</b><span>${r.progress}%</span></div><div class="bigbar"><i style="width:${r.progress}%"></i></div></div><div class="telemetry-grid"><div><span>Optimizer step</span><b>${fmt(currentStep,0)} / ${fmt(ph.steps,0)}</b></div><div><span>Tokens seen</span><b>${fmt(tokens/1e9,2)}B</b></div><div><span>Global batch</span><b>${fmt(ph.batch/1e6,3)}M tok</b></div><div><span>Train loss</span><b>${r.loss.toFixed(3)}</b></div><div><span>${tooltip("FLOPS")}</span><b>${ph.flops.toExponential(2)}</b></div><div><span>Compute charged</span><b>${fmt(ph.gpuHours,0)} H100h</b></div></div><div class="sparkline">${Array.from({length:28},(_,i)=>`<i style="height:${Math.max(8,78-i*2+Math.sin(i*1.6)*9)}%"></i>`).join("")}</div>${r.incident?`<button class="danger-btn" onclick="openIncident('${r.incident}')">🔴 Investigate engineering incident</button>`:`<button class="primary" onclick="advanceRun()">Advance training →</button>`}<p class="sim-note">Steps, tokens and global batch are linked mathematically: tokens seen = optimizer steps × global batch tokens. FLOPs uses the labeled dense-transformer teaching approximation.</p>`}
function launchPanel(){return `<p class="lead">Choose the next model in your lineage. Larger runs require infrastructure and research—not just cash.</p><div class="tier-grid">${MODEL_TIERS.map(t=>{const p=trainingPhysics(t),ok=tierAvailable(t);return `<button class="tier ${ok?"":"locked"}" ${ok?`onclick="launchTier('${t.id}')"`:"disabled"}><span>${t.name}</span><b>${fmt(t.paramsB,2)}B params</b><em>${fmt(p.tokens/1e9,0)}B tokens · ${fmt(p.gpuHours,0)} H100h</em><small>${ok?`${money(t.costM)} launch budget`:`Requires infra ${t.minInfra}${t.requires?` + ${t.requires}`:""}`}</small></button>`}).join("")}</div>`}
function lineage(){if(!state.models.length)return `<div class="empty-model"><div class="ghost-model">◇</div><p>Your first trained model will appear here permanently.</p></div>`;return `<div class="lineage">${state.models.map((m,i)=>`<div class="model-node"><div class="orb">${i+1}</div><div><b>${esc(m.name)}</b><span>${m.tier}</span><small>${fmt(m.tokensB,1)}B tokens · ${fmt(m.steps,0)} steps · score ${m.score}</small></div></div>`).join(`<div class="line"></div>`)}</div>`}
function techTree(){return `<div class="tech-tree">${TECH_TREE.map(t=>{const done=hasTech(t.id),ready=t.requires.every(hasTech);return `<button class="tech-node ${done?"done":ready?"ready":"locked"}" ${done||!ready?"disabled":`onclick="researchTech('${t.id}')"`}><div>${done?"✓":"◈"}</div><b>${t.name}</b><span>${t.effect}</span><small>${done?"Unlocked":ready?`${t.cost} insight`:"Requires "+t.requires.join(" + ")}</small><span class="tiny-term">${tooltip(t.term)}</span></button>`}).join("")}</div>`}
function knowledgePanel(){const keys=["GRAD","PP","CONTAM","TTFT","DPO","FSDP","FP8","FLASH"];return `<div class="knowledge">${keys.map(k=>{const v=Math.min(6,state.knowledge[k]||0);return `<div><button onclick="showExplain('${k}')">${k}</button><span>${Array.from({length:6},(_,i)=>`<i class="${i<v?"on":""}"></i>`).join("")}</span><em>${["Unseen","Seen","Explained","Applied","Diagnosed","Transferred","Mastered"][v]}</em></div>`}).join("")}</div>`}
function incidentOverlay(){const inc=INCIDENTS.find(x=>x.id===state.selectedIncident);if(!inc)return"";const items=inc.tabs[state.incidentTab]||[];return `<div class="incident-back"><div class="incident"><div class="incident-head"><div><div class="eyebrow">LIVE ENGINEERING INCIDENT · ${inc.role}</div><h2>${inc.title}</h2><p>${inc.brief}</p></div><div class="alarm">!</div></div><div class="inspect-tabs">${["metrics","systems","data"].map(t=>`<button class="${state.incidentTab===t?"active":""}" onclick="inspectTab('${t}')">${t}</button>`).join("")}</div><div class="evidence">${items.map(x=>`<div><span>›</span>${esc(x)}</div>`).join("")}</div><div class="decision"><div class="eyebrow">MAKE THE CALL</div><h3>What do you do?</h3>${inc.choices.map(c=>`<button onclick="solveIncident('${c[0]}')"><span>${esc(c[1])}</span><i>→</i></button>`).join("")}</div><div class="incident-tip">Need context? ${tooltip(inc.term)} opens a three-level technical explainer without giving away the incident.</div></div></div>`}
render();