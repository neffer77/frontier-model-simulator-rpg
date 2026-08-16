// Mobile-safe NPC second-opinion return path.
(function(){
  function closeAdvice(){
    if(typeof state==='undefined')return;
    if(state.npcTeam)state.npcTeam.advice=null;
    document.querySelectorAll('.npc-advice-back').forEach(el=>el.remove());
    if(typeof save==='function')save();
    // The investigation is already rendered underneath the advice overlay. Avoid a
    // full render here: late render wrappers can immediately recreate body-level
    // overlays on iOS/PWA and make the Back button appear inert.
    requestAnimationFrame(()=>{
      const investigation=document.querySelector('.workstation,[data-fl-overlay-panel="incident"]');
      if(investigation){
        if(!investigation.hasAttribute('tabindex'))investigation.setAttribute('tabindex','-1');
        investigation.focus?.({preventScroll:true});
        investigation.scrollIntoView?.({block:'start',behavior:'instant'});
      }else if(typeof render==='function')render();
      if(typeof frontierA11yAnnounce==='function')frontierA11yAnnounce('Returned to investigation');
    });
  }
  window.closeNpcAdvice=closeAdvice;
  // Delegated fallback covers cached markup and iOS cases where an inline onclick
  // was bound before this compatibility layer loaded.
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('.npc-advice-back button');
    if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();closeAdvice();
  },true);
})();