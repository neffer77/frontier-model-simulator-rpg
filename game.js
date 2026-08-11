const ROLES={
  "Research Scientist":{focus:"Invent architectures, objectives, and scaling ideas.",skills:["research","math","experimentation"]},
  "Training Engineer":{focus:"Make giant training runs stable, efficient, and reproducible.",skills:["training","distributed","systems"]},
  "Data Engineer":{focus:"Build high-quality datasets, filters, mixtures, and provenance.",skills:["data","systems","evaluation"]},
  "Post-Training Engineer":{focus:"Turn base models into useful assistants with SFT, preference learning, and RL.",skills:["posttraining","evaluation","research"]},
  "Evals Engineer":{focus:"Measure capability, regressions, robustness, and hidden failure modes.",skills:["evaluation","safety","research"]},
  "Inference Engineer":{focus:"Serve models cheaply and quickly with kernels, batching, quantization, and routing.",skills:["inference","systems","distributed"]},
  "Safety Engineer":{focus:"Reduce misuse and model failures using threat modeling, evals, safeguards, and monitoring.",skills:["safety","evaluation","posttraining"]},
  "Model Product Engineer":{focus:"Turn frontier models into reliable products, agents, and developer experiences.",skills:["product","inference","evaluation"]},
  "Full-Stack Frontier Engineer":{focus:"Rotate across the entire model lifecycle and learn how the pieces interact.",skills:["research","training","data","posttraining","evaluation","inference","safety","product","systems","distributed"]}
};

const PROJECTS=[
  {title:"Debug a Diverging Pretraining Run",roles:["Training Engineer","Full-Stack Frontier Engineer"],difficulty:2,reward:180,skill:"training",lesson:"Loss spikes usually demand disciplined triage: data anomalies, optimizer state, numerical precision, learning-rate schedule, gradient norms, and distributed failures."},
  {title:"Design a 10T-Token Data Mixture",roles:["Data Engineer","Research Scientist","Full-Stack Frontier Engineer"],difficulty:2,reward:170,skill:"data",lesson:"Frontier data work is not just scraping. Mixture design, deduplication, contamination checks, quality classifiers, licensing/provenance, and domain balance all matter."},
  {title:"Implement Tensor Parallel Attention",roles:["Training Engineer","Inference Engineer","Full-Stack Frontier Engineer"],difficulty:3,reward:260,skill:"distributed",lesson:"Distributed model work forces you to reason about communication volume, memory pressure, synchronization, topology, and where tensors are sharded."},
  {title:"Find a Benchmark Contamination Bug",roles:["Evals Engineer","Data Engineer","Safety Engineer","Full-Stack Frontier Engineer"],difficulty:2,reward:190,skill:"evaluation",lesson:"A score is only meaningful if the benchmark is clean, reproducible, representative, and resistant to leakage or prompt-specific overfitting."},
  {title:"Create a Preference Optimization Experiment",roles:["Post-Training Engineer","Research Scientist","Full-Stack Frontier Engineer"],difficulty:3,reward:250,skill:"posttraining",lesson:"Post-training requires separating reward signal quality from optimizer behavior and measuring helpfulness, style, safety, and regressions across many slices."},
  {title:"Cut Serving Cost by 35%",roles:["Inference Engineer","Model Product Engineer","Full-Stack Frontier Engineer"],difficulty:3,reward:280,skill:"inference",lesson:"Serving optimization is a systems problem: batching, KV-cache management, speculative decoding, quantization, routing, kernel efficiency, and latency SLOs interact."},
  {title:"Red-Team an Agentic Model Release",roles:["Safety Engineer","Evals Engineer","Model Product Engineer","Full-Stack Frontier Engineer"],difficulty:3,reward:260,skill:"safety",lesson:"Frontier safety engineering combines concrete threat models with adversarial evals, mitigations, monitoring, and clear release criteria rather than relying on one benchmark."},
  {title:"Ship a Reliable Tool-Using Agent",roles:["Model Product Engineer","Post-Training Engineer","Evals Engineer","Full-Stack Frontier Engineer"],difficulty:2,reward:200,skill:"product",lesson:"Agent reliability depends on state management, tool contracts, recovery paths, evals, observability, latency budgets, and explicit handling of uncertainty."},
  {title:"Run a Scaling-Law Study",roles:["Research Scientist","Training Engineer","Full-Stack Frontier Engineer"],difficulty:3,reward:300,skill:"research",lesson:"Good scaling studies need controlled experiments, clean measurements, realistic compute budgets, and skepticism about extrapolating beyond observed regimes."},
  {title:"Incident: Checkpoint Corruption at 82%",roles:Object.keys(ROLES),difficulty:2,reward:220,skill:"systems",lesson:"Frontier teams need boring operational excellence: checkpoint validation, resumability, observability, runbooks, ownership, and failure drills can save enormous compute budgets."}
];

const initialSkills={research:1,math:1,training:1,distributed:1,systems:1,data:1,posttraining:1,evaluation:1,inference:1,safety:1,product:1};
let state=JSON.parse(localStorage.getItem("frontier-rpg")||"null")||{role:"Full-Stack Frontier Engineer",day:1,cash:500,reputation:0,energy:5,skills:{...initialSkills},feed:["You joined a frontier model lab. Choose work that builds both the company and your real-world engineering skill tree."],completed:0};

