const EXPLAIN={
  MFU:"Model FLOPs Utilization: achieved model math divided by the accelerator's theoretical peak. It is a rough end-to-end efficiency signal, not a substitute for profiling.",
  TP:"Tensor Parallelism: shard tensor operations inside a layer across devices. It reduces per-GPU parameter/activation memory but adds frequent collectives.",
  PP:"Pipeline Parallelism: split layers into stages. It lowers per-device model memory but introduces pipeline bubbles and scheduling complexity.",
  DP:"Data Parallelism: replicate the model (or sharded state) across workers and process different microbatches. Gradients are synchronized between replicas.",
  FSDP:"Fully Sharded Data Parallel: shard parameters, gradients, and optimizer state across data-parallel workers, trading communication for memory savings.",
  BF16:"bfloat16: 16-bit floating-point format with FP32-like exponent range. Common for training because it usually avoids the narrow exponent range of FP16.",
  FP8:"8-bit floating-point formats used on newer accelerators for selected matmuls. They can improve throughput but need scaling strategies and numerical care.",
  LR:"Learning rate: optimizer step size. Too high can destabilize training; too low can waste compute or underfit within a fixed token budget.",
  GRAD:"Gradient norm: magnitude of gradients before the optimizer step. Sudden spikes can indicate bad batches, instability, or numerical problems.",
  NCCL:"NVIDIA Collective Communications Library, commonly used for multi-GPU collectives such as all-reduce, all-gather, and reduce-scatter.",
  KV:"KV cache: cached attention keys/values from previous tokens during autoregressive decoding. It is often a dominant serving-memory cost at long context.",
  PPL:"Perplexity: exponentiated average negative log-likelihood. Lower is generally better on the same clean evaluation distribution, but it is not a complete capability measure.",
  CONTAM:"Benchmark contamination: benchmark examples or close variants appear in training data, inflating scores and weakening the validity of the evaluation.",
  DPO:"Direct Preference Optimization: a preference-learning objective that trains a policy from chosen/rejected pairs relative to a reference policy without an explicit reward-model RL loop.",
  SFT:"Supervised Fine-Tuning: train on curated prompt/response demonstrations to shape behavior after pretraining.",
  SPEC:"Speculative decoding: a smaller draft model proposes tokens and a target model verifies them, reducing target-model serial decoding work when acceptance is high.",
  TTFT:"Time To First Token: latency from request arrival until the first generated token. Prefill, queueing, routing, and batching strongly affect it.",
  ITL:"Inter-token latency: time between generated tokens after the first token. Decode kernels, batching, memory bandwidth, and KV-cache behavior matter.",
  ROPE:"Rotary Position Embedding: injects token-position information by rotating query/key dimensions. Long-context extension can require careful scaling/interpolation choices.",
  ZLOSS:"Router z-loss: an auxiliary MoE routing regularizer used to discourage excessively large router logits and improve numerical stability.",
  AUX:"MoE load-balancing auxiliary loss: encourages token routing to use experts more evenly, reducing expert collapse and capacity hotspots.",
  CHINCHILLA:"Compute-optimal scaling idea: for a fixed training-compute budget, model size and training tokens should be balanced rather than scaling parameters alone.",
  CHECKPOINT:"A saved snapshot of model/optimizer/training state used for recovery, evaluation, branching experiments, and reproducibility.",
  GRADACC:"Gradient accumulation: process multiple microbatches before an optimizer update to achieve a larger global batch without storing all activations simultaneously.",
  ALLREDUCE:"Collective operation that aggregates values across workers and returns the result to every participant; commonly used for replicated-gradient synchronization.",
  REDUCESCATTER:"Collective that reduces values and scatters shards of the result across workers; widely used by sharded data-parallel implementations.",
  ALLGATHER:"Collective that gathers shards from all workers so each participant obtains the combined tensor; common when materializing sharded parameters.",
  TENSORBOARD:"Dashboard style for tracking training metrics such as loss, LR, gradient norm, throughput, utilization, and evaluation curves over time.",
  CANARY:"A deliberately embedded marker or held-out probe used to detect memorization, leakage, or unintended data movement.",
  ECE:"Expected Calibration Error: bins predictions by confidence and compares confidence with empirical accuracy; useful but sensitive to binning and task formulation."
};

