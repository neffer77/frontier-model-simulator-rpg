// Mobile-safe NPC second-opinion return path.
(function(){
  function closeAdvice(){
    if(typeof state==='undefined')return;
    const incidentId=state.npcTeam?.advice?.incidentId||state.selectedIncident||state.workstation?.incidentId||null;
    if(state.npcTeam)state.npcTeam.advice=null;
    document.querySelectorAll('.npc-advice-back').forEach(el=>el.remove());
    if(typeof save==='function')save();

    // Return through the canonical incident navigation path instead of relying on
    // whatever DOM happened to be underneath the body-level advice overlay. This
    // is deterministic across iOS standalone/PWA, browser, and the wrapped Item 13
    // render stack because openIncident() reconstructs the workstation from state.
    if(incidentId&&typeof openIncident==='function'){
      openIncident(incidentId);
    }else if(typeof render==='function'){
      render();
    }

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

  window.closeNpcAdvice=closeAdvice;

  // Delegated capture handler is the source of truth for both newly rendered and
  // cached markup. Suppress the legacy inline onclick so closeAdvice runs once.
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('.npc-advice-back button');
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closeAdvice();
  },true);
})();