function save(){localStorage.setItem("frontier-rpg",JSON.stringify(state))}
function skillLabel(k){return k.replace(/(^|\b)\w/g,m=>m.toUpperCase())}
function eligibleProjects(){return PROJECTS.filter(p=>p.roles.includes(state.role)).sort((a,b)=>a.difficulty-b.difficulty)}
function successChance(p){const s=state.skills[p.skill]||1;return Math.min(.95,.48+s*.08-p.difficulty*.05)}
function work(p){
  if(state.energy<=0){log("You are out of focus for today. End the day before taking more work.");return}
  state.energy--;
  const chance=successChance(p),roll=Math.random();
  if(roll<=chance){
    state.cash+=p.reward;state.reputation+=p.difficulty*2;state.skills[p.skill]=(state.skills[p.skill]||1)+1;state.completed++;
    log(`✅ ${p.title}: shipped successfully. +$${p.reward} budget, +${p.difficulty*2} reputation, ${skillLabel(p.skill)} leveled up.`);
    state.feed.unshift(`LEARNING — ${p.lesson}`);
  } else {
    state.reputation=Math.max(0,state.reputation-1);state.skills[p.skill]=(state.skills[p.skill]||1)+1;
    log(`⚠️ ${p.title}: the attempt failed, but the postmortem improved ${skillLabel(p.skill)}. In real frontier work, failed experiments are useful when instrumented and documented.`);
  }
  save();render();
}
function study(skill){
  if(state.cash<100){log("Not enough learning budget. Complete a project first.");return}
  state.cash-=100;state.skills[skill]++;log(`📚 You spent $100 on a focused ${skillLabel(skill)} lab. Skill increased to ${state.skills[skill]}.`);save();render();
}
function endDay(){state.day++;state.energy=5;state.cash-=25;log(`🌙 Day ${state.day} begins. Cloud, lab, and staffing burn cost $25. Your next goal is to deliberately work on a weak skill, not just the easiest project.`);save();render()}
function switchRole(role){state.role=role;log(`🔄 Role switched to ${role}. ${ROLES[role].focus}`);save();render()}
function resetGame(){if(confirm("Reset all simulator progress?")){localStorage.removeItem("frontier-rpg");location.reload()}}
function log(msg){state.feed.unshift(msg)}

function render(){
 const role=ROLES[state.role],projects=eligibleProjects();
 document.getElementById("app").innerHTML=`<div class="shell">
  <div class="topbar"><div class="title"><h1>Frontier Model Engineer RPG</h1><p>Run a frontier AI lab while building the real skills behind research, training, data, post-training, evals, inference, safety, and product engineering.</p></div><div class="badge">Day ${state.day}</div></div>
  <div class="stats">
   <div class="stat"><span class="muted">Lab budget</span><b>$${state.cash}</b></div><div class="stat"><span class="muted">Reputation</span><b>${state.reputation}</b></div><div class="stat"><span class="muted">Focus</span><b>${"⚡".repeat(state.energy)}${"·".repeat(5-state.energy)}</b></div><div class="stat"><span class="muted">Projects shipped</span><b>${state.completed}</b></div>
  </div>
  <div class="grid">
   <section class="panel"><h2>Your role</h2><p><b>${state.role}</b> — ${role.focus}</p><div class="role-row">${Object.keys(ROLES).map(r=>`<button class="role ${r===state.role?"active":""}" onclick='switchRole(${JSON.stringify(r)})'>${r}</button>`).join("")}</div>
   <h2 style="margin-top:22px">Company work queue</h2>${projects.map((p,i)=>`<div class="project"><h3>${p.title}</h3><div class="meta">Difficulty ${"◆".repeat(p.difficulty)} · trains ${skillLabel(p.skill)} · success estimate ${Math.round(successChance(p)*100)}% · reward $${p.reward}</div><p>${p.lesson}</p><div class="actions"><button onclick="work(PROJECTS[${PROJECTS.indexOf(p)}])">Take project</button><button class="secondary" onclick="study('${p.skill}')">Study ${skillLabel(p.skill)} ($100)</button></div></div>`).join("")}
   <div class="actions"><button onclick="endDay()">End day</button><button class="secondary" onclick="resetGame()">Reset career</button></div></section>
   <aside><section class="panel"><h2>Skill tree</h2><div class="skills">${Object.entries(state.skills).map(([k,v])=>`<div class="skill"><b>${skillLabel(k)} · Lv ${v}</b><div class="bar"><span style="width:${Math.min(100,v*10)}%"></span></div></div>`).join("")}</div><div class="lesson"><b>Career translation</b><br/>Levels represent repeated exposure, not mastery. Use each game topic as a prompt for a real implementation, paper replication, debugging lab, benchmark, or systems exercise.</div></section>
   <section class="panel" style="margin-top:18px"><h2>Lab log</h2><div class="feed">${state.feed.map(x=>`<div class="feed-item">${x}</div>`).join("")}</div></section></aside>
  </div><div class="footer-note">Progress is stored locally in your browser. The simulator is intentionally lightweight so the learning systems can grow independently from the UI.</div></div>`;
}
render();
