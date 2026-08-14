// Item 7 — Guided early-game progression.
(function(){
  const g=window;
  const VERSION=1;
  const ALL_SYSTEMS=['dataEvalsOpen','techDebtOpen','opsOpen','sloOpen','releaseGovOpen','roadmapPressureOpen','financeStrategyOpen','governanceOpen','execPoliticsOpen','talentMemoryOpen','workforceOpen','portfolioOpen','programOpen','strategyOpen','committeeOpen','competitiveOpen','ecosystemOpen','policyOpen','communicationsOpen'];
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
  function ensure(){state.campaign ||= {version:VERSION,failureInjected:false,modelReviewed:false,companyPriority:null,graduated:false};state.campaign.modelReviewed=!!state.campaign.modelReviewed;state.campaign.version=VERSION}
  function hired(){return (state.hiring?.candidates||[]).some(c=>c.status==='hired')||(state.npcEmployees||[]).some(e=>String(e.id||'').startsWith('hire-'))}
  function stageId(){
    ensure();if(state.campaign.graduated||state.campaign.companyPriority)return 'graduated';
    const models=state.models?.length||0,r=state.activeRun,history=state.runHistory||[];
    if(models>0&&!state.campaign.modelReviewed)return 'firstModel';
    if(models>0&&!hired())return 'firstHire';
    if(models>0&&hired())return 'tradeoff';
    if(r?.incident)return 'failure';
    if(r&&history.length>0)return 'recover';
    if(r)return 'training';
    if(history.length>0&&!models)return 'recover';
    return 'firstCall';
  }
  function current(){const id=stageId();return {id,...STAGES[id]}}
  g.campaignCurrentStage=current;
  g.campaignObjective=()=>{if(!state?.started)return null;const s=current();return {kicker:s.kicker,title:s.title,body:s.body,cta:s.cta,action:s.action,tone:s.tone||'active'}};
  g.campaignCoreUnlocked=name=>current().core.includes(name);
  g.campaignSystemUnlocked=fn=>current().unlocks.includes(fn);
  g.campaignMarkModelReviewed=()=>{ensure();if((state.models?.length||0)>0&&!state.campaign.modelReviewed){state.campaign.modelReviewed=true;save()}};
  g.campaignLockedSystem=label=>{log?.(`🔒 ${label} unlocks later in the guided campaign.`);save();render()};
  g.campaignOpenPriority=()=>{document.body.classList.add('campaign-priority-open');renderPriority()};
  g.campaignClosePriority=()=>{document.body.classList.remove('campaign-priority-open');document.querySelector('.campaign-priority')?.remove()};
  g.campaignChoosePriority=choice=>{ensure();state.campaign.companyPriority=choice;state.campaign.graduated=true;log?.(`🏁 Early-game campaign complete. Company priority: ${choice}.`);save();g.campaignClosePriority();render()};
  function renderPriority(){
    document.querySelector('.campaign-priority')?.remove();if(!document.body.classList.contains('campaign-priority-open'))return;
    const el=document.createElement('div');el.className='campaign-priority';el.innerHTML=`<div class="campaign-priority-backdrop" onclick="campaignClosePriority()"></div><section><span>CHAPTER 7 · COMPANY BET</span><h2>What should the lab optimize for next?</h2><p>This does not lock you into one path forever. It establishes the bias of the next chapter and unlocks the full management simulator.</p><div class="campaign-choice-grid"><button onclick="campaignChoosePriority('Research velocity')"><b>Research velocity</b><small>Protect experimentation speed and frontier capability bets.</small></button><button onclick="campaignChoosePriority('Reliability first')"><b>Reliability first</b><small>Favor operational maturity, evidence, and durable systems.</small></button><button onclick="campaignChoosePriority('Market pressure')"><b>Market pressure</b><small>Favor commitments, timing, customers, and competitive positioning.</small></button></div><button class="campaign-cancel" onclick="campaignClosePriority()">Not yet</button></section>`;document.body.appendChild(el)
  }
  function renderProgress(){
    document.querySelector('.campaign-progress')?.remove();if(!state?.started)return;const s=current();
    const el=document.createElement('aside');el.className='campaign-progress';el.innerHTML=`<div><span>${s.kicker}</span><b>${s.title}</b></div><div class="campaign-dots">${Array.from({length:s.total},(_,i)=>`<i class="${i<s.n?'done':''}"></i>`).join('')}</div><small>${s.n} / ${s.total}</small>`;
    const guide=document.querySelector('.gameplay-guidance');if(guide)guide.insertAdjacentElement('afterend',el);else document.getElementById('app')?.prepend(el)
  }
  // Guarantee that a new player's first run produces one teachable incident instead of
  // relying on RNG. Existing saves and later runs retain normal incident randomness.
  const baseAdvance=g.advanceRun;
  if(typeof baseAdvance==='function')g.advanceRun=function(){ensure();const r=state.activeRun;if(r&&!state.campaign.failureInjected&&(state.models?.length||0)===0&&(state.runHistory||[]).length===0&&!r.incident&&Number(r.progress||0)>=25){r.incident='nan';state.selectedIncident='nan';state.campaign.failureInjected=true;log?.(`🔴 ${r.name}: the first campaign incident is ready for diagnosis.`);save();render();return}return baseAdvance()};
  const baseRender=g.render;
  if(typeof baseRender==='function')g.render=function(){ensure();const out=baseRender();requestAnimationFrame(()=>{renderProgress();renderPriority()});return out};
  ensure();
})();