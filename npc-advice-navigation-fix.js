// Mobile-safe NPC second-opinion return path.
(function(){
  let returning=false;
  let lastActivation=0;

  function activeIncidentId(){
    if(typeof state==='undefined')return null;
    return state.npcTeam?.advice?.incidentId||state.selectedIncident||state.workstation?.incidentId||null;
  }

  function focusInvestigation(){
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const investigation=document.querySelector('.workstation,[data-fl-overlay-panel="incident"]');
      if(investigation){
        if(!investigation.hasAttribute('tabindex'))investigation.setAttribute('tabindex','-1');
        investigation.focus?.({preventScroll:true});
        investigation.scrollIntoView?.({block:'start',behavior:'instant'});
      }
      if(typeof frontierA11yAnnounce==='function')frontierA11yAnnounce('Returned to investigation');
    }));
  }

  function closeAdvice(){
    if(returning||typeof state==='undefined')return false;
    returning=true;
    const incidentId=activeIncidentId();

    if(state.npcTeam)state.npcTeam.advice=null;
    document.querySelectorAll('.npc-advice-back').forEach(el=>el.remove());
    if(typeof save==='function')save();

    // Re-enter through the canonical incident path. Do not depend on stale DOM.
    if(incidentId&&typeof openIncident==='function'){
      openIncident(incidentId);
    }else if(typeof render==='function'){
      render();
    }

    // Defensive post-render verification: no wrapper is allowed to resurrect the
    // advice state or leave the player without an investigation surface.
    setTimeout(()=>{
      if(typeof state!=='undefined'&&state.npcTeam)state.npcTeam.advice=null;
      document.querySelectorAll('.npc-advice-back').forEach(el=>el.remove());
      const investigation=document.querySelector('.workstation,[data-fl-overlay-panel="incident"]');
      if(!investigation&&incidentId&&typeof openIncident==='function')openIncident(incidentId);
      if(typeof save==='function')save();
      focusInvestigation();
      returning=false;
    },50);

    return false;
  }

  window.closeNpcAdvice=closeAdvice;

  function adviceButtonFromEvent(event){
    const target=event.target;
    return target?.closest?.('.npc-advice-back button')||null;
  }

  function activate(event){
    const button=adviceButtonFromEvent(event);
    if(!button)return;
    const now=Date.now();
    if(now-lastActivation<400){
      event.preventDefault?.();
      event.stopImmediatePropagation?.();
      return;
    }
    lastActivation=now;
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    closeAdvice();
  }

  // iOS standalone WebKit can visibly press a button while suppressing the final
  // synthetic click after touch scrolling/gesture arbitration. Handle the physical
  // release directly, with click retained for mouse/keyboard and older browsers.
  document.addEventListener('pointerup',activate,true);
  document.addEventListener('touchend',activate,{capture:true,passive:false});
  document.addEventListener('click',activate,true);
  document.addEventListener('keydown',event=>{
    const button=adviceButtonFromEvent(event);
    if(!button||!(event.key==='Enter'||event.key===' '))return;
    activate(event);
  },true);
})();
