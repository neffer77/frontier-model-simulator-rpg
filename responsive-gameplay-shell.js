// Responsive gameplay shell — one simulation, adaptive guidance/navigation for phone and desktop.
(function(){
  const g=window;
  const q=s=>document.querySelector(s);
  const safe=(name,...args)=>typeof g[name]==='function'?g[name](...args):undefined;

  function goCompany(anchor){
    state.view='company';save();render();
    if(anchor)requestAnimationFrame(()=>requestAnimationFrame(()=>q(anchor)?.scrollIntoView({block:'start',behavior:'smooth'})));
  }
  function goTeam(){if(typeof g.hiringOpen==='function')g.hiringOpen();else goCompany()}
  function goModels(){const m=state.models?.at(-1);if(m&&typeof g.modelLabSelect==='function')g.modelLabSelect(m.id);else goCompany('.run')}
  function goData(){if(typeof g.dataEvalsOpen==='function')g.dataEvalsOpen();else goCompany()}
  function goMore(){document.body.classList.toggle('gameplay-menu-open')}
  function closeMore(){document.body.classList.remove('gameplay-menu-open')}

  g.gameplayGoHome=()=>{closeMore();goCompany()};
  g.gameplayGoTrain=()=>{closeMore();goCompany('.run')};
  g.gameplayGoTeam=()=>{closeMore();goTeam()};
  g.gameplayGoModels=()=>{closeMore();goModels()};
  g.gameplayGoData=()=>{closeMore();goData()};
  g.gameplayToggleMenu=()=>goMore();
  g.gameplayCloseMenu=()=>closeMore();
  g.gameplayOpen=function(name){closeMore();if(typeof g[name]==='function')g[name();};

  function currentObjective(){
    if(!state?.started)return null;
    const run=state.activeRun;
    if(run?.incident){return {kicker:'URGENT',title:'Stabilize the training run',body:'An active incident is blocking useful progress. Diagnose it before spending more compute.',cta:'Open training',action:'gameplayGoTrain()',tone:'danger'};}
    if(run&&Number(run.progress||0)<100){return {kicker:'CURRENT RUN',title:`Advance ${run.name||'the training run'}`,body:`Training is ${Math.round(run.progress||0)}% complete. Continue the run, watch telemetry, and react to failures.`,cta:'Open training',action:'gameplayGoTrain()',tone:'active'};}
    if(!(state.models?.length)){return {kicker:'FIRST MILESTONE',title:'Train your first model',body:'Your lab exists; now turn compute and engineering choices into a real model lineage.',cta:'Choose a model run',action:'gameplayGoTrain()',tone:'active'};}
    const cap=typeof g.hiringCapacity==='function'?g.hiringCapacity():null;
    if(cap?.headcountLeft>0&&(state.npcEmployees?.length||0)<8){return {kicker:'BUILD THE LAB',title:'Add missing expertise',body:'Your first model exists. Strengthen the team so later training, data, eval, and reliability decisions have owners.',cta:'Review hiring',action:'gameplayGoTeam()',tone:'normal'};}
    const openDebt=state.techDebt?.items?.filter(x=>x.status==='open').length||0;
    if(openDebt>=3&&typeof g.techDebtOpen==='function'){return {kicker:'RISK',title:'Technical debt is compounding',body:`${openDebt} open debt items are increasing engineering drag and future incident risk.`,cta:'Review tech debt',action:'techDebtOpen()',tone:'warning'};}
    return {kicker:'NEXT MOVE',title:'Choose the lab’s next commitment',body:'Review training, people, models, or the broader company systems. Your choices now shape later cost, trust, and reliability.',cta:'Open home',action:'gameplayGoHome()',tone:'normal'};
  }

  const viewHelp={
    workforce:['WORKFORCE PLANNING','Make sure critical roles have owners and backups before growth creates hidden single points of failure.'],
    hiring:['HIRING + ORG','Hire for the bottleneck you actually have, then give teams clear ownership.'],
    policy:['POLICY & REGULATION','Trade market access against regulatory risk, export exposure, and institutional trust.'],
    modelLab:['MODEL LAB','Inspect lineage, run controlled experiments, and turn results into permanent technical knowledge.'],
    dataEvals:['DATA + EVALS','Improve provenance and release evidence before model quality problems become launch problems.'],
    company:['LAB COMMAND','Pick one meaningful commitment. You do not need to manage every system every turn.']
  };
  function helpForView(){return viewHelp[state.view]||[String(state.view||'SYSTEM').replace(/([A-Z])/g,' $1').toUpperCase(),'Make one decision, observe the consequence, then return to the company view when you need context.'];}

  const menuItems=[
    ['Data + Evals','dataEvalsOpen'],['Technical Debt','techDebtOpen'],['Operations','opsOpen'],['Reliability','sloOpen'],['Releases','releaseGovOpen'],['Roadmap','roadmapPressureOpen'],['Capital','financeStrategyOpen'],['Governance','governanceOpen'],['Executives','execPoliticsOpen'],['People + Memory','talentMemoryOpen'],['Workforce','workforceOpen'],['Projects','portfolioOpen'],['Programs','programOpen'],['Strategy','strategyOpen'],['Investment','committeeOpen'],['Competition','competitiveOpen'],['Ecosystem','ecosystemOpen'],['Policy','policyOpen'],['Communications','communicationsOpen']
  ];

  function renderGuidance(){
    if(!state?.started)return;
    document.querySelectorAll('.gameplay-guidance,.gameplay-bottom-nav,.gameplay-more-sheet').forEach(x=>x.remove());
    const app=document.getElementById('app');if(!app)return;
    const obj=currentObjective(),help=helpForView();

    const guide=document.createElement('section');guide.className=`gameplay-guidance ${obj?.tone||'normal'}`;
    guide.innerHTML=`<div class="gameplay-guide-copy"><span>${help[0]}</span><b>${help[1]}</b></div>${obj?`<div class="gameplay-objective"><small>${obj.kicker}</small><strong>${obj.title}</strong><p>${obj.body}</p><button onclick="${obj.action}">${obj.cta} →</button></div>`:''}`;
    app.prepend(guide);

    const nav=document.createElement('nav');nav.className='gameplay-bottom-nav';nav.setAttribute('aria-label','Game navigation');
    nav.innerHTML=`<button onclick="gameplayGoHome()"><i>⌂</i><span>Home</span></button><button onclick="gameplayGoTrain()"><i>△</i><span>Train</span></button><button onclick="gameplayGoTeam()"><i>◎</i><span>Team</span></button><button onclick="gameplayGoModels()"><i>◇</i><span>Models</span></button><button onclick="gameplayToggleMenu()"><i>•••</i><span>More</span></button>`;
    document.body.appendChild(nav);

    const sheet=document.createElement('aside');sheet.className='gameplay-more-sheet';sheet.innerHTML=`<div class="gameplay-sheet-backdrop" onclick="gameplayCloseMenu()"></div><section><header><div><span>LAB SYSTEMS</span><b>Choose a system</b></div><button onclick="gameplayCloseMenu()">×</button></header><div class="gameplay-system-grid">${menuItems.filter(([,fn])=>typeof g[fn]==='function').map(([label,fn])=>`<button onclick="gameplayOpen('${fn}')">${label}<span>→</span></button>`).join('')}</div></section>`;
    document.body.appendChild(sheet);
  }

  const baseRender=g.render;
  if(typeof baseRender==='function'){
    g.render=function(){const out=baseRender();requestAnimationFrame(renderGuidance);return out;};
    requestAnimationFrame(renderGuidance);
  }
})();