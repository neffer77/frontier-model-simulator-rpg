// Frontier Lab V3 — Engineering Workstation
// Loaded after frontier-lab.js and economy.js. Replaces the incident quiz overlay
// with an investigative debugging loop while preserving company/training systems.

const WORKSTATION_CASES={
  nan:{
    title:"Run 1842 / numerical instability",
    summary:"Loss diverged and the run halted. Find the primary trigger before resuming expensive pretraining.",
    decisive:["metrics","data"],
    correctHypothesis:"data_pathology",
    correctAction:"data",
    hypotheses:[
      ["lr_instability","Optimizer / learning-rate instability"],
      ["data_pathology","Pathological data or preprocessing output"],
      ["collective_fault","Distributed communication fault"],
      ["hardware_fault","GPU / node hardware failure"]
    ],
    tools:{
      metrics:{cost:0,minutes:1,signal:true,title:"TensorBoard",lines:["loss 1.923 → 1.928 → 2.741 → 6.883 → NaN","grad_norm 0.81 → 0.84 → 7.94 → 81.2 → NaN","MFU remains ~51% until failure"]},
      profiler:{cost:2,minutes:3,title:"Profiler",lines:["activation magnitude jumps sharply in blocks 57–63","kernel timing remains otherwise stable"]},
      gpu:{cost:1,minutes:2,title:"GPU Fleet",lines:["2,048 / 2,048 workers healthy","SM clocks nominal","no ECC spike around failing step"]},
      nccl:{cost:1,minutes:2,title:"NCCL",lines:["collective latency stays inside baseline band","no rank timeout or topology change"]},
      data:{cost:12,minutes:4,signal:true,title:"Data Pipeline + Replay",lines:["web_en_091778 becomes active at the first bad step","256-example replay reproduces the activation spike","neighboring shard web_en_091777 does not reproduce"]},
      checkpoint:{cost:1,minutes:2,title:"Checkpoints",lines:["step_440500 checksum valid","optimizer state loads cleanly","replay from checkpoint is deterministic"]},
      config:{cost:0,minutes:1,title:"Training Config",lines:["AdamW β1=.9 β2=.95 wd=.1","learning rate is smoothly decaying; no schedule discontinuity","grad clipping = 1.0"]}
    }
  },
  bubble:{
    title:"Scale-up / throughput collapse",
    summary:"Eight times the GPUs produced only 2.1× throughput. Identify the dominant systems bottleneck.",
    decisive:["metrics","profiler"],
    correctHypothesis:"pipeline_bubble",
    correctAction:"mb",
    hypotheses:[
      ["pipeline_bubble","Pipeline bubble / insufficient in-flight microbatches"],
      ["tp_collective","Tensor-parallel collective saturation"],
      ["dataloader","Input pipeline starvation"],
      ["gpu_clocks","GPU clocks / thermal throttling"]
    ],
    tools:{
      metrics:{cost:0,minutes:1,signal:true,title:"TensorBoard",lines:["MFU 54% → 31%","step time 1.22s → 2.31s","global batch unchanged"]},
      profiler:{cost:4,minutes:4,signal:true,title:"Distributed Profiler",lines:["pipeline idle / bubble = 38%","long fill/drain idle windows repeat every optimizer step","compute kernels are healthy while active"]},
      gpu:{cost:1,minutes:2,title:"GPU Fleet",lines:["GPU clocks nominal","thermals inside normal range","utilization oscillates with pipeline stage idle periods"]},
      nccl:{cost:2,minutes:3,title:"NCCL",lines:["TP collective latency within expected range","fabric packet loss: none"]},
      data:{cost:0,minutes:2,title:"Input Pipeline",lines:["dataloader wait <1%","prefetch queues remain populated"]},
      checkpoint:{cost:0,minutes:1,title:"Checkpoints",lines:["checkpointing is disabled inside profiled window"]},
      config:{cost:0,minutes:1,title:"Parallelism Config",lines:["PP stages: 2 → 8","microbatch count did not increase","TP=8; global batch held constant"]}
    }
  },
  contam:{
    title:"Evaluation anomaly / +14 points",
    summary:"A private benchmark jumped dramatically after a data refresh. Determine whether the gain is real capability.",
    decisive:["metrics","data"],
    correctHypothesis:"contamination",
    correctAction:"clean",
    hypotheses:[
      ["capability","Genuine capability improvement"],
      ["contamination","Train/eval contamination or leakage"],
      ["sampling","Sampling configuration artifact"],
      ["harness","Evaluation harness regression"]
    ],
    tools:{
      metrics:{cost:0,minutes:1,signal:true,title:"Eval Dashboard",lines:["private holdout: 61 → 75 (+14)","controls: +2 / +1 / +3","newer temporal holdout: +2.4"]},
      profiler:{cost:0,minutes:2,title:"Eval Trace",lines:["generation lengths and stop reasons unchanged","no timeout-rate shift"]},
      gpu:{cost:0,minutes:1,title:"Serving Fleet",lines:["identical inference image and hardware used for before/after evals"]},
      nccl:{cost:0,minutes:1,title:"Distributed Runtime",lines:["not material to this single-replica eval path"]},
      data:{cost:6,minutes:4,signal:true,title:"Provenance + Similarity Search",lines:["312 prompts have >0.85 MinHash similarity to training documents","196 solutions contain long matching spans from scraped tutorials","overlap entered in data refresh v43"]},
      checkpoint:{cost:0,minutes:1,title:"Model Checkpoints",lines:["same evaluation harness reproduces the score jump across two v43 checkpoints"]},
      config:{cost:0,minutes:1,title:"Eval Config",lines:["temperature 0.2 unchanged","prompt template and pass@1 calculation unchanged"]}
    }
  },
  ttft:{
    title:"Serving incident / p99 TTFT",
    summary:"Burst traffic sends time-to-first-token to 11.4s while decode latency barely changes.",
    decisive:["metrics","profiler"],
    correctHypothesis:"prefill_queue",
    correctAction:"route",
    hypotheses:[
      ["prefill_queue","Prefill queue / scheduling contention"],
      ["decode_kernel","Decode kernel regression"],
      ["kv_fragmentation","KV-cache fragmentation is primary"],
      ["sampling","Sampling overhead"]
    ],
    tools:{
      metrics:{cost:0,minutes:1,signal:true,title:"Serving Dashboard",lines:["TTFT p99: 1.8s → 11.4s","ITL p99: 31ms → 35ms","GPU utilization: 72% → 96%"]},
      profiler:{cost:2,minutes:3,signal:true,title:"Queue + Prefill Profiler",lines:["prefill queue = 8.2s","decode queue = 0.4s","long prompts monopolize large contiguous prefill bursts"]},
      gpu:{cost:1,minutes:2,title:"GPU Fleet",lines:["decode kernels remain near steady-state throughput","burst utilization increase is dominated by prefill work"]},
      nccl:{cost:1,minutes:2,title:"Interconnect",lines:["no replica communication anomaly detected"]},
      data:{cost:0,minutes:2,title:"Traffic Shape",lines:["long-context requests share the same pool as short interactive prompts","burst mix has 2.7× more >16K-token prompts"]},
      checkpoint:{cost:0,minutes:1,title:"Deployment",lines:["same model artifact before and during burst"]},
      config:{cost:0,minutes:1,title:"Scheduler Config",lines:["continuous batching enabled","no prefill-token cap","least-loaded routing ignores prompt cost"]}
    }
  },
  dpo:{
    title:"Post-training regression / tool reliability",
    summary:"Preference win-rate improved, but structured tool output and refusal calibration regressed.",
    decisive:["metrics","data","config"],
    correctHypothesis:"objective_data",
    correctAction:"target",
    hypotheses:[
      ["objective_data","Preference-data / objective tradeoff shifted behavior"],
      ["serving","Serving stack corrupted structured output"],
      ["loader","Training dataloader malfunction"],
      ["eval_noise","All regressions are eval noise"]
    ],
    tools:{
      metrics:{cost:0,minutes:1,signal:true,title:"Post-training Evals",lines:["helpfulness +6.2 pts","tool exactness -9.0 pts","benign refusal +4.1 pts","adversarial safety +0.8 pts"]},
      profiler:{cost:1,minutes:2,title:"Training Trace",lines:["loss is smooth","no numerical instability or optimizer spike"]},
      gpu:{cost:0,minutes:1,title:"GPU Fleet",lines:["training hardware healthy; no worker loss"]},
      nccl:{cost:0,minutes:1,title:"Distributed Runtime",lines:["collective timing normal throughout run"]},
      data:{cost:4,minutes:3,signal:true,title:"Preference Dataset",lines:["conversation/style pairs are overrepresented","structured tool trajectories are underrepresented","safety slices have limited coverage"]},
      checkpoint:{cost:1,minutes:2,title:"Checkpoint Comparison",lines:["behavior shift appears after DPO, not in SFT checkpoint 27","higher-β pilot recovers ~5 tool points"]},
      config:{cost:0,minutes:1,signal:true,title:"DPO Config",lines:["β=0.1","1.8M pairs, 1 epoch, lr=5e-7","higher-β pilot constrains drift more strongly"]}
    }
  }
};

