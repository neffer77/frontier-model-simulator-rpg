// Frontier Lab V3 workstation: discovery-driven technical debugging + mastery feedback.
// Rewards are earned through investigation quality rather than random engagement mechanics.

const WS_TOOLS=[
  ["overview","Mission Control","◉"],
  ["metrics","TensorBoard","⌁"],
  ["profiler","Profiler","▥"],
  ["nccl","NCCL","⇄"],
  ["data","Data Pipeline","◫"],
  ["config","Train Config","⚙"],
  ["checkpoint","Checkpoints","◇"],
  ["terminal","Terminal",">_"]
];

function ensureWorkstationState(){
  state.ws ||= {tool:"overview",visited:[],commands:[],minutes:0,computeCost:0,terminalOutput:["Frontier Lab diagnostic shell ready. Type `help` for commands."],celebration:null};
  state.goals ||= {completed:0,cleanSolves:0,bestEfficiency:0};
}

function resetWorkstation(){
  state.ws={tool:"overview",visited:["overview"],commands:[],minutes:0,computeCost:0,terminalOutput:["Frontier Lab diagnostic shell ready. Type `help` for commands."],celebration:null};
}

const baseOpenIncident=openIncident;
openIncident=function(id){
  state.selectedIncident=id;
  resetWorkstation();
  save();
  render();
};

function wsTool(name){
  ensureWorkstationState();
  state.ws.tool=name;
  if(!state.ws.visited.includes(name)){
    state.ws.visited.push(name);
    state.ws.minutes += name==="terminal"?1:3;
    if(["profiler","data","checkpoint"].includes(name)) state.ws.computeCost += name==="data"?0.2:0.1;
  }
  save();render();
}

function incidentToolEvidence(inc,tool){
  const generic={
    overview:[`SEV-2 · ${inc.role}`,inc.brief,"The decisive evidence is not preselected. Choose what to inspect."],
    profiler:inc.id==="bubble"?["Pipeline stage idle: 38%","Long fill/drain gaps visible across PP stages","Kernel durations otherwise healthy"]:inc.id==="nan"?["Activation magnitude jumps sharply in blocks 57–63 at the failing step","Kernel timings remain stable before failure"]:["No dominant kernel regression in sampled window","Inspect another subsystem if the symptom is not compute-bound."],
    nccl:inc.id==="bubble"?["TP collective latency within expected range","No fabric retransmit anomaly"]:inc.id==="nan"?["All-reduce / all-gather latency nominal","No communicator timeout or rank loss"]:["Collective health nominal","No evidence of a communication-driven incident."],
    config:inc.id==="dpo"?["objective: DPO","beta: 0.1","reference policy: SFT checkpoint 27","learning rate: 5e-7"]:inc.id==="bubble"?["TP=8 · PP=8","microbatch=1 sequence/GPU","global batch held constant"]:inc.id==="nan"?["precision: BF16 matmuls / FP32 optimizer","gradient_clip: 1.0","LR follows smooth cosine decay"]:["Configuration snapshot is internally valid","No obvious syntax/configuration failure."],
    checkpoint:inc.id==="nan"?["step_440500: checksum valid","optimizer state finite","deterministic replay available from preserved batch IDs"]:["Latest checkpoint verifies successfully","Rollback is available but root cause remains unresolved."],
    terminal:["Use commands to interrogate the incident. Try `help`."]
  };
  if(tool==="metrics") return inc.tabs.metrics||[];
  if(tool==="data") return inc.tabs.data||[];
  return generic[tool]||[];
}

function terminalHelp(){return [
  "help                         show commands",
  "run status                   active run + incident state",
  "metrics tail                 recent metric window",
  "gpu profile                  compute / pipeline profile",
  "nccl health                  collective health",
  "data current                 current shard / request class",
  "data replay                  replay suspect data (costs simulated compute)",
  "checkpoint verify            validate latest recovery point",
  "config show                  inspect relevant training/serving config",
  "hypothesis <text>             record your working theory"
];}

