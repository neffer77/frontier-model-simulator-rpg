// P5.3.1 — Frontier Mail command adapters, including the first native NPC journey.
(function(){
  'use strict';
  window.frontierRegisterCommand?.('mail.open',(payload={})=>window.frontierMailOpen?.(payload),{description:'Open native FrontierOS Mail',owner:'P5.2.7'});
  window.frontierRegisterCommand?.('npc.advice.mail.request',(payload={},context={})=>{
    const employeeId=String(payload.employeeId||'');
    const incidentId=String(payload.incidentId||'');
    const requestedView=String(payload.view||'overview'),view=['overview','metrics','profiler','data','checkpoints','evidence','decision'].includes(requestedView)?requestedView:'overview';
    const run=typeof state!=='undefined'?state.activeRun:null;
    if(!employeeId||!incidentId||state.selectedIncident!==incidentId||!run||run.incident!==incidentId)return {ok:false,status:'stale-incident',employeeId,incidentId};
    const employee=typeof npcById==='function'?npcById(employeeId):null;if(!employee)return {ok:false,status:'unknown-employee',employeeId,incidentId};
    if(typeof window.frontierMailReceive!=='function')return {ok:false,status:'mail-unavailable',employeeId,incidentId};
    const records=state.organization?.incidents||[];
    let record=records.find(x=>x.status==='open'&&x.incidentType===incidentId)||null;
    if(!record&&typeof ensureIncidentRecord==='function')record=ensureIncidentRecord(incidentId);
    const runKey=String(run.name||`day-${state.day||0}`);
    const requestKey=`npc-advice:${record?.id||incidentId}:${runKey}:${employeeId}`;
    const existing=window.frontierMailFindRequest?.(requestKey);
    if(existing){
      context.emit?.('npc.advice.mail.reused',{requestKey,threadId:existing.id,employeeId,incidentId,runName:runKey});
      return {ok:true,status:'reused',duplicate:true,threadId:existing.id,requestKey};
    }
    const result=typeof askNpcDuringIncident==='function'?askNpcDuringIncident(employeeId,{incidentId,inline:false,render:false}):null;
    if(!result)return {ok:false,status:'advice-unavailable',employeeId,incidentId};
    const linkedEntity={type:'incident',incidentId,incidentRecordId:record?.id||null,runName:runKey,view,originApp:'training',originDetail:`${incidentId}/${view}`};
    const received=window.frontierMailReceive?.({
      from:result.name,address:result.address,role:result.role,
      subject:`${result.incidentTitle}: ${result.confidence}% confidence`,
      body:result.advice,unread:false,notify:false,requestKey,linkedEntity,
      at:window.frontierMailNextLogicalStamp?.(),messageId:`advice:${requestKey}`
    });
    if(!received?.ok)return {ok:false,status:'mail-unavailable',employeeId,incidentId};
    const delivered={requestKey,threadId:received.threadId,messageId:received.messageId,employeeId,incidentId,incidentRecordId:record?.id||null,runName:runKey,view};
    context.emit?.('npc.advice.mail.delivered',delivered);
    window.frontierEmitEvent?.('mail.advice.linked',delivered,{source:'frontier-mail-command',commandId:context.commandId,correlationId:context.correlationId});
    return {ok:true,status:'delivered',duplicate:false,...delivered};
  },{description:'Request canonical NPC incident advice in a persistent linked Mail thread',owner:'P5.3.1',replayable:true,idempotent:true});
  window.frontierRegisterCommand?.('finance.funding.mail.request',(payload={},context={})=>{
    if(typeof createFundingMailRequest!=='function'||typeof window.frontierMailSyncDecision!=='function')return {ok:false,status:'owner-unavailable'};
    const result=createFundingMailRequest(String(payload.initiativeId||''),window.frontierMailNextLogicalStamp());
    if(!result.ok){context.emit?.('finance.funding.request.denied',{initiativeId:payload.initiativeId,status:result.status});return result}
    const mail=window.frontierMailSyncDecision(result.request);
    context.emit?.('finance.funding.requested',{requestId:result.request.id,initiativeId:result.request.initiativeId,amountM:result.request.amountM,expectedStage:result.request.expectedStage,status:result.status,threadId:mail.threadId});
    return {ok:true,status:result.status,requestId:result.request.id,threadId:mail.threadId};
  },{source:'frontier-mail-command',description:'Request one Finance-owned funding tranche in Mail',replayable:true,idempotent:true});
  window.frontierRegisterCommand?.('mail.decision.respond',(payload={},context={})=>{
    const thread=window.frontierMailExport?.().threads.find(t=>t.id===payload.threadId),ref=thread?.decisionRequest;
    if(ref?.type!=='finance.funding-gate'||typeof respondFundingMailRequest!=='function')return {ok:false,status:'unsupported-request'};
    const result=respondFundingMailRequest({requestId:ref.id,action:payload.action,expectedRevision:payload.expectedRevision,delegateId:payload.delegateId});
    if(!result.ok){context.emit?.('mail.decision.denied',{requestId:ref.id,threadId:thread.id,action:payload.action,status:result.status});return result}
    let mailSynced=true;
    try{window.frontierMailSyncDecision(result.request)}catch(error){mailSynced=false;context.emit?.('mail.decision.sync-failed',{requestId:ref.id,threadId:thread.id,error:String(error?.message||error)},{severity:'warn'})}
    context.emit?.('finance.funding.responded',{requestId:ref.id,initiativeId:result.request.initiativeId,action:payload.action,status:result.status,requestRevision:result.request.revision,delegateId:result.request.delegateId});
    return {ok:true,status:result.status,requestId:ref.id,threadId:thread.id,requestRevision:result.request.revision,mailSynced};
  },{source:'frontier-mail-command',description:'Respond to a typed Mail request through its domain owner',replayable:true,idempotent:true});
})();
