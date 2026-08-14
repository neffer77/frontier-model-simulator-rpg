// Item 11 hardening — preserve a truly canonical first run and keep scaled funding logs truthful.
(function(){
  const SETUP_KEY='frontier-run-setup-v1';
  const archetypes=window.REPLAY_ARCHETYPES;
  if(!archetypes)return;

  // Item 9 established one canonical economy. Item 11 should add replay variants without
  // silently forcing every first-time player into a modifier. Balanced Lab is the neutral path.
  const balanced={
    name:'Balanced Lab',
    tag:'Canonical company start',
    cash:1,
    compute:1,
    research:0,
    reputation:0,
    desc:'No starting modifier. Preserves the canonical Item 9 economy while you learn the full simulator.'
  };
  // Rebuild insertion order so the canonical path is the first archetype the player sees.
  const specialized=Object.entries(archetypes).filter(([id])=>id!=='balanced');
  for(const id of Object.keys(archetypes))delete archetypes[id];
  archetypes.balanced=balanced;
  for(const [id,value] of specialized)archetypes[id]=value;

  try{
    if(!localStorage.getItem(SETUP_KEY)){
      localStorage.setItem(SETUP_KEY,JSON.stringify({difficulty:'standard',archetype:'balanced',challenge:'generalist',perk:'none'}));
    }
  }catch{}

  // replayability.js applies the real funding multiplier after the canonical funding function.
  // Rewrite the generated feed entry so the player never sees an unscaled payout that conflicts
  // with the resources actually received on Apprentice/Frontier/Redline.
  if(typeof checkFunding==='function'){
    const base=checkFunding;
    checkFunding=function(...args){
      const beforeClaims=[...(state.fundingClaimed||[])];
      const out=base(...args);
      const added=(state.fundingClaimed||[]).filter(id=>!beforeClaims.includes(id));
      const d=window.REPLAY_DIFFICULTIES?.[state.replay?.difficulty];
      if(!added.length||!d||d.funding===1||typeof FUNDING==='undefined')return out;

      const scaled=new Map();
      for(const id of added){
        const f=FUNDING.find(x=>x.id===id);if(!f)continue;
        scaled.set(f.label,{
          cash:Number((f.cash*d.funding).toFixed(2)),
          compute:Math.round((f.compute||0)*d.funding)
        });
      }
      state.feed=(state.feed||[]).filter(x=>!String(x).startsWith('Difficulty funding multiplier:')).map(msg=>{
        let text=String(msg);
        for(const [label,v] of scaled){
          if(text.includes(`💰 ${label} closed:`)){
            text=`💰 ${label} closed (${d.name}): +$${v.cash}M and +${fmt(v.compute,0)} H100h. Difficulty changes operating margin, not the technical milestone that unlocked the round.`;
          }
        }
        return text;
      });
      save?.();
      return out;
    };
  }

  window.replayCanonicalDefault=()=>({difficulty:'standard',archetype:'balanced',challenge:'generalist',perk:'none'});
})();
