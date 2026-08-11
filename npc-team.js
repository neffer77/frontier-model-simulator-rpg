// Phase 4B — NPC Engineering Team
// Persistent employees, specialties, imperfect advice, team memory, and experiment ideas.

const NPC_TEAM_VERSION=1;
const NPC_TEMPLATES=[
  {id:"maya",name:"Maya Chen",role:"Distributed Systems Engineer",level:"Staff",avatar:"MC",color:"cyan",specialty:"Training systems",bio:"Quiet, evidence-first, strongest on parallelism, profiler traces, and GPU utilization.",skills:{distributed:9,nccl:9,training:8,data:3,evals:4,inference:5,post:3,safety:2},bias:"systems",trait:"Won't speculate past the evidence."},
  {id:"rafael",name:"Rafael Ortiz",role:"Data Engineer",level:"Senior",avatar:"RO",color:"amber",specialty:"Data quality",bio:"Skeptical of suspicious benchmark gains and protective of provenance, deduplication, and sampling quality.",skills:{distributed:3,nccl:2,training:5,data:10,evals:7,inference:2,post:5,safety:4},bias:"data",trait:"Assumes data is guilty until proven innocent."},
  {id:"priya",name:"Priya Shah",role:"Post-Training Researcher",level:"Staff",avatar:"PS",color:"violet",specialty:"Post-training",bio:"Experimental and multi-objective. Strong on DPO, SFT, tool behavior, and preference-data tradeoffs.",skills:{distributed:3,nccl:2,training:6,data:7,evals:8,inference:4,post:10,safety:7},bias:"post",trait:"Pushes controlled ablations instead of aggregate-score chasing."},
  {id:"noah",name:"Noah Williams",role:"Inference Engineer",level:"Senior",avatar:"NW",color:"green",specialty:"Serving",bio:"Production-minded engineer focused on queueing, KV cache, routing, batching, latency, and capacity.",skills:{distributed:5,nccl:4,training:3,data:3,evals:5,inference:10,post:3,safety:3},bias:"inference",trait:"Optimizes for what breaks under real traffic."},
  {id:"elena",name:"Elena Kovacs",role:"Research Scientist",level:"Principal",avatar:"EK",color:"pink",specialty:"Architecture research",bio:"High-upside researcher with strong architecture instincts and a willingness to place expensive bets.",skills:{distributed:6,nccl:4,training:8,data:6,evals:7,inference:5,post:7,safety:3},bias:"research",trait:"Brilliant, occasionally overconfident."},
  {id:"marcus",name:"Marcus Lee",role:"Infrastructure Engineer",level:"Staff",avatar:"ML",color:"blue",specialty:"Cluster reliability",bio:"Methodical operator for GPU fleets, networks, storage, checkpoints, and failure recovery.",skills:{distributed:8,nccl:8,training:6,data:3,evals:2,inference:6,post:2,safety:3},bias:"infra",trait:"Prefers reversible operational changes."},
  {id:"zoe",name:"Zoe Patel",role:"Evals Engineer",level:"Senior",avatar:"ZP",color:"teal",specialty:"Evaluation",bio:"Obsessed with measurement validity, benchmark slices, contamination, regressions, and temporal holdouts.",skills:{distributed:2,nccl:1,training:4,data:8,evals:10,inference:4,post:7,safety:7},bias:"evals",trait:"Doesn't trust a headline score without controls."},
  {id:"sam",name:"Sam Brooks",role:"AI Safety Engineer",level:"Senior",avatar:"SB",color:"red",specialty:"Model behavior",bio:"Red-team and safety specialist focused on refusal calibration, misuse, robustness, and behavior shifts.",skills:{distributed:2,nccl:1,training:4,data:5,evals:8,inference:3,post:7,safety:10},bias:"safety",trait:"Looks for capability and safety regressions together."}
];

function ensureNpcTeam(){
  state.npcTeam ||= {version:NPC_TEAM_VERSION,selectedId:"maya",advice:null,idea:null};
  state.npcEmployees ||= NPC_TEMPLATES.map((t,i)=>({...t,trust:55+(i%3)*4,respect:58+(i%4)*3,alignment:55,workload:20+(i%4)*8,memories:[],ideasGenerated:0,incidentsHelped:0,discoveries:[]}));
  // Add any newly shipped core NPCs without replacing existing progression.
  NPC_TEMPLATES.forEach(t=>{if(!state.npcEmployees.some(e=>e.id===t.id))state.npcEmployees.push({...t,trust:55,respect:55,alignment:55,workload:25,memories:[],ideasGenerated:0,incidentsHelped:0,discoveries:[]})});
}

