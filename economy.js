// V3 company metagame. Loaded after frontier-lab.js so the technical simulator remains separable.
const FUNDING=[
  {id:"seed",rep:4,cash:3,label:"Seed round"},
  {id:"seriesA",rep:15,cash:8,label:"Series A"},
  {id:"growth",rep:35,cash:25,label:"Frontier growth round"},
  {id:"mega",rep:75,cash:80,label:"Strategic compute round"}
];
const WORLD_EVENTS=[
  {text:"An enterprise design partner prepays for model access.",cash:.25},
  {text:"A cloud provider opens a temporary block of accelerator capacity.",compute:750},
  {text:"Your systems team lands a kernel optimization and recovers wasted cluster time.",compute:450},
  {text:"A respected researcher cites your lab's work. Recruiting gets easier.",rep:1},
  {text:"Helix Frontier publishes a strong architecture result. The competitive bar rises.",rival:2}
];
function ensureMeta(){
  if(!state.fundingClaimed) state.fundingClaimed=[];
  if(!state.rivalBoost) state.rivalBoost=0;
}
function checkFunding(){
  ensureMeta();
  for(const f of FUNDING){
    if(state.reputation>=f.rep&&!state.fundingClaimed.includes(f.id)){
      state.fundingClaimed.push(f.id);
      state.cashM+=f.cash;
      log(`💰 ${f.label} closed: +$${f.cash}M. Technical credibility unlocked new company scale.`);
    }
  }
}
function maybeWorldEvent(){
  if(Math.random()>.16||state.selectedIncident)return;
  ensureMeta();
  const e=WORLD_EVENTS[Math.floor(Math.random()*WORLD_EVENTS.length)];
  if(e.cash)state.cashM+=e.cash;
  if(e.compute)state.compute+=e.compute;
  if(e.rep)state.reputation+=e.rep;
  if(e.rival)state.rivalBoost+=e.rival;
  log(`🌐 WORLD — ${e.text}${e.cash?` +$${e.cash}M`:""}${e.compute?` +${e.compute} H100h`:""}`);
}
function rivalScore(){ensureMeta();return Math.round(48+state.day*.16+state.rivalBoost)}
function playerScore(){return state.models.length?state.models[state.models.length-1].score:0}
function marketPulse(){
  if(!state.started)return;
  const host=document.querySelector(".campus");
  if(!host)return;
  const old=host.querySelector(".market-pulse");if(old)old.remove();
  const gap=playerScore()-rivalScore();
  host.insertAdjacentHTML("beforeend",`<div class="market-pulse"><span>MODEL RACE</span><b>${esc(state.company)} ${playerScore()||"—"}</b><i>${gap>=0?"▲":"▼"} ${Math.abs(gap)} vs Helix ${rivalScore()}</i></div>`);
}
const _render=render;
render=function(){_render();marketPulse()};
const _completeRun=completeRun;
completeRun=function(){_completeRun();checkFunding();save();render()};
const _advanceRun=advanceRun;
advanceRun=function(){_advanceRun();if(state.activeRun&&!state.selectedIncident){maybeWorldEvent();checkFunding();save();render()}};
ensureMeta();checkFunding();save();render();