const WORKSTATION_TOOLS=[
  ["metrics","▥","Metrics"],["profiler","⌁","Profiler"],["gpu","▦","GPU Fleet"],["nccl","⇄","NCCL"],
  ["data","◫","Data"],["checkpoint","◇","Checkpoint"],["config","{ }","Config"],["terminal",">_","Terminal"]
];

function wsJuice(kind,message){
  try{
    document.body.classList.remove("signal-flash","success-flash");
    void document.body.offsetWidth;
    document.body.classList.add(kind==="success"?"success-flash":"signal-flash");
    setTimeout(()=>document.body.classList.remove("signal-flash","success-flash"),650);
    const old=document.querySelector(".ws-toast");if(old)old.remove();
    const toast=document.createElement("div");toast.className=`ws-toast ${kind}`;toast.textContent=message;document.body.appendChild(toast);setTimeout(()=>toast.remove(),1500);
    if(navigator.vibrate)navigator.vibrate(kind==="success"?[24,30,45]:20);
    const AC=window.AudioContext||window.webkitAudioContext;
    if(AC){const ac=new AC(),o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.frequency.value=kind==="success"?660:520;g.gain.setValueAtTime(.025,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.12);o.start();o.stop(ac.currentTime+.13);}
  }catch(e){}
}

function ensureWorkstation(){
  if(!state.workstation) state.workstation=null;
  if(!state.diagnosticMastery) state.diagnosticMastery={};
  if(typeof ensureProblemQualityState==='function')ensureProblemQualityState();
}