const ROLE_META={
  "Research Scientist":"Architecture, objectives, scaling laws, ablations, interpretability, and scientific judgment.",
  "Training Engineer":"Distributed training, numerical stability, throughput, checkpointing, observability, and run recovery.",
  "Data Engineer":"Corpus acquisition, filtering, deduplication, mixture design, provenance, contamination, and data quality systems.",
  "Post-Training Engineer":"SFT, preference optimization, reward modeling, RL, behavior shaping, and regression analysis.",
  "Evals Engineer":"Capability measurement, contamination controls, statistical validity, slice analysis, red teaming, and launch gates.",
  "Inference Engineer":"Serving architecture, kernels, quantization, batching, KV-cache systems, routing, and latency/cost optimization.",
  "Safety Engineer":"Threat modeling, misuse evals, safeguards, monitoring, model behavior risk, and release decisions.",
  "Model Product Engineer":"Tool use, agents, reliability, observability, UX, product evals, and production feedback loops.",
  "Full-Stack Frontier Engineer":"Own the full lifecycle from architecture and data through training, post-training, evals, safety, serving, and incidents."
};

const INCIDENTS=[
  {
    id:"nan_bad_shard",title:"Pretraining Run 1842: sudden NaNs at 38.7%",role:"Training Engineer",difficulty:"Principal",
    brief:"A 70B dense decoder has trained cleanly for 5.8T tokens. Within 14 optimizer steps, loss rises sharply, gradient norm explodes, then the run reaches NaN. Diagnose the primary trigger before burning another 3,000 H100-hours.",
    config:{model:"70B dense decoder",layers:"80",hidden:"8192",heads:"64",seq:"8192",tokens:"15T target",gpus:"2048 × H100 80GB",parallel:"TP=8, PP=4, DP=64",precision:"BF16 matmuls, FP32 optimizer",optimizer:"AdamW β1=.9 β2=.95 wd=.1",lr:"3.0e-4 peak, cosine decay",warmup:"2,000 steps",batch:"4.19M tokens/update",checkpoint:"every 500 steps"},
    telemetry:[
      ["step 441196","loss 1.923","grad_norm 0.81","MFU 51.6%","tokens/s 3.88M","overflow 0"],
      ["step 441197","loss 1.928","grad_norm 0.84","MFU 51.5%","tokens/s 3.87M","overflow 0"],
      ["step 441198","loss 2.741","grad_norm 7.94","MFU 51.5%","tokens/s 3.87M","overflow 0"],
      ["step 441199","loss 6.883","grad_norm 81.2","MFU 51.4%","tokens/s 3.86M","overflow 0"],
      ["step 441200","loss NaN","grad_norm NaN","MFU 50.9%","tokens/s 3.81M","overflow 1"]
    ],
    evidence:["Dataset worker logs: shard web_en_091778.parquet became active at step 441198.","A 256-example replay of the same shard reproduces a large activation spike in blocks 57–63.","NCCL timings and GPU clocks remain normal across the event.","Learning rate is already 2.21e-4 on cosine decay and has changed smoothly for thousands of steps."],
    choices:[
      {id:"lr",label:"Cut learning rate by 10× and resume from step 441000",why:"The LR is not showing a discontinuity and the failure reproduces on a specific data shard. Lowering LR could mask symptoms but does not isolate the trigger."},
      {id:"nccl",label:"Replace the slowest node and reinitialize NCCL communicators",why:"Communication telemetry is normal and throughput barely changes before NaN. This does not fit a straggler/collective failure."},
      {id:"data",label:"Quarantine the shard, bisect examples/tokens, add finite/activation guards, resume from a verified checkpoint",correct:true,why:"This matches the evidence: the failure starts exactly when the shard becomes active and is replayable. The production response should both remove the trigger and improve detection so a similar shard fails fast."},
      {id:"clip",label:"Raise gradient clipping from 1.0 to 10.0 to preserve signal",why:"That weakens a safety mechanism during an exploding-gradient event and does not address the reproducible shard-triggered activation pathology."}
    ],
    deep:"A senior response is not simply ‘bad data.’ You would preserve the offending batch, replay it deterministically, identify whether malformed tokenization / pathological repetition / extreme sequence statistics / a preprocessing bug caused the activation spike, compare against nearby checkpoints, verify optimizer state, then add validation and runtime guards."
  },
  {
    id:"mfu_collapse",title:"Scale-up regression: 8× GPUs, only 2.1× throughput",role:"Training Engineer",difficulty:"Staff",
    brief:"A 13B model moves from 256 to 2,048 H100s. Global batch is held constant. The run is stable but MFU collapses from 54% to 31%. Find the dominant systems mistake.",
    config:{model:"13B decoder",seq:"4096",gpus:"2048 × H100",parallel:"TP=8, PP=8, DP=32",batch:"2.0M tokens/update",microbatch:"1 sequence/GPU",precision:"BF16",network:"400 Gb/s fabric"},
    telemetry:[["256 GPUs","MFU 54%","step 1.22 s","all-reduce 74 ms"],["2048 GPUs","MFU 31%","step 2.31 s","PP bubble 38%"],["profile","compute kernels healthy","SM clocks nominal","network no packet loss"]],
    evidence:["Pipeline stages increased from 2 to 8 while microbatch count did not increase.","Profiler shows long stage-idle windows at the start and end of each optimizer step.","TP collective latency is within expected range."],
    choices:[
      {id:"bubble",label:"Increase microbatch count / tune pipeline schedule; reconsider PP degree",correct:true,why:"The profile directly shows pipeline bubble dominating. With too few microbatches relative to PP stages, GPUs spend substantial time idle."},
      {id:"tp",label:"Increase TP from 8 to 32",why:"More TP generally adds high-frequency communication and does not address the observed pipeline-idle pattern."},
      {id:"clock",label:"Force maximum GPU clocks",why:"Clocks are already nominal; this would not recover 23 points of MFU."},
      {id:"wd",label:"Lower AdamW weight decay",why:"Optimizer regularization does not explain device idle windows or systems throughput."}
    ],
    deep:"Real scaling work requires decomposing step time: forward/backward compute, collectives, pipeline bubble, optimizer, data loader, checkpointing, and synchronization. ‘More GPUs’ only helps if the parallelism strategy exposes enough useful work per device."
  },
  {
    id:"contamination",title:"Evals: benchmark jumps +14 points after data refresh",role:"Evals Engineer",difficulty:"Staff",
    brief:"A coding model’s score on an internal held-out benchmark jumps from 61% to 75% after a new pretraining mixture. Other coding evals improve 1–3 points. Determine whether this is capability or leakage.",
    config:{benchmark:"4,800 private coding tasks",metric:"pass@1",refresh:"pretraining data v43",control:"three public coding suites",sampling:"temperature 0.2"},
    telemetry:[["internal held-out","61 → 75","+14"],["control A","58 → 60","+2"],["control B","44 → 45","+1"],["control C","67 → 70","+3"]],
    evidence:["MinHash near-duplicate search finds 312 benchmark prompts with >0.85 similarity to training documents.","196 solutions have token-level spans matching scraped tutorial pages.","A temporally newer hidden set shows +2.4 points, not +14."],
    choices:[
      {id:"ship",label:"Treat +14 as genuine scaling gain and announce it",why:"The gain is inconsistent with controls and there is direct near-duplicate evidence."},
      {id:"leak",label:"Invalidate the contaminated slice, trace provenance, rebuild a clean temporal holdout, report both raw and decontaminated results",correct:true,why:"This preserves scientific validity and turns contamination into an auditable data/eval issue instead of hiding it."},
      {id:"temp",label:"Raise sampling temperature to 1.0 and rerun",why:"Sampling changes do not resolve train/test overlap."},
      {id:"more",label:"Increase benchmark size using nearby variants of the same tasks",why:"Variants can preserve leakage. You need provenance-aware clean examples, not merely more correlated examples."}
    ],
    deep:"A mature eval system tracks benchmark lineage, hashes/embeddings for contamination checks, temporal splits, canaries, exact and fuzzy matches, and uncertainty intervals. A benchmark score is evidence only when the measurement process is trustworthy."
  },
  {
    id:"serving",title:"Inference incident: p99 TTFT explodes under burst load",role:"Inference Engineer",difficulty:"Principal",
    brief:"A 70B assistant meets steady-state latency targets, but p99 time-to-first-token jumps from 1.8s to 11.4s during a 3× traffic burst while decode tokens/sec remains healthy. Fix the bottleneck without buying 3× hardware.",
    config:{model:"70B",serving:"continuous batching",quant:"FP8 weights/activations where supported",context:"up to 32k",gpu:"8×H100 replica",routing:"least-loaded replica",cache:"paged KV"},
    telemetry:[["steady","TTFT p99 1.8s","ITL p99 31ms","GPU util 72%"],["burst","TTFT p99 11.4s","ITL p99 35ms","GPU util 96%"],["queue","prefill queue 8.2s","decode queue 0.4s","KV eviction +7%"]],
    evidence:["Long-context requests enter the same batching pool as short interactive requests.","Prefill consumes large contiguous compute bursts and dominates queueing.","Decode latency changes only slightly."],
    choices:[
      {id:"route",label:"Separate/predict prefill cost, route long prompts to dedicated capacity, cap batch prefill tokens, and add admission control",correct:true,why:"The failure is prefill queueing. Cost-aware routing and scheduling protect interactive TTFT while keeping decode throughput high."},
      {id:"spec",label:"Only enable speculative decoding",why:"Speculative decoding primarily reduces decode serial work; the dominant latency here is queued prefill."},
      {id:"kv",label:"Disable paged KV cache",why:"That can worsen memory fragmentation/capacity and does not solve prefill scheduling."},
      {id:"temp",label:"Reduce generation temperature",why:"Sampling temperature has negligible impact on the observed prefill queue bottleneck."}
    ],
    deep:"Production inference is a queueing and resource-allocation problem. You often need separate treatment of prefill and decode, prompt-length-aware scheduling, SLO classes, KV-cache budgeting, backpressure, and load shedding—not just faster kernels."
  },
  {
    id:"posttrain",title:"Post-training regression: helpfulness rises, tool reliability falls",role:"Post-Training Engineer",difficulty:"Staff",
    brief:"A DPO run improves preference win-rate but tool-call exactness falls 9 points and refusal calibration worsens. Decide what to do before release.",
    config:{base:"SFT checkpoint 27",objective:"DPO β=0.1",pairs:"1.8M",epochs:"1",lr:"5e-7",evals:"helpfulness, tool exactness, safety slices"},
    telemetry:[["pairwise helpfulness","+6.2 pts"],["tool-call exact JSON","-9.0 pts"],["benign refusal rate","+4.1 pts"],["safety adversarial","+0.8 pts"]],
    evidence:["Preference data over-represents conversational style and under-represents tool trajectories.","KL divergence from reference is concentrated on structured-output tasks.","A lower-β pilot recovers ~5 tool points with half the helpfulness gain."],
    choices:[
      {id:"release",label:"Release because overall preference win-rate improved",why:"Aggregate win-rate hides regressions in critical product slices."},
      {id:"target",label:"Rebalance preference data, add tool/safety constraints or mixed objectives, run β/data ablations, gate on slice-specific regressions",correct:true,why:"Post-training should optimize a portfolio of behaviors and explicit launch gates, not one aggregate reward signal."},
      {id:"epochs",label:"Train for three more epochs",why:"This may amplify the same distributional skew and divergence."},
      {id:"ignore",label:"Ignore structured output because the base model can still produce JSON",why:"Measured reliability has materially fallen; downstream systems depend on exact contracts."}
    ],
    deep:"Real post-training work is multi-objective optimization under imperfect feedback. You need dataset audits, reference-policy drift analysis, slice-aware evals, ablations, and explicit tolerances for regressions."
  }
];

