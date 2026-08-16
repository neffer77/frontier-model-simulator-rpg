// NPC second-opinion workstation subview.
//
// Older builds rendered advice as a second body-level modal and then tried to
// navigate back into the incident. That split ownership across npc-team.js,
// workstation.js, overlay wrappers, and mobile event compatibility code. Advice is
// now a stateful subview of the existing engineering workstation instead.
(function(){
  const STYLE_ID='npc-advice-workstation-subview-style';

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .workstation.npc-advice-active .ws-board > :not(.npc-advice-inline){display:none!important}
      .npc-advice-inline{min-height:100%;display:grid;place-items:center;padding:clamp(14px,3vw,28px)}
      .npc-advice-inline .npc-advice-card{width:min(640px,100%);margin:auto;text-align:center}
      .npc-advice-inline .npc-return-investigation{width:100%;margin-top:8px;min-height:46px;touch-action:manipulation}
      @media(max-width:600px){
        .npc-advice-inline{padding:12px 8px}
        .npc-advice-inline .npc-advice-card{padding:20px 14px}
        .npc-advice-inline .npc-advice-card h2{font-size:26px}
      }
    `;
    document.head.appendChild(style);
  }

  function currentAdvice(){
    return typeof state!=='undefined'?state.npcTeam?.advice||null:null;
  }

  function adviceEmployee(advice){
    if(!advice)return null;
    if(typeof npcById==='function')return npcById(advice.employeeId);
    return state?.npcEmployees?.find?.(employee=>employee.id===advice.employeeId)||null;
  }

  function renderInlineAdvice(){
    const advice=currentAdvice();
    if(!advice)return'';
    const employee=adviceEmployee(advice);
    if(!employee)return'';
    return `<section class="npc-advice-inline" data-npc-workstation-subview="advice" aria-label="Second opinion from ${esc(employee.name)}"><div class="npc-advice-card"><div class="npc-avatar giant ${employee.color}">${esc(employee.avatar)}</div><div class="eyebrow">SECOND OPINION · ${esc(employee.role)}</div><h2>${esc(employee.name)}</h2><p>“${esc(advice.advice)}”</p><div class="confidence"><span>Confidence</span><b>${advice.confidence}%</b><i><em style="width:${advice.confidence}%"></em></i></div><small>Confidence reflects this character's specialty and experience, not hidden access to the correct answer.</small><button type="button" class="npc-primary npc-return-investigation" onclick="npcReturnToInvestigation()">Back to investigation</button></div></section>`;
  }

  function workstationHost(){
    const workstation=document.querySelector('.workstation');
    if(!workstation)return {workstation:null,host:null};
    const host=workstation.querySelector('.ws-board')||workstation.querySelector('.ws-right')||workstation;
    return {workstation,host};
  }

  function removeLegacyOverlay(){
    document.querySelectorAll('body > .npc-advice-back,.npc-advice-back').forEach(node=>node.remove());
  }

  function syncSubview(){
    installStyle();
    removeLegacyOverlay();
    const {workstation,host}=workstationHost();
    if(!workstation||!host)return;
    const advice=currentAdvice();
    host.querySelectorAll('.npc-advice-inline').forEach(node=>node.remove());

    if(advice){
      workstation.classList.add('npc-advice-active');
      host.querySelectorAll('.ask-team-panel').forEach(node=>node.remove());
      host.insertAdjacentHTML('afterbegin',renderInlineAdvice());
      const card=host.querySelector('.npc-advice-inline');
      if(card&&!card.hasAttribute('tabindex'))card.setAttribute('tabindex','-1');
      requestAnimationFrame(()=>card?.focus?.({preventScroll:true}));
      return;
    }

    workstation.classList.remove('npc-advice-active');
    if(typeof renderAskTeamPanel==='function'&&!host.querySelector('.ask-team-panel')){
      host.insertAdjacentHTML('beforeend',renderAskTeamPanel());
    }
  }

  function returnToInvestigation(){
    if(typeof state==='undefined')return false;
    if(state.npcTeam)state.npcTeam.advice=null;
    if(state.workstation)state.workstation.npcSubview='investigation';
    removeLegacyOverlay();
    if(typeof save==='function')save();
    if(typeof render==='function')render();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      syncSubview();
      const investigation=document.querySelector('.workstation');
      if(investigation){
        if(!investigation.hasAttribute('tabindex'))investigation.setAttribute('tabindex','-1');
        investigation.focus?.({preventScroll:true});
        investigation.scrollIntoView?.({block:'start',behavior:'instant'});
      }
      if(typeof frontierA11yAnnounce==='function')frontierA11yAnnounce('Returned to investigation');
    }));
    return false;
  }

  // Replace the legacy body-overlay integration points that npc-team.js calls after
  // every render. They now synchronize a local workstation subview instead.
  window.renderNpcAdvice=renderInlineAdvice;
  window.injectNpcIncidentUI=syncSubview;
  window.npcReturnToInvestigation=returnToInvestigation;
  window.closeNpcAdvice=returnToInvestigation;
  window.frontierNpcAdviceSync=syncSubview;

  // A small wrapper guarantees the subview stays synchronized even if another
  // later-loaded runtime replaces or bypasses npc-team.js's render wrapper.
  const inheritedRender=window.render;
  if(typeof inheritedRender==='function'&&!inheritedRender.__npcAdviceSubview){
    const wrapped=function(){
      const result=inheritedRender.apply(this,arguments);
      syncSubview();
      return result;
    };
    wrapped.__npcAdviceSubview=true;
    window.render=wrapped;
  }

  // Remove any advice overlay created during startup before this file loaded and
  // immediately re-home persisted advice into the workstation.
  syncSubview();
})();