function newWorkstation(id){
  return {incidentId:id,tool:"metrics",investigated:[],evidence:[],minutes:0,computeSpent:0,falseMoves:0,hints:0,hypothesis:null,terminalOutput:["Frontier Lab diagnostic shell. Type 'help' for commands."],resolved:false,debrief:null};
}

const _legacyOpenIncident=openIncident;
openIncident=function(id){
  ensureWorkstation();
  state.selectedIncident=id;
  if(!state.workstation||state.workstation.incidentId!==id||state.workstation.resolved) state.workstation=newWorkstation(id);
  save();render();
};

function wsCase(){return WORKSTATION_CASES[state.selectedIncident]||null}
function ws(){ensureWorkstation();return state.workstation}

function inspectWorkstationTool(tool){
  const w=ws(),c=wsCase(); if(!w||!c)return;
  w.tool=tool;
  if(tool==="terminal"){save();render();return}
  const spec=c.tools[tool]; if(!spec)return;
  if(!w.investigated.includes(tool)){
    if(spec.cost>0&&state.compute<spec.cost){log(`Need ${spec.cost} H100h to run ${spec.title}.`);save();render();return}
    state.compute-=spec.cost;
    w.computeSpent+=spec.cost;
    w.minutes+=spec.minutes;
    w.investigated.push(tool);
    spec.lines.forEach(line=>w.evidence.push({tool,title:spec.title,text:line,signal:!!spec.signal}));
    log(`${spec.signal?"✨ SIGNAL":"🔎"} ${spec.title}: investigation complete${spec.cost?` (-${spec.cost} H100h)`:""}.`);if(spec.signal)setTimeout(()=>wsJuice("signal","SIGNAL FOUND · "+spec.title),0);
  }
  save();render();
}

