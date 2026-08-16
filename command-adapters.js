// P5.0.2 — Named command adapters for the existing simulator runtime.
// Existing UI continues calling legacy functions; FrontierOS apps can use these
// commands immediately and migrate screen-by-screen without changing simulation logic.
(function(){
  'use strict';
  if(typeof window.frontierRegisterCommand!=='function')return;

  function fn(name){return typeof window[name]==='function'?window[name]:null}
  function register(name,globalName,options={}){
    const target=fn(globalName);
    if(!target)return false;
    frontierRegisterCommand(name,(payload={})=>target(...(options.args?options.args(payload):[])),{
      source:'legacy-adapter',
      description:options.description||`Adapter for ${globalName}`,
      replayable:options.replayable!==false,
      idempotent:!!options.idempotent
    });
    return true;
  }

  register('navigation.home.open','gameplayGoHome',{idempotent:true,description:'Open the canonical company/home route'});
  register('navigation.training.open','gameplayGoTrain',{idempotent:true,description:'Open Training Operations'});
  register('training.incident.open','openIncident',{args:p=>[p.incidentId],description:'Open an engineering incident by incident ID'});
  register('training.diagnostic.run','inspectWorkstationTool',{args:p=>[p.tool],description:'Run or open a workstation diagnostic tool'});
  register('training.hint.request','takeWorkstationHint',{replayable:false,description:'Request a senior diagnostic hint'});
  register('training.hypothesis.commit','commitWorkstationHypothesis',{args:p=>[p.hypothesisId],description:'Commit the current incident hypothesis'});
  register('training.production.execute','executeWorkstationAction',{args:p=>[p.actionId],replayable:false,description:'Execute the selected production response'});
  register('npc.advice.request','askNpcDuringIncident',{args:p=>[p.employeeId],description:'Request a teammate second opinion during an incident'});
  register('npc.advice.close','closeNpcAdvice',{idempotent:true,description:'Return from teammate advice to the investigation'});
  register('team.open','npcOpenTeam',{idempotent:true,description:'Open the engineering team application'});
  register('model.lab.open','modelLabOpen',{idempotent:true,description:'Open Model Lab'});
  register('data.evals.open','dataEvalsOpen',{idempotent:true,description:'Open Data + Evals'});

  frontierEmitEvent('runtime.command-adapters.ready',{
    source:'legacy-adapter',
    registered:frontierCommandRegistry().filter(command=>command.source==='legacy-adapter').map(command=>command.name)
  },{source:'legacy-adapter'});
})();