function npcById(id){ensureNpcTeam();return state.npcEmployees.find(x=>x.id===id)}
function npcOpenTeam(){ensureNpcTeam();state.view="team";save();render()}
function npcCloseTeam(){state.view="company";save();render()}
function npcSelect(id){state.npcTeam.selectedId=id;state.npcTeam.idea=null;save();render()}
function npcRemember(e,text,type="general"){if(!e)return;e.memories.unshift({day:state.day,type,text});e.memories=e.memories.slice(0,12)}

function incidentDomain(inc){
  if(!inc)return"training";
  if(inc.id==="nan"||inc.id==="bubble")return inc.id==="bubble"?"distributed":"training";
  if(inc.id==="contam")return"evals";
  if(inc.id==="ttft")return"inference";
  if(inc.id==="dpo")return"post";
  return"training";
}

function npcConfidence(e,inc){
  const d=incidentDomain(inc),base=(e.skills[d]||3)*7;
  const adjacent=d==="distributed"?(e.skills.nccl||0)*2:d==="evals"?(e.skills.data||0):d==="post"?(e.skills.evals||0):0;
  const familiarity=e.memories.filter(m=>m.type===inc?.id).length*3;
  const deterministic=((state.day||1)*11+e.id.length*13+(inc?.id?.length||0)*7)%11-5;
  return Math.max(24,Math.min(94,Math.round(28+base+adjacent+familiarity+deterministic)));
}

function npcAdviceText(e,inc){
  const correct=WORKSTATION_CASES?.[inc.id]?.correctHypothesis;
  const domain=incidentDomain(inc);
  const expert=(e.skills[domain]||0)>=8;
  const lines={
    nan:{systems:"I would not start by blaming the optimizer. Check whether the failure tracks a specific input or replayable batch.",data:"The shard transition is the loudest clue. I want provenance and a replay before we touch training knobs.",infra:"Fleet health doesn't fit a hardware failure yet. Verify the checkpoint and isolate whether the same batch reproduces.",research:"The activation spike is more interesting than the headline NaN. Find what changed exactly at the failing step."},
    bubble:{systems:"The utilization oscillation looks like pipeline idle time. I want the distributed profiler before changing TP.",infra:"Hardware is healthy enough that I'd inspect scheduling and pipeline fill/drain behavior next.",data:"The dataloader appears fed, so I would deprioritize input starvation unless new evidence contradicts that.",research:"Scaling the cluster without scaling useful in-flight work is a plausible explanation. Measure the bubble directly."},
    contam:{evals:"A +14 jump against flat controls is not a victory lap. Check train/eval overlap and rebuild a clean temporal slice.",data:"I want provenance on the refreshed corpus. Near-duplicate solutions can manufacture capability gains.",post:"Do not optimize against this score until measurement validity is established.",research:"The effect size is suspiciously isolated. Treat contamination as a live hypothesis, not an edge case."},
    ttft:{inference:"Decode is almost unchanged, so I would focus on queued prefill and long-prompt scheduling pressure.",infra:"The fleet is saturated, but the symptom shape points to workload scheduling more than a generic capacity failure.",systems:"Separate queueing from kernel throughput. TTFT can explode while decode remains healthy.",research:"The asymmetry between TTFT and inter-token latency is the key observation."},
    dpo:{post:"The aggregate preference win is hiding slice regressions. Rebalance tool trajectories and run beta/data ablations.",evals:"Gate the release on tool exactness and refusal slices, not the aggregate preference score.",safety:"The benign-refusal movement matters even if adversarial safety barely changes. Treat this as a multi-objective regression.",data:"Preference composition looks skewed. Fix the dataset before concluding the objective itself is broken."}
  };
  let key=e.bias;
  if(key==="research")key="research";if(key==="infra")key="infra";if(key==="safety")key="safety";
  const best=lines[inc.id]?.[key]||lines[inc.id]?.[domain]||Object.values(lines[inc.id]||{})[0]||"I need more evidence before I would make a production change.";
  if(expert)return best;
  // Non-experts are intentionally useful but less decisive.
  return `${best} I am outside my strongest specialty here, so I would treat this as a hypothesis rather than a call.`;
}

