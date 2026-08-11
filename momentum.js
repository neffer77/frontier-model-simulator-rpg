// Earned progression celebrations. No random loot, no streak loss, no fake scarcity.
function ensureMomentum(){state.momentum ||= {overlay:null,milestones:[],discoveries:0};}
function momentumOverlay(){ensureMomentum();const o=state.momentum.overlay;if(!o)return"";
  if(o.kind==="model")return `<div class="milestone-back"><div class="milestone-card model-reveal"><div class="reveal-glow"></div><div class="eyebrow">MODEL SHIPPED · LINEAGE EXPANDED</div><div class="model-sigil">${esc(o.index)}</div><h2>${esc(o.name)}</h2><p>${esc(o.tier)} joined your permanent model family.</p><div class="milestone-stats"><div><span>Capability</span><b>${o.score}</b></div><div><span>Parameters</span><b>${fmt(o.paramsB,2)}B</b></div><div><span>Training</span><b>${fmt(o.tokensB,1)}B tok</b></div><div><span>Incidents</span><b>${o.incidents}</b></div></div><div class="delta-line"><span>Company reputation</span><i>+${o.rep}</i></div><div class="delta-line"><span>Research insight</span><i>+${o.insight}</i></div><button class="primary huge" onclick="closeMomentum()">See it in the lineage →</button></div></div>`;
  if(o.kind==="tech")return `<div class="milestone-back"><div class="milestone-card tech-reveal"><div class="tech-glyph">◈</div><div class="eyebrow">RESEARCH BREAKTHROUGH</div><h2>${esc(o.name)}</h2><p>${esc(o.effect)}</p><div class="unlock-path"><span>UNDERSTOOD</span><i>→</i><span>IMPLEMENTED</span><i>→</i><b>UNLOCKED</b></div><button class="primary huge" onclick="closeMomentum()">Apply the breakthrough →</button></div></div>`;
  if(o.kind==="infra")return `<div class="milestone-back"><div class="milestone-card infra-reveal"><div class="campus-glyph">▥ ▥ ▥</div><div class="eyebrow">LAB EXPANSION COMPLETE</div><h2>${esc(o.name)}</h2><p>Your company can now attempt larger model tiers and support a broader engineering team.</p><div class="milestone-stats"><div><span>Infrastructure</span><b>Tier ${o.level}</b></div><div><span>Team</span><b>${o.employees}</b></div></div><button class="primary huge" onclick="closeMomentum()">Walk the new campus →</button></div></div>`;
  return"";
}
function closeMomentum(){ensureMomentum();state.momentum.overlay=null;save();render()}
function addMilestone(type,title){ensureMomentum();state.momentum.milestones.unshift({type,title,day:state.day});state.momentum.milestones=state.momentum.milestones.slice(0,20)}

const momentumCompleteRun=completeRun;
completeRun=function(){
  const beforeModels=state.models.length,beforeRep=state.reputation,beforeResearch=state.research;
  momentumCompleteRun();ensureMomentum();
  const m=state.models[state.models.length-1];if(!m||state.models.length===beforeModels)return;
  state.momentum.overlay={kind:"model",name:m.name,index:state.models.length,tier:m.tier,score:m.score,paramsB:m.paramsB,tokensB:m.tokensB,incidents:m.incidents,rep:state.reputation-beforeRep,insight:state.research-beforeResearch};
  addMilestone("model",`${m.name} shipped`);state.momentum.discoveries++;
  save();render();
};

const momentumResearchTech=researchTech;
researchTech=function(id){
  const before=state.tech.length;momentumResearchTech(id);ensureMomentum();
  if(state.tech.length>before){const t=TECH_TREE.find(x=>x.id===id);state.momentum.overlay={kind:"tech",name:t.name,effect:t.effect};addMilestone("research",`${t.name} unlocked`);state.momentum.discoveries++;save();render()}
};

const momentumUpgradeInfra=upgradeInfra;
upgradeInfra=function(){
  const before=state.infra;momentumUpgradeInfra();ensureMomentum();
  if(state.infra>before){state.momentum.overlay={kind:"infra",name:infraName(),level:state.infra,employees:state.employees};addMilestone("infra",`${infraName()} opened`);save();render()}
};

function milestoneStrip(){ensureMomentum();const nextModel=MODEL_TIERS.find(t=>tierAvailable(t)&&!state.models.some(m=>m.tier===t.name));const mastery=Object.values(state.knowledge).filter(v=>v>=4).length;return `<div class="momentum-strip"><div><span>DISCOVERIES</span><b>${state.momentum.discoveries}</b></div><div><span>MODELS</span><b>${state.models.length}</b></div><div><span>DEEP SKILLS</span><b>${mastery}</b></div><div class="momentum-next"><span>NEXT FRONTIER</span><b>${nextModel?nextModel.name:"Frontier-scale research"}</b></div></div>`}

const momentumRender=render;
render=function(){momentumRender();if(!state.started)return;ensureMomentum();const shell=document.querySelector('.game-shell');if(shell&&!shell.querySelector('.momentum-strip')){const mission=shell.querySelector('.next-mission');if(mission)mission.insertAdjacentHTML('afterend',milestoneStrip());}if(state.momentum.overlay){const root=document.getElementById('modalRoot');if(root)root.innerHTML=momentumOverlay();}}
ensureMomentum();save();render();
