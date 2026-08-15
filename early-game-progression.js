// Item 7 — Guided early-game progression.
(function(){
  const g=window;
  const VERSION=1;
  const SYSTEM_LABELS={dataEvalsOpen:'Data + Evals',techDebtOpen:'Technical Debt',opsOpen:'Operations',sloOpen:'Reliability',releaseGovOpen:'Releases',roadmapPressureOpen:'Roadmap',financeStrategyOpen:'Capital',governanceOpen:'Governance',execPoliticsOpen:'Executives',talentMemoryOpen:'People + Memory',workforceOpen:'Workforce',portfolioOpen:'Projects',programOpen:'Programs',strategyOpen:'Strategy',committeeOpen:'Investment',competitiveOpen:'Competition',ecosystemOpen:'Ecosystem',policyOpen:'Policy',communicationsOpen:'Communications'};
  const CORE_LABELS={home:'Home',train:'Training',models:'Models',team:'Team'};
  const ALL_SYSTEMS=Object.keys(SYSTEM_LABELS);
  const STAGES={
    firstCall:{n:1,total:7,kicker:'CHAPTER 1 · FIRST CALL',title:'Choose the first experiment',body:'Start small enough to learn. Pick a model tier you can afford and make the lab produce evidence before prestige.',cta:'Choose a training run',action:'gameplayGoTrain',unlocks:['dataEvalsOpen'],core:['home','train']},
    training:{n:2,total:7,kicker:'CHAPTER 2 · TRAINING',title:'Keep the first run moving',body:'Advance the run and watch what changes. The first goal is not a giant model; it is a clean technical loop.',cta:'Open training',action:'gameplayGoTrain',unlocks:['dataEvalsOpen'],core:['home','train']},
    failure:{n:3,total:7,kicker:'CHAPTER 3 · FIRST FAILURE',title:'Diagnose before reacting',body:'Your first run has failed in a useful way. Inspect the evidence, choose the explanation that fits it, and recover deliberately.',cta:'Open incident',action:'gameplayGoTrain',tone:'danger',unlocks:['dataEvalsOpen'],core:['home','train']},
    recover:{n:4,total:7,kicker:'CHAPTER 4 · RECOVERY',title:'Finish the run you repaired',body:'You have recovered from a real failure. Finish the run and preserve what you learned in the company history.',cta:'Finish training',action:'gameplayGoTrain',unlocks:['dataEvalsOpen','techDebtOpen'],core:['home','train']},
    firstModel:{n:5,total:7,kicker:'CHAPTER 5 · FIRST MODEL',title:'Turn a model into organizational memory',body:'You shipped a model. Inspect its lineage and evidence before you add more people or scale the next bet.',cta:'Open Model Lab',action:'gameplayGoModels',unlocks:['dataEvalsOpen','techDebtOpen'],core:['home','train','models']},
    firstHire:{n:6,total:7,kicker:'CHAPTER 6 · BUILD THE LAB',title:'Make your first deliberate hire',body:'Interview for the bottleneck you actually have and close one hire. The lab should gain expertise, not just headcount.',cta:'Open hiring',action:'gameplayGoTeam',unlocks:['dataEvalsOpen','techDebtOpen','opsOpen','sloOpen'],core:['home','train','models','team']},
    tradeoff:{n:7,total:7,kicker:'CHAPTER 7 · COMPANY BET',title:'Choose what the company optimizes for next',body:'A lab cannot maximize research velocity, reliability, and market pressure simultaneously. Pick the bias you want the next phase to inherit.',cta:'Choose company priority',action:'campaignOpenPriority',unlocks:['dataEvalsOpen','techDebtOpen','opsOpen','sloOpen','releaseGovOpen','roadmapPressureOpen','financeStrategyOpen'],core:['home','train','models','team']},
    graduated:{n:7,total:7,kicker:'EARLY GAME COMPLETE',title:'The full company is now yours',body:'You have trained, failed, recovered, shipped, hired, and made a company-level tradeoff. Advanced systems are now unlocked.',cta:'Open systems',action:'gameplayToggleMenu',tone:'active',unlocks:ALL_SYSTEMS,core:['home','train','models','team']}
  };
  const STAGE_ORDER=Object.keys(STAGES);

  function ensure(){state.campaign ||= {version:VERSION,failureInjected:false,modelReviewed:false,companyPriority:null,graduated:false};state.campaign.modelReviewed=!!state.campaign.modelReviewed;state.campaign.version=VERSION}
  function hired(){return (state.hiring?.candidates||[]).some(c=>c.status==='hired')||(state.npcEmployees||[]).some(e=>String(e.id||'').startsWith('hire-'))}
  function stageId(){ensure();if(state.campaign.graduated||state.campaign.companyPriority)return 'graduated';const models=state.models?.length||0,r=state.activeRun,history=state.runHistory||[];if(models>0&&!state.campaign.modelReviewed)return 'firstModel';if(models>0&&!hired())return 'firstHire';if(models>0&&hired())return 'tradeoff';if(r?.incident)return 'failure';if(r&&history.length>0)return 'recover';if(r)return 'training';if(history.length>0&&!models)return 'recover';return 'firstCall'}
  function current(){const id=stageId();return {id,...STAGES[id]}}
  function resolveTarget(target){
    const raw=String(target||'').trim();
    if(SYSTEM_LABELS[raw])return {kind:'system',id:raw,label:SYSTEM_LABELS[raw]};
    if(CORE_LABELS[raw])return {kind:'core',id:raw,label:CORE_LABELS[raw]};
    const system=Object.entries(SYSTEM_LABELS).find(([,label])=>label.toLowerCase()===raw.toLowerCase());
    if(system)return {kind:'system',id:system[0],label:system[1]};
    const core=Object.entries(CORE_LABELS).find(([,label])=>label.toLowerCase()===raw.toLowerCase());
    if(core)return {kind:'core',id:core[0],label:core[1]};
    return null;
  }
  function targetStage(target){
    const t=resolveTarget(target);if(!t)return null;
    const id=STAGE_ORDER.find(stage=>t.kind==='system'?STAGES[stage].unlocks.includes(t.id):STAGES[stage].core.includes(t.id));
    return id?{...t,stageId:id,stage:STAGES[id]}:null;
  }
  function unlockPlan(target){
    const resolved=targetStage(target);if(!resolved)return null;
    const now=current(),currentIndex=STAGE_ORDER.indexOf(now.id),targetIndex=STAGE_ORDER.indexOf(resolved.stageId);
    const unlocked=resolved.kind==='system'?now.unlocks.includes(resolved.id):now.core.includes(resolved.id);
    const progress=unlocked?100:Math.max(0,Math.min(99,Math.round((Math.max(0,currentIndex)+1)/(targetIndex+1)*100)));
    return {
      target:resolved.id,label:resolved.label,kind:resolved.kind,unlocked,
      currentStageId:now.id,currentKicker:now.kicker,currentTitle:now.title,currentBody:now.body,currentAction:now.action,currentCta:now.cta,currentChapter:now.n,
      unlockStageId:resolved.stageId,unlockKicker:resolved.stage.kicker,unlockTitle:resolved.stage.title,unlockChapter:resolved.stage.n,
      progress,remainingStages:Math.max(0,targetIndex-currentIndex)
    };
  }

  g.campaignCurrentStage=current;
  g.campaignObjective=()=>{if(!state?.started)return null;const s=current();return {kicker:s.kicker,title:s.title,body:s.body,cta:s.cta,action:s.action,tone:s.tone||'active'}};
  g.campaignCoreUnlocked=name=>current().core.includes(name);
  g.campaignSystemUnlocked=fn=>current().unlocks.includes(fn);
  g.campaignUnlockPlan=unlockPlan;
  g.campaignUnlockRegistry=()=>[
    ...Object.entries(CORE_LABELS).map(([id,label])=>unlockPlan(id)||{target:id,label,kind:'core'}),
    ...Object.entries(SYSTEM_LABELS).map(([id,label])=>unlockPlan(id)||{target:id,label,kind:'system'})
  ];
  g.campaignMarkModelReviewed=()=>{ensure();if((state.models?.length||0)>0&&!state.campaign.modelReviewed){state.campaign.modelReviewed=true;save()}};
  g.campaignLockedSystem=target=>{
    const plan=unlockPlan(target),label=plan?.label||String(target||'System');
    log?.(`🔒 ${label} unlocks ${plan?.unlockKicker?`at ${plan.unlockKicker}`:'later in the guided campaign'}.`);save();
    if(typeof g.frontierLockedStateOpen==='function')return g.frontierLockedStateOpen(plan||target);
    render();
  };
  g.campaignOpenPriority=()=>{document.body.classList.add('campaign-priority-open');renderPriority()};
  g.campaignClosePriority=()=>{document.body.classList.remove('campaign-priority-open');document.querySelector('.campaign-priority')?.remove()};
  g.campaignChoosePriority=choice=>{ensure();state.campaign.companyPriority=choice;state.campaign.graduated=true;log?.(`🏁 Early-game campaign complete. Company priority: ${choice}.`);save();g.campaignClosePriority();render()};
  function renderPriority(){document.querySelector('.campaign-priority')?.remove();if(!document.body.classList.contains('campaign-priority-open'))return;const el=document.createElement('div');el.className='campaign-priority';el.innerHTML=`<div class="campaign-priority-backdrop" onclick="campaignClosePriority()"></div><section><span>CHAPTER 7 · COMPANY BET</span><h2>What should the lab optimize for next?</h2><p>This does not lock you into one path forever. It establishes the bias of the next chapter and unlocks the full management simulator.</p><div class="campaign-choice-grid"><button onclick="campaignChoosePriority('Research velocity')"><b>Research velocity</b><small>Protect experimentation speed and frontier capability bets.</small></button><button onclick="campaignChoosePriority('Reliability first')"><b>Reliability first</b><small>Favor operational maturity, evidence, and durable systems.</small></button><button onclick="campaignChoosePriority('Market pressure')"><b>Market pressure</b><small>Favor commitments, timing, customers, and competitive positioning.</small></button></div><button class="campaign-cancel" onclick="campaignClosePriority()">Not yet</button></section>`;document.body.appendChild(el)}
  function renderProgress(){document.querySelector('.campaign-progress')?.remove();if(!state?.started)return;const s=current(),el=document.createElement('aside');el.className='campaign-progress';el.innerHTML=`<div><span>${s.kicker}</span><b>${s.title}</b></div><div class="campaign-dots">${Array.from({length:s.total},(_,i)=>`<i class="${i<s.n?'done':''}"></i>`).join('')}</div><small>${s.n} / ${s.total}</small>`;const guide=document.querySelector('.gameplay-guidance');if(guide)guide.insertAdjacentElement('afterend',el);else document.getElementById('app')?.prepend(el)}
  // Gate legacy home-screen launchers as well as the new responsive More menu.
  for(const fn of ALL_SYSTEMS){const base=g[fn];if(typeof base!=='function')continue;g[fn]=function(...args){if(!g.campaignSystemUnlocked(fn))return g.campaignLockedSystem(fn);return base(...args)}}
  const baseHiring=g.hiringOpen;
  if(typeof baseHiring==='function')g.hiringOpen=function(...args){if(!g.campaignCoreUnlocked('team'))return g.campaignLockedSystem('team');return baseHiring(...args)};
  const baseAdvance=g.advanceRun;
  if(typeof baseAdvance==='function')g.advanceRun=function(){ensure();const r=state.activeRun;if(r&&!state.campaign.failureInjected&&(state.models?.length||0)===0&&(state.runHistory||[]).length===0&&!r.incident&&Number(r.progress||0)>=25){r.incident='nan';state.selectedIncident='nan';state.campaign.failureInjected=true;log?.(`🔴 ${r.name}: the first campaign incident is ready for diagnosis.`);save();render();return}return baseAdvance()};
  const baseModelSelect=g.modelLabSelect;
  if(typeof baseModelSelect==='function')g.modelLabSelect=function(id){g.campaignMarkModelReviewed();return baseModelSelect(id)};
  const baseRender=g.render;
  if(typeof baseRender==='function')g.render=function(){ensure();const out=baseRender();requestAnimationFrame(()=>{renderProgress();renderPriority()});return out};
  ensure();
})();