function takeWorkstationHint(){
  const w=ws(),c=wsCase(); if(!w||!c)return;
  w.hints++;
  const unseen=c.decisive.find(t=>!w.investigated.includes(t));
  w.terminalOutput.push(unseen?`HINT: A senior engineer suggests checking ${unseen.toUpperCase()} next.`:"HINT: You have the decisive evidence. Commit a hypothesis and make the call.");
  w.tool="terminal";
  save();render();
}

function commitWorkstationHypothesis(id){const w=ws();if(!w)return;w.hypothesis=id;w.minutes+=1;save();render()}

function diagnosticGrade(c,w,correctHypothesis){
  const extra=Math.max(0,w.investigated.length-c.decisive.length);
  if(w.hints===0&&w.falseMoves===0&&correctHypothesis&&extra<=1)return"S";
  if(w.falseMoves===0&&correctHypothesis&&extra<=3)return"A";
  if(w.falseMoves<=1)return"B";
  return"C";
}

function executeWorkstationAction(actionId){
  const w=ws(),c=wsCase(),inc=INCIDENTS.find(i=>i.id===state.selectedIncident);if(!w||!c||!inc)return;
  const choice=inc.choices.find(x=>x[0]===actionId);if(!choice)return;
  const correctAction=actionId===c.correctAction;
  const correctHypothesis=w.hypothesis===c.correctHypothesis;
  if(!correctAction){
    w.falseMoves++;w.minutes+=4;state.day++;if(state.activeRun)state.activeRun.progress=Math.max(0,state.activeRun.progress-1);
    w.terminalOutput.push(`ACTION REJECTED: ${choice[2]}`);
    if(typeof recordProblemQualityFailure==='function')recordProblemQualityFailure(inc,w);
    log(`⚠️ ${inc.title}: production action did not address the dominant cause. Incorrect attempts do not grant mastery or resources.`);save();render();return;
  }
  const grade=diagnosticGrade(c,w,correctHypothesis);
  const baseMastery={S:3,A:2,B:2,C:1}[grade];
  const quality=typeof problemQualityPreview==='function'?problemQualityPreview(inc,c,w,grade):{multiplier:1,protectedSolve:false,reasons:[]};
  const rewards=typeof problemQualityRewards==='function'?problemQualityRewards(baseMastery,grade,quality):{mastery:baseMastery,research:grade==='S'?2:1,reputation:grade==='S'?3:grade==='A'?2:1};
  state.knowledge[inc.term]=(state.knowledge[inc.term]||0)+rewards.mastery;
  state.diagnosticMastery[inc.term]=(state.diagnosticMastery[inc.term]||0)+rewards.mastery;
  state.research+=rewards.research;
  state.reputation+=rewards.reputation;
  if(typeof recordProblemQualitySolve==='function')recordProblemQualitySolve(inc,w,grade,quality,rewards);
  if(state.activeRun&&state.activeRun.incident===inc.id){
    state.runHistory.push({run:state.activeRun.name,incident:inc.id,day:state.day,grade,minutes:w.minutes,compute:w.computeSpent,tools:[...w.investigated],qualityMultiplier:quality.multiplier,masteryAwarded:rewards.mastery,antiGrindProtected:quality.protectedSolve});
    state.activeRun.incident=null;
  }
  w.resolved=true;
  w.debrief={grade,correctHypothesis,choice:choice[1],why:choice[2],tools:w.investigated.length,minutes:w.minutes,compute:w.computeSpent,falseMoves:w.falseMoves,hints:w.hints,mastery:rewards.mastery,research:rewards.research,reputation:rewards.reputation,quality};
  const qLabel=typeof problemQualityLabel==='function'?problemQualityLabel(quality):'Learning value';
  log(`🏅 CLEAN DIAGNOSIS ${grade}: ${inc.title}. ${qLabel} ×${Number(quality.multiplier).toFixed(2)} · +${rewards.mastery} mastery · +${rewards.research} research · +${rewards.reputation} reputation.`);setTimeout(()=>wsJuice("success",`CLEAN DIAGNOSIS ${grade}`),0);
  save();render();
}