function askNpcDuringIncident(id){
  ensureNpcTeam();const e=npcById(id),inc=INCIDENTS.find(x=>x.id===state.selectedIncident);if(!e||!inc)return;
  const confidence=npcConfidence(e,inc);const advice=npcAdviceText(e,inc);
  e.incidentsHelped++;e.workload=Math.min(100,e.workload+4);e.trust=Math.min(100,e.trust+1);
  npcRemember(e,`You asked for help on ${inc.title}. I advised: ${advice}`,inc.id);
  state.npcTeam.advice={employeeId:id,incidentId:inc.id,confidence,advice};save();render();
}
function closeNpcAdvice(){state.npcTeam.advice=null;save();render()}

function npcIdeaFor(e){
  const m=state.models?.at(-1);const domain=e.bias;
  const ideas={systems:["Parallelism sweep","Test a lower PP degree with more in-flight microbatches before scaling the next run.","throughput"],data:["Data mixture ablation","Run a controlled mixture change and watch coding/reasoning tradeoffs instead of aggregate score.","data"],post:["Post-training slice ablation","Rebalance structured tool trajectories and compare slice-level regressions.","data"],inference:["Serving pressure test","Stress long-context prefill separately from interactive decode traffic.","throughput"],research:["Architecture efficiency probe","Challenge the current architecture with a controlled efficiency experiment before the next scale jump.","precision"],infra:["Recovery drill","Verify checkpoint and restart assumptions before the next expensive run.","precision"],evals:["Clean holdout study","Create a stricter evaluation slice and compare it with the current suite.","data"],safety:["Behavior regression slice","Add a targeted behavior slice before the next post-training decision.","data"]};
  const x=ideas[domain]||ideas.systems;return {employeeId:e.id,modelId:m?.id||null,title:x[0],pitch:x[1],kind:x[2]};
}
function npcGenerateIdea(id){const e=npcById(id);if(!e)return;e.ideasGenerated++;state.npcTeam.idea=npcIdeaFor(e);npcRemember(e,`I proposed: ${state.npcTeam.idea.title}.`,"idea");save();render()}
function npcAcceptIdea(){const idea=state.npcTeam.idea;if(!idea)return;const e=npcById(idea.employeeId);if(idea.modelId&&typeof modelLabStartExperiment==="function")modelLabStartExperiment(idea.modelId,idea.kind);if(e){e.respect=Math.min(100,e.respect+2);npcRemember(e,`You approved my ${idea.title} proposal.`,"idea")};state.npcTeam.idea=null;state.view="company";save();render()}
function npcDismissIdea(){const idea=state.npcTeam.idea;if(idea){const e=npcById(idea.employeeId);npcRemember(e,`You saved my ${idea.title} proposal for later.`,"idea")};state.npcTeam.idea=null;save();render()}

function npcSkillBars(e){return Object.entries(e.skills).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`<div class="npc-skill"><span>${esc(k)}</span><i><em style="width:${v*10}%"></em></i><b>${v}</b></div>`).join("")}
function npcMemoryList(e){return e.memories.length?e.memories.map(m=>`<div class="npc-memory"><span>D${m.day}</span><p>${esc(m.text)}</p></div>`).join(""):`<div class="npc-empty">No shared history yet.</div>`}

