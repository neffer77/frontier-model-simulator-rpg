// Hotfix: make NPC second-opinion return deterministic across iOS/PWA render wrappers.
(function(){
  function returnToInvestigation(){
    if(window.state?.npcTeam) state.npcTeam.advice=null;
    try{ if(typeof save==='function') save(); }catch(_e){}

    const overlay=document.querySelector('.npc-advice-back');
    if(overlay) overlay.remove();

    // Prefer preserving the live investigation beneath the body-level advice overlay.
    let workstation=document.querySelector('.workstation');
    if(!workstation && state?.selectedIncident && typeof render==='function'){
      render();
      workstation=document.querySelector('.workstation');
    }

    if(workstation){
      if(!workstation.hasAttribute('tabindex')) workstation.setAttribute('tabindex','-1');
      workstation.focus({preventScroll:true});
      workstation.scrollIntoView({block:'start',behavior:'auto'});
    }
  }

  // Override the legacy render-and-recreate implementation with the deterministic return path.
  window.closeNpcAdvice=returnToInvestigation;

  // Delegated fallback also handles already-cached markup in installed iOS/PWA sessions.
  document.addEventListener('click',function(event){
    const button=event.target.closest?.('.npc-advice-back button');
    if(!button)return;
    event.preventDefault();
    event.stopPropagation();
    returnToInvestigation();
  },true);
})();