const PARALLEL_LAB={modelParams:70,gpus:2048,seq:8192,tp:8,pp:4,dp:64,micro:1,activationCheckpoint:true,precision:"BF16"};
let state=JSON.parse(localStorage.getItem("frontier-rpg-v2")||"null")||{role:"Full-Stack Frontier Engineer",xp:0,solved:{},selected:INCIDENTS[0].id,tab:"incident",parallel:{...PARALLEL_LAB},notes:[]};

function save(){localStorage.setItem("frontier-rpg-v2",JSON.stringify(state))}
function esc(s){return String(s).replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function tip(label,key){return `<button class="tip" type="button" data-tip="${esc(EXPLAIN[key]||key)}" aria-label="Explain ${esc(label)}">${label}<span>?</span></button>`}
function termify(s){return String(s).replace(/\bMFU\b/g,tip("MFU","MFU")).replace(/\bBF16\b/g,tip("BF16","BF16")).replace(/\bFP8\b/g,tip("FP8","FP8")).replace(/\bNCCL\b/g,tip("NCCL","NCCL")).replace(/\bDPO\b/g,tip("DPO","DPO")).replace(/\bSFT\b/g,tip("SFT","SFT")).replace(/\bTTFT\b/g,tip("TTFT","TTFT")).replace(/\bITL\b/g,tip("ITL","ITL")).replace(/\bKV\b/g,tip("KV","KV"))}
function current(){return INCIDENTS.find(x=>x.id===state.selected)||INCIDENTS[0]}
function solve(id,choice){const inc=INCIDENTS.find(x=>x.id===id);const c=inc.choices.find(x=>x.id===choice);state.solved[id]={choice,correct:!!c.correct};if(c.correct)state.xp+=100;else state.xp+=15;state.notes.unshift(`${inc.title}: ${c.correct?"correct diagnosis":"incorrect hypothesis"} — ${c.why}`);save();render()}
function setRole(r){state.role=r;save();render()}
function selectIncident(id){state.selected=id;state.tab="incident";save();render()}
function setTab(t){state.tab=t;save();render()}
function updateP(k,v){state.parallel[k]=["activationCheckpoint"].includes(k)?v:(isNaN(Number(v))?v:Number(v));save();renderParallel()}
function parallelMetrics(){
 const p=state.parallel,total=p.tp*p.pp*p.dp,paramsPerGpu=p.modelParams/p.tp/p.pp;
 const bytes=p.precision==="BF16"?2:1;
 const weights=paramsPerGpu*bytes;
 const grads=paramsPerGpu*2;
 const adam=paramsPerGpu*8/Math.max(1,p.dp/8);
 const acts=(p.seq/1024)*(p.modelParams/70)*14*(p.activationCheckpoint?.55:1)*Math.max(1,p.micro);
 const memory=weights+grads+adam+acts+8;
 const ppBubble=p.pp<=1?0:Math.min(80,100*(p.pp-1)/(Math.max(p.pp,p.micro*p.pp)+p.pp-1));
 const tpPenalty=Math.max(0,(p.tp-1)*2.1),dpPenalty=Math.max(0,Math.log2(Math.max(1,p.dp))*1.4);
 const estMfu=Math.max(12,Math.min(62,58-ppBubble*.35-tpPenalty-dpPenalty));
 return {total,paramsPerGpu,memory,ppBubble,estMfu,valid:total===p.gpus};
}
function renderParallel(){const host=document.getElementById("lab-body");if(!host)return;const p=state.parallel,m=parallelMetrics();host.innerHTML=`
 <div class="two-col"><div>
 <h2>Distributed training planner</h2><p class="lede">Configure a hypothetical ${p.modelParams}B decoder. The estimates are intentionally simplified, but the tradeoffs mirror real distributed-training design.</p>
 <div class="form-grid">
 ${numField("Model params (B)","modelParams",p.modelParams,"Total trainable parameter count.")}
 ${numField("GPU count","gpus",p.gpus,"Total accelerators allocated to the run.")}
 ${numField("Sequence length","seq",p.seq,EXPLAIN.ROPE)}
 ${numField("TP degree","tp",p.tp,EXPLAIN.TP)}
 ${numField("PP stages","pp",p.pp,EXPLAIN.PP)}
 ${numField("DP replicas","dp",p.dp,EXPLAIN.DP)}
 ${numField("Microbatches / stage","micro",p.micro,"More microbatches can reduce pipeline bubbles but may increase activation pressure and scheduler complexity.")}
 <label class="field"><span>Precision ${tip("?","BF16")}</span><select onchange="updateP('precision',this.value)"><option ${p.precision==="BF16"?"selected":""}>BF16</option><option ${p.precision==="FP8"?"selected":""}>FP8</option></select></label>
 </div><label class="check"><input type="checkbox" ${p.activationCheckpoint?"checked":""} onchange="updateP('activationCheckpoint',this.checked)"> Activation checkpointing <span class="mini">recompute activations during backward to save memory</span></label>
 </div><div class="panel inset"><h3>Derived plan</h3>
 ${metric("Parallel product",`${m.total} GPUs`,m.valid?"ok":"bad",`TP × PP × DP should match the allocated GPU count. Current allocation is ${p.gpus}.`)}
 ${metric("Params / GPU",`${m.paramsPerGpu.toFixed(2)}B`,"", "Approximate model-parameter shard before temporary gather buffers.")}
 ${metric("Estimated memory",`${m.memory.toFixed(1)} GB/GPU`,m.memory<78?"ok":"bad","Teaching estimate includes weights, gradients, optimizer state, activation allowance, and runtime overhead. Real planners need exact architecture and sharding semantics.")}
 ${metric("Pipeline bubble",`${m.ppBubble.toFixed(1)}%`,m.ppBubble<15?"ok":m.ppBubble<30?"warn":"bad",EXPLAIN.PP)}
 ${metric("Estimated MFU",`${m.estMfu.toFixed(1)}%`,m.estMfu>45?"ok":m.estMfu>30?"warn":"bad",EXPLAIN.MFU)}
 <div class="callout"><b>Reality check:</b> production planning also models topology, all-gather/reduce-scatter bytes, attention activation shape, optimizer sharding, recomputation granularity, dataloader throughput, checkpoint I/O, kernel availability, and failure domains.</div></div></div>`}
function numField(label,key,val,help){return `<label class="field"><span>${label} <button class="mini-tip" data-tip="${esc(help)}">?</button></span><input type="number" value="${val}" onchange="updateP('${key}',this.value)"></label>`}
function metric(name,value,cls,help){return `<div class="metric ${cls}"><div><b>${name}</b><button class="mini-tip" data-tip="${esc(help)}">?</button></div><span>${value}</span></div>`}
function incidentCard(i){const solved=state.solved[i.id];return `<button class="incident-link ${i.id===state.selected?"active":""}" onclick="selectIncident('${i.id}')"><span>${i.title}</span><small>${i.difficulty} · ${i.role}</small>${solved?`<b class="status ${solved.correct?"oktxt":"badtxt"}">${solved.correct?"✓ solved":"↻ review"}</b>`:""}</button>`}
function renderIncident(){const i=current(),result=state.solved[i.id];return `<div class="incident-head"><div><div class="eyebrow">${i.difficulty} scenario · ${i.role}</div><h2>${i.title}</h2><p class="lede">${termify(i.brief)}</p></div><div class="xpbox"><span>Technical XP</span><b>${state.xp}</b></div></div>
 <div class="section-title">Run configuration</div><div class="config-grid">${Object.entries(i.config).map(([k,v])=>`<div class="config"><span>${esc(k)}</span><b>${termify(v)}</b></div>`).join("")}</div>
 <div class="section-title">Telemetry</div><div class="terminal">${i.telemetry.map(row=>`<div>${row.map(x=>`<code>${termify(x)}</code>`).join("")}</div>`).join("")}</div>
 <div class="section-title">Evidence collected</div><div class="evidence">${i.evidence.map(x=>`<div>• ${termify(x)}</div>`).join("")}</div>
 <div class="section-title">Your production decision</div><div class="choices">${i.choices.map(c=>`<button class="choice ${result?.choice===c.id?(c.correct?"correct":"wrong"):""}" onclick="solve('${i.id}','${c.id}')"><span>${termify(c.label)}</span>${result?.choice===c.id?`<small>${termify(c.why)}</small>`:""}</button>`).join("")}</div>
 ${result?`<div class="postmortem ${result.correct?"success":"review"}"><h3>${result.correct?"Correct diagnosis":"Review the evidence"}</h3><p>${termify(i.choices.find(c=>c.id===result.choice).why)}</p><p><b>Staff/Principal depth:</b> ${termify(i.deep)}</p></div>`:""}`}
function renderGlossary(){return `<h2>Field glossary</h2><p class="lede">Every highlighted term in the simulator can be tapped. This glossary is the deeper reference layer.</p><div class="glossary">${Object.entries(EXPLAIN).map(([k,v])=>`<div><b>${k}</b><p>${v}</p></div>`).join("")}</div>`}
function render(){document.getElementById("app").innerHTML=`<div class="shell technical-shell">
 <header class="topbar"><div class="title"><h1>Frontier Model Engineering Simulator</h1><p>High-fidelity technical practice with built-in explainers. Diagnose failures, design distributed runs, evaluate model changes, and make production tradeoffs.</p></div><div class="badge">10/10 technical mode</div></header>
 <div class="role-strip"><label>Operating role</label><select onchange="setRole(this.value)">${Object.keys(ROLE_META).map(r=>`<option ${r===state.role?"selected":""}>${r}</option>`).join("")}</select><span>${ROLE_META[state.role]}</span></div>
 <nav class="tabs"><button class="${state.tab==='incident'?'active':''}" onclick="setTab('incident')">Incident console</button><button class="${state.tab==='parallel'?'active':''}" onclick="setTab('parallel')">Distributed planner</button><button class="${state.tab==='glossary'?'active':''}" onclick="setTab('glossary')">Explainers</button></nav>
 <div class="workspace"><aside class="incident-list"><h3>Technical missions</h3>${INCIDENTS.map(incidentCard).join("")}<div class="callout compact">Tip: tap any dotted technical term or <b>?</b> icon for an explanation. On desktop you can also hover.</div></aside><main class="panel" id="lab-body">${state.tab==='incident'?renderIncident():state.tab==='glossary'?renderGlossary():""}</main></div>
 </div>`;if(state.tab==='parallel')renderParallel();installTips()}
function installTips(){document.querySelectorAll("[data-tip]").forEach(el=>{el.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();document.querySelectorAll(".tip-open").forEach(x=>x!==el&&x.classList.remove("tip-open"));el.classList.toggle("tip-open")})});document.addEventListener("click",()=>document.querySelectorAll(".tip-open").forEach(x=>x.classList.remove("tip-open")),{once:true})}
render();
