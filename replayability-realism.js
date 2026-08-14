// Item 11 realism registration: difficulty/archetype values are deliberate game abstractions.
(function(){
  const audit=window.REALISM_AUDIT;if(!Array.isArray(audit)||audit.some(x=>x.domain==='Replay difficulty / archetypes'))return;
  audit.push({domain:'Replay difficulty / archetypes',status:'game',claim:'Difficulty modes, career scoring, run deadlines, archetype bonuses, medals, and New Game+ perks are replay systems.',note:'They intentionally change strategic pressure and operating margin. They are not empirical claims about real frontier-lab productivity, financing, failure rates, or career progression.',sources:[]});
})();