function wsCommand(){
  ensureWorkstationState();
  const input=document.getElementById("wsCommand"); if(!input)return;
  const cmd=input.value.trim(); if(!cmd)return;
  const inc=INCIDENTS.find(x=>x.id===state.selectedIncident); if(!inc)return;
  state.ws.commands.push(cmd); state.ws.minutes+=1;
  let out=[];
  const c=cmd.toLowerCase();
  if(c==="help") out=terminalHelp();
  else if(c==="run status") out=[`${state.activeRun?.name||"simulation"}: ${inc.title}`,`role owner: ${inc.role}`,"diagnosis pending"];
  else if(c==="metrics tail") out=incidentToolEvidence(inc,"metrics");
  else if(c==="gpu profile") out=incidentToolEvidence(inc,"profiler");
  else if(c==="nccl health") out=incidentToolEvidence(inc,"nccl");
  else if(c==="data current") out=incidentToolEvidence(inc,"data").slice(0,2);
  else if(c==="data replay"){
    state.ws.computeCost+=2;
    out=inc.id==="nan"?["replay batch: REPRODUCED","activation spike repeats in blocks 57–63","failure follows suspect shard deterministically"]:["replay completed","No deterministic training-data failure reproduced for this incident."];
  }
  else if(c==="checkpoint verify") out=incidentToolEvidence(inc,"checkpoint");
  else if(c==="config show") out=incidentToolEvidence(inc,"config");
  else if(c.startsWith("hypothesis ")) out=[`hypothesis recorded: ${cmd.slice(11)}`,"Now seek evidence that could falsify it."];
  else out=[`command not found: ${cmd}`,"Type `help` for the diagnostic command set."];
  state.ws.terminalOutput.push(`$ ${cmd}`,...out); state.ws.terminalOutput=state.ws.terminalOutput.slice(-28);
  save();render();
  setTimeout(()=>{const el=document.getElementById("wsCommand");if(el)el.focus()},0);
}

function workstationEvidence(inc){
  ensureWorkstationState();
  const tool=state.ws.tool;
  const lines=incidentToolEvidence(inc,tool);
  if(tool==="terminal"){
    return `<div class="terminal-screen">${state.ws.terminalOutput.map(x=>`<div class="terminal-line">${esc(x)}</div>`).join("")}<div class="terminal-entry"><span>$</span><input id="wsCommand" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="help" onkeydown="if(event.key==='Enter')wsCommand()"><button onclick="wsCommand()">RUN</button></div></div>`;
  }
  return `<div class="ws-evidence">${lines.map((x,i)=>`<div class="evidence-row" style="--delay:${i}"><span>${String(i+1).padStart(2,"0")}</span><p>${esc(x)}</p></div>`).join("")}</div>`;
}

function diagnosticEfficiency(){
  ensureWorkstationState();
  const inspections=Math.max(1,state.ws.visited.length-1);
  const commandCount=state.ws.commands.length;
  return Math.max(20,Math.round(100-inspections*6-commandCount*2-state.ws.minutes*.7));
}

const baseSolveIncident=solveIncident;
solveIncident=function(id){
  ensureWorkstationState();
  const inc=INCIDENTS.find(i=>i.id===state.selectedIncident); if(!inc)return;
  const c=inc.choices.find(x=>x[0]===id),ok=!!c[3];
  const efficiency=diagnosticEfficiency();
  if(ok){
    const before=state.knowledge[inc.term]||0;
    state.knowledge[inc.term]=Math.min(6,before+(state.ws.visited.length>=3?2:1));
    state.research++;
    state.reputation+=2;
    state.goals.completed++;
    if(efficiency>=80){state.goals.cleanSolves++;state.reputation++;}
    state.goals.bestEfficiency=Math.max(state.goals.bestEfficiency,efficiency);
    if(state.activeRun&&state.activeRun.incident===inc.id){state.runHistory.push({run:state.activeRun.name,incident:inc.id,day:state.day,efficiency,tools:[...state.ws.visited]});state.activeRun.incident=null;}
    state.ws.celebration={title:"INCIDENT RESOLVED",term:inc.term,efficiency,detail:c[2],mastery:state.knowledge[inc.term]};
    log(`⚡ ${inc.title} resolved · ${efficiency}% diagnostic efficiency · ${inc.term} mastery advanced.`);
    save();render();
  }else{
    state.knowledge[inc.term]=(state.knowledge[inc.term]||0)+1;
    state.day++;
    if(state.activeRun)state.activeRun.progress=Math.max(0,state.activeRun.progress-2);
    state.ws.terminalOutput.push(`DECISION REVIEW: ${c[2]}`);
    log(`⚠️ Decision did not resolve ${inc.title}. New evidence has been added to your mental model.`);
    save();render();
  }
};

function closeCelebration(){
  ensureWorkstationState();
  state.selectedIncident=null;
  state.ws.celebration=null;
  save();render();
}

function wsDecisionPanel(inc){
  return `<div class="ws-decisions"><div class="eyebrow">PRODUCTION DECISION</div><h3>Commit your diagnosis</h3><p class="muted-copy">Strong engineers investigate enough to falsify alternatives, then act decisively.</p>${inc.choices.map(c=>`<button onclick="solveIncident('${c[0]}')"><span>${esc(c[1])}</span><i>→</i></button>`).join("")}</div>`;
}