function closeWorkstationDebrief(){state.selectedIncident=null;state.workstation=null;save();render()}

function runDiagnosticCommand(){
  const input=document.getElementById("wsCommand");if(!input)return;
  const cmd=input.value.trim();if(!cmd)return;const w=ws();w.terminalOutput.push(`$ ${cmd}`);
  const x=cmd.toLowerCase();
  if(x==="help") w.terminalOutput.push("commands: metrics | profile | gpu stragglers | nccl profile | data current | data replay | checkpoint verify | config show | evidence | hint");
  else if(x==="metrics"||x.startsWith("run inspect")){inspectWorkstationTool("metrics");return}
  else if(x.startsWith("profile")){inspectWorkstationTool("profiler");return}
  else if(x.startsWith("gpu")){inspectWorkstationTool("gpu");return}
  else if(x.startsWith("nccl")){inspectWorkstationTool("nccl");return}
  else if(x.startsWith("data")){inspectWorkstationTool("data");return}
  else if(x.startsWith("checkpoint")){inspectWorkstationTool("checkpoint");return}
  else if(x.startsWith("config")){inspectWorkstationTool("config");return}
  else if(x==="evidence") w.terminalOutput.push(`${w.evidence.length} evidence records collected from ${w.investigated.length} tools.`);
  else if(x==="hint"){takeWorkstationHint();return}
  else w.terminalOutput.push("command not recognized; type 'help'");
  save();render();
}

function wsToolView(c,w){
  if(w.tool==="terminal")return `<div class="ws-terminal"><div class="terminal-scroll">${w.terminalOutput.slice(-12).map(x=>`<div>${esc(x)}</div>`).join("")}</div><div class="terminal-input"><span>$</span><input id="wsCommand" autocomplete="off" placeholder="data replay --step 441198" onkeydown="if(event.key==='Enter')runDiagnosticCommand()"><button onclick="runDiagnosticCommand()">RUN</button></div></div>`;
  const spec=c.tools[w.tool];const seen=w.investigated.includes(w.tool);
  if(!spec)return"";
  if(!seen)return `<div class="ws-locked-tool"><div class="tool-glyph">${WORKSTATION_TOOLS.find(x=>x[0]===w.tool)?.[1]||"◈"}</div><h3>${spec.title}</h3><p>This diagnostic has not been run yet.</p><div class="tool-cost">${spec.cost?`${spec.cost} H100h · `:""}${spec.minutes} diagnostic min</div><button class="primary" onclick="inspectWorkstationTool('${w.tool}')">RUN DIAGNOSTIC</button></div>`;
  return `<div class="ws-result"><div class="result-head"><div><div class="eyebrow">${spec.signal?"SIGNAL ACQUIRED":"DIAGNOSTIC RESULT"}</div><h3>${spec.title}</h3></div>${spec.signal?`<div class="signal-badge">◆ SIGNAL</div>`:""}</div>${spec.lines.map((x,i)=>`<div class="result-row ${spec.signal&&i===0?"hot":""}"><span>${String(i+1).padStart(2,"0")}</span><code>${esc(x)}</code></div>`).join("")}</div>`;
}

function wsEvidence(w){
  if(!w.evidence.length)return `<div class="empty-evidence">No evidence pinned yet. Choose a diagnostic tool.</div>`;
  return w.evidence.slice(-8).map(e=>`<div class="evidence-chip ${e.signal?"signal":""}"><b>${esc(e.title)}</b><span>${esc(e.text)}</span></div>`).join("");
}

