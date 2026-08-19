// Item 13.10 — campaign-locked systems and local unavailable controls.
(function(){
  const TARGET_HINTS=[
    {target:'dataEvalsOpen',hints:['data + evals','data + eval','data evals']},
    {target:'techDebtOpen',hints:['technical debt','tech debt']},
    {target:'opsOpen',hints:['operations']},
    {target:'sloOpen',hints:['reliability','slos','slo']},
    {target:'releaseGovOpen',hints:['release governance','releases']},
    {target:'roadmapPressureOpen',hints:['executive roadmap','roadmap']},
    {target:'financeStrategyOpen',hints:['financing / capital','financing','capital strategy','capital']},
    {target:'governanceOpen',hints:['board governance','governance']},
    {target:'execPoliticsOpen',hints:['executive politics','executives']},
    {target:'talentMemoryOpen',hints:['people + memory','talent memory','people memory']},
    {target:'workforceOpen',hints:['workforce planning','workforce']},
    {target:'portfolioOpen',hints:['project portfolio','projects']},
    {target:'programOpen',hints:['program management','programs']},
    {target:'strategyOpen',hints:['portfolio strategy','strategy']},
    {target:'committeeOpen',hints:['investment committee','investment']},
    {target:'competitiveOpen',hints:['competitive intelligence','competition']},
    {target:'ecosystemOpen',hints:['ecosystem strategy','ecosystem']},
    {target:'policyOpen',hints:['policy + regulation','policy & regulation','policy','regulation']},
    {target:'communicationsOpen',hints:['public communications','communications']},
    {target:'team',hints:['hiring + org','hiring + organization']}
  ];
  let queued=false;
  const safeState=()=>{try{return typeof state!=='undefined'?state:null}catch{return null}};
  const normalize=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
  const planFor=target=>typeof window.campaignUnlockPlan==='function'?window.campaignUnlockPlan(target):null;

  function targetFor(el){
    const explicit=el.dataset?.campaignTarget||el.dataset?.flLockTarget;if(explicit)return explicit;
    const signal=normalize([el.className,el.getAttribute?.('aria-label'),el.getAttribute?.('title'),el.getAttribute?.('onclick'),String(el.onclick||''),el.textContent].filter(Boolean).join(' '));
    const hit=TARGET_HINTS.find(row=>signal.includes(row.target.toLowerCase())||row.hints.some(h=>signal.includes(h)));
    return hit?.target||null;
  }
  function metaLabel(plan){return plan.unlockStageId==='graduated'?'After Ch 7':`Ch ${plan.unlockChapter}`}
  function ensureLockMeta(el,plan){
    if(!(el instanceof HTMLButtonElement))return;
    let meta=[...el.children].find(x=>x.classList?.contains('fl-lock-meta'));
    if(!meta){meta=document.createElement('span');meta.className='fl-lock-meta';el.appendChild(meta)}
    meta.textContent=`🔒 ${metaLabel(plan)}`;
  }
  function removeLockMeta(el){for(const meta of el.querySelectorAll?.(':scope > .fl-lock-meta')||[])meta.remove()}
  function cleanupCampaign(el){
    el.classList.remove('fl-campaign-locked');removeLockMeta(el);
    delete el.dataset.flLockCopy;delete el.dataset.flLockTarget;
    if(el.dataset.flLockAriaOwned==='1'){el.removeAttribute('aria-disabled');delete el.dataset.flLockAriaOwned}
    if(el.dataset.flLockTitleOwned==='1'){el.removeAttribute('title');delete el.dataset.flLockTitleOwned}
  }
  function bindLockHandler(el){
    if(el.dataset.flLockHandler==='1')return;el.dataset.flLockHandler='1';
    el.addEventListener('click',event=>{
      const target=el.dataset.flLockTarget;if(!target)return;
      const plan=planFor(target);if(!plan||plan.unlocked)return;
      event.preventDefault();event.stopImmediatePropagation();
      if(typeof window.campaignLockedSystem==='function')window.campaignLockedSystem(target);else open(plan);
    },true);
  }
  function decorateCampaignControl(el){
    const target=targetFor(el);if(!target)return false;
    const plan=planFor(target);if(!plan){cleanupCampaign(el);return false}
    if(!el.dataset.campaignTarget)el.dataset.campaignTarget=target;
    el.dataset.flLockTarget=target;
    if(plan.unlocked){cleanupCampaign(el);return false}
    el.classList.add('fl-campaign-locked');
    el.dataset.flLockCopy=metaLabel(plan);
    if(!el.hasAttribute('aria-disabled')){el.setAttribute('aria-disabled','true');el.dataset.flLockAriaOwned='1'}
    if(!el.hasAttribute('title')){el.title=`${plan.label} unlocks at ${plan.unlockKicker}: ${plan.unlockTitle}.`;el.dataset.flLockTitleOwned='1'}
    ensureLockMeta(el,plan);bindLockHandler(el);return true;
  }
  function ensureCompanyPlaceholders(){
    const s=safeState(),app=document.getElementById('app');if(!s?.started||s.view!=='company'||!app)return;
    const registry=typeof window.campaignUnlockRegistry==='function'?window.campaignUnlockRegistry().filter(x=>x.kind==='system'):[];
    if(!registry.length)return;
    let hub=app.querySelector('.company-system-hub');
    if(!hub){
      const shell=app.querySelector('.game-shell');if(!shell)return;
      hub=document.createElement('section');hub.className='company-system-hub';hub.setAttribute('aria-label','Company systems');
      shell.appendChild(hub);
    }
    const existingTargets=new Set([...hub.querySelectorAll('button')].map(targetFor).filter(Boolean));
    let group=hub.querySelector('[data-fl-placeholder-group]');
    if(!group){group=document.createElement('div');group.className='fl-launch-group';group.dataset.flPlaceholderGroup='1';group.innerHTML='<div class="fl-launch-group-head"><span>COMPANY SYSTEMS</span><small>Future simulation surfaces remain visible while guided progression unlocks them.</small></div><div class="fl-launch-grid"></div>';hub.appendChild(group)}
    const grid=group.querySelector('.fl-launch-grid')||group;
    for(const plan of registry){
      if(existingTargets.has(plan.target)||grid.querySelector(`[data-campaign-target="${plan.target}"]`))continue;
      const button=document.createElement('button');button.type='button';button.className='fl-launch fl-launch-placeholder';button.dataset.campaignTarget=plan.target;button.dataset.lockLabel=plan.label;
      button.innerHTML=`<span>${plan.label.toUpperCase()}</span><b>${plan.label}</b><small>${plan.unlocked?'Open system →':`Unlocks ${plan.unlockKicker}`}</small>`;
      button.addEventListener('click',()=>{const current=planFor(plan.target);if(current?.unlocked&&typeof window.gameplayOpen==='function')window.gameplayOpen(plan.target);else if(typeof window.campaignLockedSystem==='function')window.campaignLockedSystem(plan.target)});
      grid.appendChild(button);
    }
    if(!grid.children.length)group.remove();
  }
  function decorateCampaign(root=document){
    let count=0;
    const seenCompanyTargets=new Set();
    const selectors='button[data-campaign-target],.company-system-hub button.fl-launch,.game-shell > button[class$="-launch"],.hiring-launch';
    for(const el of root.querySelectorAll(selectors)){
      const inCompany=!!el.closest?.('.company-system-hub');
      const target=inCompany?targetFor(el):null;
      if(inCompany&&target){
        if(seenCompanyTargets.has(target)){cleanupCampaign(el);continue}
        seenCompanyTargets.add(target);
      }
      if(decorateCampaignControl(el))count++;
    }
    return count;
  }

  function cleanupUnavailable(el){
    el.classList.remove('fl-unavailable-now');
    if(el.dataset.flUnavailableTitleOwned==='1'){el.removeAttribute('title');delete el.dataset.flUnavailableTitleOwned}
    for(const meta of el.querySelectorAll?.(':scope > .fl-unavailable-meta')||[])meta.remove();
  }
  function decorateUnavailable(root=document){
    let count=0;
    const controls=root.querySelectorAll('button,input,select,textarea');
    for(const el of controls){
      if(el.classList.contains('fl-campaign-locked')){cleanupUnavailable(el);continue}
      const unavailable=!!el.disabled||el.getAttribute('aria-disabled')==='true';
      if(!unavailable){cleanupUnavailable(el);continue}
      el.classList.add('fl-unavailable-now');count++;
      if(!el.hasAttribute('title')){el.title='Unavailable in the current simulation state.';el.dataset.flUnavailableTitleOwned='1'}
      if(el instanceof HTMLButtonElement&&!el.querySelector(':scope > .fl-unavailable-meta')){
        const meta=document.createElement('span');meta.className='fl-unavailable-meta';meta.textContent='Unavailable now';el.appendChild(meta)
      }
    }
    return count;
  }

  function removePanel(){document.querySelector('.fl-lock-explainer')?.remove()}
  function objectiveAction(plan){
    removePanel();
    const fn=plan?.currentAction&&window[plan.currentAction];if(typeof fn==='function')fn();
  }
  function open(input){
    const plan=input&&typeof input==='object'&&input.target?planFor(input.target)||input:planFor(input);
    if(!plan||plan.unlocked){removePanel();return false}
    if(typeof window.gameplayCloseMenu==='function')window.gameplayCloseMenu();
    removePanel();
    const app=document.getElementById('app');if(!app)return false;
    const panel=document.createElement('section');panel.className='fl-lock-explainer';panel.dataset.flLockPanel=plan.target;panel.setAttribute('role','region');panel.setAttribute('aria-labelledby','fl-lock-title');
    panel.innerHTML=`<div class="fl-lock-icon" aria-hidden="true">🔒</div><div class="fl-lock-copy"><span class="fl-lock-kicker">SYSTEM LOCKED · ${plan.unlockKicker}</span><h3 id="fl-lock-title">${plan.label} is not available yet</h3><p>The guided campaign introduces this system after the prerequisite chapters that make its decisions meaningful.</p><div class="fl-lock-prereq"><b>Current prerequisite</b><span>${plan.currentKicker}: ${plan.currentTitle}</span><b>Unlock point</b><span>${plan.unlockKicker}: ${plan.unlockTitle}</span></div><div class="fl-lock-progress"><div class="fl-lock-progress-head"><span>Campaign progress toward unlock</span><b>${plan.progress}%</b></div><div class="fl-lock-progress-track" aria-label="${plan.progress}% progress toward unlocking ${plan.label}"><i style="--fl-lock-progress:${plan.progress}%"></i></div></div><div class="fl-lock-actions"></div></div><button type="button" class="fl-lock-close" aria-label="Close lock explanation">×</button>`;
    const actions=panel.querySelector('.fl-lock-actions');
    if(plan.currentAction){const next=document.createElement('button');next.type='button';next.className='fl-lock-primary';next.textContent=`${plan.currentCta||'Continue current objective'} →`;next.addEventListener('click',()=>objectiveAction(plan));actions.appendChild(next)}
    const close=panel.querySelector('.fl-lock-close');close.addEventListener('click',removePanel);
    const anchor=app.querySelector('.campaign-progress')||app.querySelector('lab-install-prompt')||app.querySelector('.gameplay-guidance');
    if(anchor)anchor.insertAdjacentElement('afterend',panel);else app.prepend(panel);
    panel.scrollIntoView({block:'nearest',behavior:'smooth'});close.focus({preventScroll:true});
    document.documentElement.dataset.flLockedStateSystem='1';return true;
  }

  function sync(){
    queued=false;const s=safeState();if(!s?.started)return;
    ensureCompanyPlaceholders();
    const campaignLocks=decorateCampaign(document),unavailable=decorateUnavailable(document);
    const app=document.getElementById('app');if(app){app.dataset.flCampaignLocks=String(campaignLocks);app.dataset.flUnavailableControls=String(unavailable)}
    const panel=document.querySelector('.fl-lock-explainer');if(panel){const p=planFor(panel.dataset.flLockPanel);if(!p||p.unlocked)removePanel()}
    document.documentElement.dataset.flLockedStateSystem='1';
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(sync))}

  window.frontierLockedStateSync=sync;
  window.frontierLockedStateOpen=open;
  window.frontierLockedStateClose=removePanel;
  window.frontierLockedStateRegistry=()=>typeof window.campaignUnlockRegistry==='function'?window.campaignUnlockRegistry():[];
  document.documentElement.dataset.flLockedStateSystem='1';
  new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1)))schedule()}).observe(document.body,{childList:true,subtree:true});
  addEventListener('resize',schedule);schedule();
})();