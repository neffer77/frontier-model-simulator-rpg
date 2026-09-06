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
})();