function celebrationOverlay(){
  ensureWorkstationState(); const x=state.ws.celebration;if(!x)return"";
  const level=["Unseen","Seen","Explained","Applied","Diagnosed","Transferred","Mastered"][Math.min(6,x.mastery)]||"Mastered";
  return `<div class="celebrate-back"><div class="celebrate-card"><div class="success-rings"><i></i><i></i><i></i><b>✓</b></div><div class="eyebrow">${x.title}</div><h2>${x.efficiency}% diagnostic efficiency</h2><div class="reward-row"><div><span>Concept</span><b>${x.term}</b></div><div><span>Mastery</span><b>${level}</b></div><div><span>Reward</span><b>+ Insight · + Rep</b></div></div><p>${esc(x.detail)}</p><button class="primary huge" onclick="closeCelebration()">Return to the lab →</button></div></div>`;
}

incidentOverlay=function(){
  const inc=INCIDENTS.find(x=>x.id===state.selectedIncident);if(!inc)return"";
  ensureWorkstationState();
  if(state.ws.celebration)return celebrationOverlay();
  return `<div class="workstation-back"><div class="workstation"><header class="ws-header"><div><div class="eyebrow">ENGINEERING WORKSTATION · LIVE INCIDENT</div><h2>${inc.title}</h2><p>${inc.brief}</p></div><div class="ws-severity"><span>SEV</span><b>2</b></div></header><div class="ws-body"><aside class="ws-tools">${WS_TOOLS.map(t=>`<button class="${state.ws.tool===t[0]?"active":""} ${state.ws.visited.includes(t[0])?"visited":""}" onclick="wsTool('${t[0]}')"><i>${t[2]}</i><span>${t[1]}</span>${state.ws.visited.includes(t[0])?"<em>•</em>":""}</button>`).join("")}</aside><section class="ws-console"><div class="ws-console-head"><div><span>${WS_TOOLS.find(x=>x[0]===state.ws.tool)?.[2]||"◉"}</span><b>${WS_TOOLS.find(x=>x[0]===state.ws.tool)?.[1]||"Mission Control"}</b></div><div class="investigation-stats"><span>${state.ws.minutes}m investigation</span><span>${state.ws.computeCost.toFixed(1)} simulated H100h</span><span>${diagnosticEfficiency()}% efficiency</span></div></div>${workstationEvidence(inc)}</section><aside class="ws-right"><div class="hypothesis-card"><div class="eyebrow">INVESTIGATION TRAIL</div>${state.ws.visited.map((x,i)=>`<div><span>${i+1}</span>${WS_TOOLS.find(t=>t[0]===x)?.[1||0]||x}</div>`).join("")}<small>Efficiency rewards focused diagnosis, but there is no punishment for exploring while learning.</small></div>${wsDecisionPanel(inc)}<div class="ws-tip">${termButton(inc.term)} opens the explainer without revealing which production action is correct.</div></aside></div></div></div>`;
};

// Add a low-pressure return loop: visible next objective, never a punitive streak.
function currentMission(){
  ensureWorkstationState();
  if(state.activeRun?.incident)return {title:"Resolve the live incident",detail:"Use the workstation to diagnose before more compute burns.",reward:"Engineering mastery"};
  if(state.activeRun)return {title:`Ship ${state.activeRun.name}`,detail:`Training is ${state.activeRun.progress}% complete.`,reward:"Model lineage + reputation"};
  if(!state.models.length)return {title:"Train your first model",detail:"Launch the first model that will permanently enter your company history.",reward:"First lineage model"};
  const weak=Object.entries(state.knowledge).sort((a,b)=>a[1]-b[1])[0]?.[0];
  return {title:weak?`Strengthen ${weak}`:"Push the frontier",detail:weak?"Future incidents will revisit weak concepts in different contexts.":"Research, scale infrastructure, and launch the next model.",reward:"Transfer learning"};
}

const baseRender=render;
render=function(){
  ensureWorkstationState();
  baseRender();
  if(!state.started)return;
  const shell=document.querySelector('.game-shell'); if(!shell)return;
  const mission=currentMission();
  const card=document.createElement('div');
  card.className='next-mission';
  card.innerHTML=`<div><span>NEXT OBJECTIVE</span><b>${esc(mission.title)}</b><small>${esc(mission.detail)}</small></div><em>${esc(mission.reward)} →</em>`;
  shell.insertBefore(card,shell.children[1]||null);
};

render();
