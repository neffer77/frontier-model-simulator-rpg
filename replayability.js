// Item 11 — replayability, run archetypes, difficulty modes, challenges, and persistent career archive.
(function(){
  const META_KEY='frontier-replay-meta-v1',SETUP_KEY='frontier-run-setup-v1',VERSION=1;
  const DIFFICULTIES={
    apprentice:{name:'Apprentice',tag:'Learn with margin',cash:1.25,compute:1.25,funding:1.10,deadline:1.25,wrongDays:0,wrongCashM:0,score:.75,desc:'More runway and compute. Technical answers are unchanged.'},
    standard:{name:'Standard',tag:'Canonical simulation',cash:1,compute:1,funding:1,deadline:1,wrongDays:0,wrongCashM:0,score:1,desc:'The canonical Item 9 economy and pacing.'},
    frontier:{name:'Frontier',tag:'Tighter operating margin',cash:.90,compute:.90,funding:.90,deadline:.90,wrongDays:1,wrongCashM:.08,score:1.35,desc:'Less starting/funding margin and costly wrong diagnoses.'},
    redline:{name:'Redline',tag:'Expert pressure test',cash:.75,compute:.75,funding:.80,deadline:.80,wrongDays:2,wrongCashM:.18,score:1.75,desc:'Severe capital/compute pressure and unforgiving incident mistakes.'}
  };
  const ARCHETYPES={
    research:{name:'Research Lab',tag:'Capability discovery',cash:.90,compute:1.05,research:2,reputation:0,desc:'Start with +2 insight; each newly shipped model adds +1 extra insight.'},
    systems:{name:'Systems Lab',tag:'Training infrastructure',cash:.95,compute:1.25,research:0,reputation:0,desc:'+25% starting compute and 15% refund on infrastructure expansion.'},
    data:{name:'Data & Evals Lab',tag:'Measurement discipline',cash:1,compute:.95,research:1,reputation:0,desc:'+1 insight; first passing release gate per model earns +1 insight and reputation.'},
    product:{name:'Product Lab',tag:'Market pull',cash:1.20,compute:.85,research:0,reputation:1,desc:'+20% starting cash / +1 reputation, but less compute; shipped models return extra cash.'}
  };
  const CHALLENGES={
    scale:{name:'Scale Race',tag:'Reach frontier scale',baseDeadline:120,desc:'Ship a 30B-or-larger model before the deadline.',progress(){const p=maxParams();return {success:p>=30,lines:[`Largest shipped model: ${fmt(p,1)}B / 30B`,`Deadline: Day ${deadline()}`]}}},
    capital:{name:'Capital Discipline',tag:'Scale without losing control',baseDeadline:100,desc:'Ship ≥7B while maintaining ≥3 months runway and no more than 2 unresolved/accepted debt items.',progress(){const p=maxParams(),r=runway(),d=debtCount();return {success:p>=7&&r>=3&&d<=2,lines:[`Model scale: ${fmt(p,1)}B / 7B`,`Runway: ${r.toFixed(1)} / 3.0 months`,`Debt pressure: ${d} / 2 max`,`Deadline: Day ${deadline()}`]}}},
    incident:{name:'Incident Commander',tag:'Evidence under pressure',baseDeadline:110,desc:'Resolve 4 incidents with at most 1 wrong diagnosis and ship at least one model.',progress(){const s=state.balancePacing?.stats||{},models=state.models?.length||0;return {success:(s.incidentsResolved||0)>=4&&(s.wrongIncidentChoices||0)<=1&&models>=1,lines:[`Resolved: ${s.incidentsResolved||0} / 4`,`Wrong diagnoses: ${s.wrongIncidentChoices||0} / 1 max`,`Models shipped: ${models} / 1`,`Deadline: Day ${deadline()}`]}}},
    generalist:{name:'Frontier Generalist',tag:'Build transferable mastery',baseDeadline:130,desc:'Reach Applied-or-better in 4 concepts and ship a 7B-or-larger model.',progress(){const n=Object.values(state.knowledge||{}).filter(v=>Number(v)>=3).length,p=maxParams();return {success:n>=4&&p>=7,lines:[`Applied+ concepts: ${n} / 4`,`Largest model: ${fmt(p,1)}B / 7B`,`Deadline: Day ${deadline()}`]}}},
    legacy:{name:'Legacy Company',tag:'Continue an existing save',baseDeadline:null,desc:'Ship a 30B-or-larger model. No deadline is imposed on migrated saves.',progress(){const p=maxParams();return {success:p>=30,lines:[`Largest shipped model: ${fmt(p,1)}B / 30B`,`No deadline — existing-save compatibility challenge`]}}}
  };
  const PERKS={none:{name:'No legacy perk',desc:'Pure new run.'},lesson:{name:'Carry One Lesson',desc:'+1 starting insight.'},compute:{name:'Supplier Relationship',desc:'+8,000 starting H100h.'},network:{name:'Founder Network',desc:'+$0.30M starting cash.'}};
  window.REPLAY_DIFFICULTIES=DIFFICULTIES;window.REPLAY_ARCHETYPES=ARCHETYPES;window.REPLAY_CHALLENGES=CHALLENGES;

  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}}
  function write(key,v){try{localStorage.setItem(key,JSON.stringify(v))}catch{}}
  function meta(){const m=read(META_KEY,{version:VERSION,points:0,completedRuns:[],bestDifficulty:null,archetypes:[],challenges:[]});m.completedRuns||=[];m.archetypes||=[];m.challenges||=[];m.points||=0;return m}
  function setup(){const s=read(SETUP_KEY,{difficulty:'standard',archetype:'research',challenge:'generalist',perk:'none'});if(!DIFFICULTIES[s.difficulty])s.difficulty='standard';if(!ARCHETYPES[s.archetype])s.archetype='research';if(!CHALLENGES[s.challenge]||s.challenge==='legacy')s.challenge='generalist';if(!PERKS[s.perk])s.perk='none';return s}
  function maxParams(){return Math.max(0,...(state.models||[]).map(m=>Number(m.paramsB||m.architecture?.parametersB||0)))}
  function debtCount(){return (state.techDebt?.items||[]).filter(x=>x.status==='open'||x.status==='accepted').length}
  function runway(){try{return Number(window.balanceRunwayMonths?.()??99)}catch{return 99}}
  function replayState(){return state.replay||null}
  function difficulty(){return DIFFICULTIES[replayState()?.difficulty]||DIFFICULTIES.standard}
  function challenge(){return CHALLENGES[replayState()?.challenge]||CHALLENGES.legacy}
  function deadline(){const r=replayState(),c=challenge();if(!c.baseDeadline)return Infinity;return r?.deadlineDay||Math.round(c.baseDeadline*difficulty().deadline)}
  function rankDifficulty(id){return ['apprentice','standard','frontier','redline'].indexOf(id)}
  function makeRunId(){return `RUN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`}
  function ensure(){
    if(!state.started)return null;
    if(!state.replay){state.replay={version:VERSION,runId:makeRunId(),difficulty:'standard',archetype:'legacy',challenge:'legacy',perk:'none',startedDay:state.day||1,deadlineDay:null,completed:false,failed:false,migrated:true,rewards:[]};save?.()}
    state.replay.version=VERSION;state.replay.rewards||=[];return state.replay
  }

  function applySetup(){
    const s=setup(),d=DIFFICULTIES[s.difficulty],a=ARCHETYPES[s.archetype],m=meta(),perk=m.completedRuns.length?(PERKS[s.perk]?s.perk:'none'):'none';
    state.replay={version:VERSION,runId:makeRunId(),difficulty:s.difficulty,archetype:s.archetype,challenge:s.challenge,perk,startedDay:1,deadlineDay:Math.round(CHALLENGES[s.challenge].baseDeadline*d.deadline),completed:false,failed:false,migrated:false,rewards:[]};
    state.cashM=Number((state.cashM*d.cash*a.cash).toFixed(3));state.compute=Math.round(state.compute*d.compute*a.compute);state.research=(state.research||0)+(a.research||0);state.reputation=(state.reputation||0)+(a.reputation||0);
    if(perk==='lesson')state.research++;else if(perk==='compute')state.compute+=8000;else if(perk==='network')state.cashM=Number((state.cashM+.30).toFixed(3));
    state.replay.starting={cashM:state.cashM,compute:state.compute,research:state.research,reputation:state.reputation};
  }

  window.replaySetupSet=function(kind,id){const s=setup();if(kind==='difficulty'&&DIFFICULTIES[id])s.difficulty=id;if(kind==='archetype'&&ARCHETYPES[id])s.archetype=id;if(kind==='challenge'&&CHALLENGES[id]&&id!=='legacy')s.challenge=id;if(kind==='perk'&&PERKS[id])s.perk=id;write(SETUP_KEY,s);decorateFounder()};

  if(typeof foundLab==='function'){
    const base=foundLab;foundLab=function(){if(!state.started)applySetup();return base()};
  }
  if(typeof checkFunding==='function'){
    const base=checkFunding;checkFunding=function(...args){const before={cash:Number(state.cashM||0),compute:Number(state.compute||0),claims:(state.fundingClaimed||[]).length},out=base(...args),r=ensure(),d=difficulty();if(r&&d.funding!==1&&(state.fundingClaimed||[]).length>before.claims){const dc=Math.max(0,(state.cashM||0)-before.cash),dh=Math.max(0,(state.compute||0)-before.compute);state.cashM=Number((before.cash+dc*d.funding).toFixed(3));state.compute=Math.round(before.compute+dh*d.funding);log?.(`Difficulty funding multiplier: ${Math.round(d.funding*100)}% of canonical round resources.`);save?.()}return out};
  }
  if(typeof solveIncident==='function'){
    const base=solveIncident;solveIncident=function(choice,...args){const r=ensure(),inc=INCIDENTS.find(x=>x.id===state.activeRun?.incident),row=inc?.choices?.find(x=>x[0]===choice),d=difficulty();if(r&&row&&!row[3]&&(d.wrongDays||d.wrongCashM)){state.day=(state.day||1)+d.wrongDays;state.cashM=Math.max(0,Number(((state.cashM||0)-d.wrongCashM).toFixed(3)));log?.(`Difficulty consequence: wrong diagnosis cost ${d.wrongDays}d and $${d.wrongCashM.toFixed(2)}M.`)}return base(choice,...args)};
  }
  if(typeof upgradeInfra==='function'){
    const base=upgradeInfra;upgradeInfra=function(...args){const r=ensure(),beforeInfra=state.infra||1,beforeCash=Number(state.cashM||0),out=base(...args);if(r?.archetype==='systems'&&(state.infra||1)>beforeInfra){const spent=Math.max(0,beforeCash-Number(state.cashM||0)),refund=Number((spent*.15).toFixed(3));if(refund>0){state.cashM=Number(((state.cashM||0)+refund).toFixed(3));state.replay.rewards.push({day:state.day,type:'systems-infra',value:refund});log?.(`Systems Lab supplier leverage refunded $${refund.toFixed(2)}M of infrastructure spend.`);save?.();render()}}return out};
  }
  if(typeof completeRun==='function'){
    const base=completeRun;completeRun=function(...args){const before=state.models?.length||0,out=base(...args),r=ensure();if(r&&(state.models?.length||0)>before){const m=state.models.at(-1);if(r.archetype==='research'){state.research=(state.research||0)+1;r.rewards.push({day:state.day,type:'research-model',model:m.name,value:1});log?.('Research Lab: +1 insight from the completed model program.')}else if(r.archetype==='product'){const bonus=Number(((m.costM||0)*.08).toFixed(3));state.cashM=Number(((state.cashM||0)+bonus).toFixed(3));r.rewards.push({day:state.day,type:'product-model',model:m.name,value:bonus});log?.(`Product Lab: $${bonus.toFixed(2)}M additional model-driven commercial return.`)}save?.();render()}return out};
  }
  if(typeof runReleaseGate==='function'){
    const base=runReleaseGate;runReleaseGate=function(...args){const out=base(...args),r=ensure();if(r?.archetype==='data'&&state.dataEvals?.lastGate?.pass){const model=state.models?.at(-1),key=`eval-${model?.id||model?.name||'none'}`;if(!r.rewards.some(x=>x.key===key)){state.research=(state.research||0)+1;state.reputation=(state.reputation||0)+1;r.rewards.push({day:state.day,type:'data-gate',key,value:1});log?.('Data & Evals Lab: trusted release evidence earned +1 insight and +1 reputation.');save?.();render()}}return out};
  }

  function progress(){const r=ensure();if(!r)return null;const c=challenge(),p=c.progress(),dl=deadline(),expired=Number.isFinite(dl)&&(state.day||1)>dl&&!r.completed;return {...p,success:!!p.success&&!expired,failed:expired,deadline:dl,challenge:c}}
  function medal(day,dl){if(!Number.isFinite(dl))return'bronze';const x=day/dl;return x<=.65?'gold':x<=.85?'silver':'bronze'}
  function recordCompletion(){
    const r=ensure();if(!r||r.completed)return;const p=progress();if(!p?.success){if(p?.failed&&!r.failed){r.failed=true;save?.()}return}
    r.completed=true;r.completedDay=state.day||1;r.medal=medal(r.completedDay,p.deadline);const d=DIFFICULTIES[r.difficulty]||DIFFICULTIES.standard,a=ARCHETYPES[r.archetype],c=CHALLENGES[r.challenge],m=meta();const basePoints={bronze:1,silver:2,gold:3}[r.medal]||1,points=Math.max(1,Math.round(basePoints*d.score));
    if(!m.completedRuns.some(x=>x.runId===r.runId)){m.completedRuns.unshift({runId:r.runId,company:state.company,difficulty:r.difficulty,archetype:r.archetype,challenge:r.challenge,medal:r.medal,points,day:r.completedDay,maxParamsB:maxParams(),models:state.models?.length||0});m.completedRuns=m.completedRuns.slice(0,50);m.points+=points;if(a&&!m.archetypes.includes(r.archetype))m.archetypes.push(r.archetype);if(c&&!m.challenges.includes(r.challenge))m.challenges.push(r.challenge);if(!m.bestDifficulty||rankDifficulty(r.difficulty)>rankDifficulty(m.bestDifficulty))m.bestDifficulty=r.difficulty;write(META_KEY,m)}
    save?.();window.gameFeelMilestone?.(`${r.medal.toUpperCase()} RUN CLEAR`,`${c.name} completed on Day ${r.completedDay}. +${points} career point${points===1?'':'s'}. New Game+ preserves this record.`)
  }
  window.replayReport=function(){const r=ensure(),p=progress(),m=meta();return {run:r,progress:p?{success:p.success,failed:p.failed,deadline:Number.isFinite(p.deadline)?p.deadline:null,lines:p.lines}:null,career:{points:m.points,completedRuns:m.completedRuns.length,bestDifficulty:m.bestDifficulty,archetypes:[...m.archetypes],challenges:[...m.challenges]}}};

  function choices(obj,kind,selected){return Object.entries(obj).map(([id,x])=>`<button type="button" class="replay-choice ${selected===id?'selected':''}" onclick="replaySetupSet('${kind}','${id}')"><b>${esc(x.name)}</b><span>${esc(x.tag||'')}</span><small>${esc(x.desc)}</small></button>`).join('')}
  function decorateFounder(){
    if(state.started)return;document.querySelector('.replay-founder')?.remove();const card=document.querySelector('.founder-card'),launch=card?.querySelector('button.primary.huge');if(!card||!launch)return;const s=setup(),m=meta(),box=document.createElement('section');box.className='replay-founder';box.innerHTML=`<div class="replay-founder-head"><div><span>RUN CONFIGURATION</span><b>What kind of frontier lab are you founding?</b></div><em>${m.completedRuns.length} career clear${m.completedRuns.length===1?'':'s'} · ${m.points} pts</em></div><h3>Difficulty</h3><div class="replay-choice-grid">${choices(DIFFICULTIES,'difficulty',s.difficulty)}</div><h3>Lab archetype</h3><div class="replay-choice-grid">${choices(ARCHETYPES,'archetype',s.archetype)}</div><h3>Run challenge</h3><div class="replay-choice-grid">${choices(Object.fromEntries(Object.entries(CHALLENGES).filter(([k])=>k!=='legacy')),'challenge',s.challenge)}</div>${m.completedRuns.length?`<h3>New Game+ legacy perk</h3><div class="replay-choice-grid compact">${Object.entries(PERKS).map(([id,x])=>`<button type="button" class="replay-choice ${s.perk===id?'selected':''}" onclick="replaySetupSet('perk','${id}')"><b>${esc(x.name)}</b><small>${esc(x.desc)}</small></button>`).join('')}</div>`:''}<p class="replay-rule">Difficulty changes resource margin, deadlines, and consequences—not technical formulas, evidence, or correct incident diagnoses.</p>`;launch.parentNode.insertBefore(box,launch)
  }
  function runCard(){const r=ensure(),p=progress(),d=DIFFICULTIES[r.difficulty]||DIFFICULTIES.standard,a=ARCHETYPES[r.archetype]||{name:'Legacy save'},c=CHALLENGES[r.challenge]||CHALLENGES.legacy;return `<section class="replay-run ${r.completed?'complete':p.failed?'failed':''}"><header><div><span>ACTIVE RUN</span><h2>${esc(c.name)}</h2><p>${esc(d.name)} · ${esc(a.name)} · ${esc(c.desc)}</p></div><b>${r.completed?`${r.medal.toUpperCase()} CLEAR`:p.failed?'DEADLINE MISSED':Number.isFinite(p.deadline)?`DAY ${state.day} / ${p.deadline}`:`DAY ${state.day}`}</b></header><div class="replay-progress-lines">${p.lines.map(x=>`<div>${esc(x)}</div>`).join('')}</div></section>`}
  function archivePage(){const m=meta();return `<div class="replay-shell"><header class="replay-head"><div><div class="eyebrow">ITEM 11 · REPLAYABILITY</div><h1>Run Archive</h1><p>Each run changes operating pressure and strategic incentives while preserving the same technical truths.</p></div><button onclick="replayClose()">Return to company</button></header>${runCard()}<section class="replay-career"><div><span>Career points</span><b>${m.points}</b></div><div><span>Completed runs</span><b>${m.completedRuns.length}</b></div><div><span>Best difficulty</span><b>${esc(DIFFICULTIES[m.bestDifficulty]?.name||'—')}</b></div><div><span>Archetypes cleared</span><b>${m.archetypes.length}/${Object.keys(ARCHETYPES).length}</b></div></section><section class="replay-card"><header><div><span>CAREER HISTORY</span><h2>Completed challenge runs</h2></div><button class="danger" onclick="replayNewRun()">Start a new run</button></header>${m.completedRuns.length?`<div class="replay-history">${m.completedRuns.map(x=>`<article><b>${esc(x.medal.toUpperCase())} · ${esc(x.company)}</b><span>${esc(DIFFICULTIES[x.difficulty]?.name||x.difficulty)} · ${esc(ARCHETYPES[x.archetype]?.name||x.archetype)} · ${esc(CHALLENGES[x.challenge]?.name||x.challenge)}</span><small>Day ${x.day} · ${fmt(x.maxParamsB,1)}B max · ${x.models} models · +${x.points} pts</small></article>`).join('')}</div>`:'<p>No clears yet. Complete the active run challenge to unlock New Game+ perks.</p>'}</section><section class="replay-card"><h2>Replay matrix</h2><p>${Object.keys(DIFFICULTIES).length} difficulties × ${Object.keys(ARCHETYPES).length} archetypes × ${Object.keys(CHALLENGES).length-1} fresh-run challenges = <b>${Object.keys(DIFFICULTIES).length*Object.keys(ARCHETYPES).length*(Object.keys(CHALLENGES).length-1)} core combinations</b> before company decisions diverge.</p></section></div>`}
  window.replayOpen=()=>{ensure();state.view='replay';save();render()};window.replayClose=()=>{state.view='company';save();render()};
  window.replayNewRun=()=>{if(!confirm('Start a new company run? The current company save will be replaced, but your Run Archive and New Game+ unlocks remain.'))return;localStorage.removeItem('frontier-lab-v3');location.reload()};

  function decorate(){
    if(!state.started){decorateFounder();return}recordCompletion();if(state.view==='replay')return;document.querySelector('.replay-hud')?.remove();const shell=document.querySelector('.game-shell');if(!shell)return;const r=ensure(),p=progress(),c=CHALLENGES[r.challenge],d=DIFFICULTIES[r.difficulty],el=document.createElement('button');el.className=`replay-hud ${r.completed?'complete':p.failed?'failed':''}`;el.onclick=window.replayOpen;el.innerHTML=`<span>RUN · ${esc(d.name.toUpperCase())}</span><b>${r.completed?`${r.medal.toUpperCase()} CLEAR`:esc(c.name)}</b><small>${r.completed?'Open career archive →':p.failed?'Deadline missed · keep playing or start a new run →':Number.isFinite(p.deadline)?`Day ${state.day}/${p.deadline} · ${esc(c.tag)} →`:`Day ${state.day} · ${esc(c.tag)} →`}</small>`;shell.insertBefore(el,shell.children[1]||null)
  }
  const baseRender=render;render=function(){if(state.started)ensure();if(state.view==='replay'){document.getElementById('app').innerHTML=archivePage();return}const out=baseRender();requestAnimationFrame(decorate);return out};requestAnimationFrame(decorateFounder);if(state.started)requestAnimationFrame(decorate)
})();