function workstationDebrief(c,w,inc){const d=w.debrief,q=d.quality;const qLine=q?`<div class="debrief-note"><b>${esc(typeof problemQualityLabel==='function'?problemQualityLabel(q):'Learning value')} · ×${Number(q.multiplier).toFixed(2)}</b><br>${esc((q.reasons||[]).join(' · '))}${q.protectedSolve?'<br><strong>Repeat protection active: this solve is practice only and grants no progression.</strong>':''}</div>`:'';return `<div class="incident-back"><div class="ws-debrief grade-${d.grade}"><div class="grade-orb">${d.grade}</div><div class="eyebrow">INCIDENT RESOLVED</div><h2>Clean Diagnosis — ${d.grade}</h2><p>${esc(d.why)}</p><div class="debrief-grid"><div><span>Tools opened</span><b>${d.tools}</b></div><div><span>False moves</span><b>${d.falseMoves}</b></div><div><span>Diagnostic time</span><b>${d.minutes}m</b></div><div><span>Compute spent</span><b>${d.compute} H100h</b></div><div><span>Hints</span><b>${d.hints}</b></div><div><span>${inc.term} mastery</span><b>+${d.mastery}</b></div></div>${qLine}<div class="debrief-note"><b>Production action</b><br>${esc(d.choice)}</div><button class="primary resume-btn" onclick="closeWorkstationDebrief()">RESUME TRAINING →</button></div></div>`}

function incidentOverlay(){
  ensureWorkstation();const inc=INCIDENTS.find(x=>x.id===state.selectedIncident),c=wsCase(),w=ws();if(!inc||!c||!w)return"";
  if(w.resolved&&w.debrief)return workstationDebrief(c,w,inc);
  const hasHyp=!!w.hypothesis;
  return `<div class="incident-back workstation-back"><div class="workstation">
    <header class="ws-header"><div><div class="eyebrow">ENGINEERING WORKSTATION · ${inc.role}</div><h2>${esc(c.title)}</h2><p>${esc(c.summary)}</p></div><div class="burn-card"><span>DIAG TIME</span><b>${w.minutes}m</b><small>${w.computeSpent} H100h spent</small></div></header>
    <div class="ws-body"><aside class="ws-tools">${WORKSTATION_TOOLS.map(t=>`<button class="${w.tool===t[0]?"active":""} ${w.investigated.includes(t[0])?"seen":""}" onclick="inspectWorkstationTool('${t[0]}')"><i>${t[1]}</i><span>${t[2]}</span>${w.investigated.includes(t[0])?"<em>✓</em>":""}</button>`).join("")}<button class="hint-btn" onclick="takeWorkstationHint()">? Senior hint</button></aside>
      <section class="ws-main"><div class="scope-line"><span class="alarm-dot"></span>RUN HALTED · INVESTIGATION ACTIVE</div>${wsToolView(c,w)}</section>
      <aside class="ws-board"><div class="eyebrow">EVIDENCE BOARD</div><h3>${w.evidence.length} observations</h3><div class="evidence-stack">${wsEvidence(w)}</div></aside>
    </div>
    <footer class="ws-decision"><div class="hypothesis"><div class="eyebrow">1 · COMMIT HYPOTHESIS</div><div class="hyp-grid">${c.hypotheses.map(h=>`<button class="${w.hypothesis===h[0]?"selected":""}" onclick="commitWorkstationHypothesis('${h[0]}')">${esc(h[1])}</button>`).join("")}</div></div><div class="production ${hasHyp?"ready":"locked"}"><div class="eyebrow">2 · PRODUCTION ACTION</div>${hasHyp?`<div class="action-grid">${inc.choices.map(ch=>`<button onclick="executeWorkstationAction('${ch[0]}')"><span>${esc(ch[1])}</span><i>→</i></button>`).join("")}</div>`:`<p>Commit a hypothesis before changing production.</p>`}</div></footer>
  </div></div>`;
}

// Ensure old saves can enter the workstation seamlessly.
ensureWorkstation();save();render();