function renderNpcTeam(){ensureNpcTeam();const e=npcById(state.npcTeam.selectedId)||state.npcEmployees[0];return `<div class="npc-shell"><header class="npc-head"><div><div class="eyebrow">PHASE 4B · ENGINEERING TEAM</div><h1>Your lab has people now.</h1><p>Employees have specialties, imperfect opinions, confidence, workload, professional relationships, ideas, and memory.</p></div><button onclick="npcCloseTeam()">Return to company</button></header><div class="npc-layout"><aside class="npc-roster">${state.npcEmployees.map(x=>`<button class="${x.id===e.id?"active":""}" onclick="npcSelect('${x.id}')"><span class="npc-avatar ${x.color}">${esc(x.avatar)}</span><div><b>${esc(x.name)}</b><small>${esc(x.role)}</small></div><em>${x.workload}%</em></button>`).join("")}</aside><main class="npc-profile"><section class="npc-card npc-profile-hero"><div class="npc-avatar giant ${e.color}">${esc(e.avatar)}</div><div><div class="eyebrow">${esc(e.level)} · ${esc(e.specialty)}</div><h2>${esc(e.name)}</h2><p>${esc(e.bio)}</p><blockquote>${esc(e.trait)}</blockquote></div></section><div class="npc-grid"><section class="npc-card"><div class="eyebrow">TECHNICAL PROFILE</div><h3>Strongest areas</h3>${npcSkillBars(e)}</section><section class="npc-card"><div class="eyebrow">WORKING RELATIONSHIP</div><div class="npc-rel"><div><span>Trust</span><b>${e.trust}</b></div><div><span>Respect</span><b>${e.respect}</b></div><div><span>Alignment</span><b>${e.alignment}</b></div><div><span>Workload</span><b>${e.workload}%</b></div></div></section><section class="npc-card"><div class="eyebrow">IDEA ENGINE</div><h3>Ask ${esc(e.name.split(" ")[0])} what to try next</h3><p>Ideas are grounded in this employee's specialty and become Model Lab experiments when accepted.</p><button class="npc-primary" onclick="npcGenerateIdea('${e.id}')">Ask for an idea</button>${state.npcTeam.idea?.employeeId===e.id?`<div class="npc-idea"><b>${esc(state.npcTeam.idea.title)}</b><p>${esc(state.npcTeam.idea.pitch)}</p><div><button onclick="npcAcceptIdea()">Run experiment</button><button onclick="npcDismissIdea()">Save for later</button></div></div>`:""}</section><section class="npc-card"><div class="eyebrow">SHARED MEMORY</div><h3>${e.memories.length} remembered moments</h3><div class="npc-memories">${npcMemoryList(e)}</div></section></div></main></div></div>`}

function renderAskTeamPanel(){
  if(!state.selectedIncident)return"";const inc=INCIDENTS.find(x=>x.id===state.selectedIncident);if(!inc)return"";
  return `<div class="ask-team-panel"><div class="eyebrow">ASK TEAM · ${esc(inc.role)}</div><h3>Get a second opinion</h3><p>Advice depends on specialty and available evidence. Confidence is not correctness.</p><div>${state.npcEmployees.map(e=>`<button onclick="askNpcDuringIncident('${e.id}')"><span class="npc-avatar mini ${e.color}">${esc(e.avatar)}</span><b>${esc(e.name.split(" ")[0])}</b><small>${esc(e.specialty)}</small></button>`).join("")}</div></div>`;
}
function renderNpcAdvice(){const a=state.npcTeam.advice;if(!a)return"";const e=npcById(a.employeeId);return `<div class="npc-advice-back"><div class="npc-advice-card"><div class="npc-avatar giant ${e.color}">${esc(e.avatar)}</div><div class="eyebrow">SECOND OPINION · ${esc(e.role)}</div><h2>${esc(e.name)}</h2><p>“${esc(a.advice)}”</p><div class="confidence"><span>Confidence</span><b>${a.confidence}%</b><i><em style="width:${a.confidence}%"></em></i></div><small>Confidence reflects this character's specialty and experience, not hidden access to the correct answer.</small><button class="npc-primary" onclick="closeNpcAdvice()">Back to investigation</button></div></div>`}

function injectNpcIncidentUI(){
  if(!state.selectedIncident)return;const host=document.querySelector(".workstation .ws-board")||document.querySelector(".ws-right");if(host&&!host.querySelector(".ask-team-panel"))host.insertAdjacentHTML("beforeend",renderAskTeamPanel());
  if(state.npcTeam.advice&&!document.querySelector(".npc-advice-back"))document.body.insertAdjacentHTML("beforeend",renderNpcAdvice());
}

const npcBaseRender=render;
render=function(){
  ensureNpcTeam();
  if(state.view==="team"){document.getElementById("app").innerHTML=renderNpcTeam();return}
  npcBaseRender();
  if(!state.started)return;
  const shell=document.querySelector(".game-shell");
  if(shell&&!shell.querySelector(".npc-team-launch")){const btn=document.createElement("button");btn.className="npc-team-launch";btn.onclick=npcOpenTeam;btn.innerHTML=`<span>ENGINEERING TEAM</span><b>${state.npcEmployees.length} core employees</b><small>Advice · ideas · specialties · memory →</small>`;shell.insertBefore(btn,shell.children[2]||null)}
  injectNpcIncidentUI();
};

render();
