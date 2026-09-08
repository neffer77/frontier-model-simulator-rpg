import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {fixture} from './helpers/mail-decision-fixture.mjs';
const copy=x=>JSON.parse(JSON.stringify(x));
const invoke=(f,name,payload)=>f.commands.get(name)(copy(payload),{emit:(type,data)=>f.events.push({type,data})});
const request=f=>invoke(f,'finance.funding.mail.request',{initiativeId:'IN-001'});
const respond=(f,r,action,expectedRevision,delegateId=null)=>invoke(f,'mail.decision.respond',{threadId:r.threadId,action,expectedRevision,delegateId});
const ledger=(f,r)=>f.c.fundingMailRequest(r.requestId);
const snapshot=f=>JSON.stringify({state:f.c.state,mail:f.c.frontierMailExport()});
const evidence=(f,r)=>ledger(f,r).audit.find(a=>a.action==='attach-evidence')?.evidence;
const thread=(f,r)=>f.c.frontierMailExport().threads.find(t=>t.id===r.threadId);
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const report={status:'running',firstDivergence:null,hashes:[]};
try{
  const f=fixture(),r=request(f),before=copy(f.c.state);
  assert.equal(respond(f,r,'attach-evidence',0).ok,true,'Missing immutable Finance evidence attachment');
  const e=evidence(f,r);assert.equal(e.type,'finance.funding-evidence');assert.equal(e.schemaVersion,1);
  assert.equal(e.requestId,r.requestId);assert.equal(e.requestRevision,1);assert.equal(e.capturedDay,8);assert.equal(e.capturedAt,ledger(f,r).createdAt+1);
  assert.equal(e.request.status,'pending');assert.equal(e.request.amountM,.6);assert.equal(e.initiative.name,'Architecture bet');assert.equal(e.gate.stage,0);
  assert.equal(e.estimates.scenarioEV,f.c.scenarioEV(f.c.state.portfolioStrategy.initiatives[0]));
  assert.equal(e.estimates.optionValue,f.c.optionValue(f.c.state.portfolioStrategy.initiatives[0]));
  assert.deepEqual(copy(e.scenarios.map(s=>s.probability)),[.25,.5,.25]);
  for(const key of ['cash','portfolioStrategy','npcEmployees'])assert.deepEqual(copy(f.c.state[key]),before[key]);
  for(const key of ['gates','decisions','optionDiscipline','scenarios'])assert.deepEqual(copy(f.c.state.investmentCommittee[key]),before.investmentCommittee[key]);
  assert.equal(ledger(f,r).revision,1);assert.equal(ledger(f,r).status,'pending');assert.equal(thread(f,r).messages.length,2);
  assert.deepEqual(copy(thread(f,r).attachments),[{id:e.id,type:e.type,requestId:r.requestId}]);
  assert(f.events.some(e=>e.type==='finance.funding.evidence.recorded'));
  const saved=snapshot(f);assert.equal(respond(f,r,'attach-evidence',0).status,'reused');assert.equal(snapshot(f),saved);
  assert.equal(respond(f,r,'attach-evidence',1).status,'evidence-already-recorded');assert.equal(respond(f,r,'approve',0).status,'revision-conflict');assert.equal(snapshot(f),saved);
  assert.equal(respond(f,r,'follow-up',1).status,'pending');assert.equal(respond(f,r,'approve',2).status,'approved');
  assert.equal(f.c.state.cash,29400000);assert.equal(f.c.state.investmentCommittee.gates['IN-001'].stage,1);
  const original=copy(e);assert.deepEqual(copy(evidence(f,r)),original,'Funding changed original evidence');
  assert.equal(respond(f,r,'attach-evidence',0).status,'reused');
  const exposed=f.c.fundingEvidenceSnapshot(r.requestId,e.id);exposed.initiative.name='Edited copy';exposed.scenarios[0].probability=0;
  assert.deepEqual(copy(f.c.fundingEvidenceSnapshot(r.requestId,e.id)),original,'Reader could mutate owner evidence');
  assert.equal(f.c.fundingEvidenceSnapshot('other',e.id),null);assert.equal(f.c.fundingEvidenceSnapshot(r.requestId,'other'),null);
  const delegated=fixture(),d=request(delegated);respond(delegated,d,'delegate',0,'priya');respond(delegated,d,'follow-up',1);
  assert.equal(respond(delegated,d,'attach-evidence',2).status,'delegated');assert.equal(ledger(delegated,d).delegateId,'priya');
  assert.equal(evidence(delegated,d).request.status,'delegated');assert.equal(evidence(delegated,d).requestRevision,3);
  assert.equal(respond(delegated,d,'reject',3).status,'rejected');assert.equal(delegated.c.state.cash,30000000);
  const independent=fixture(),ind=request(independent);independent.c.state.cash=0;independent.c.state.investmentCommittee.committeeIds=[];
  assert.equal(respond(independent,ind,'attach-evidence',0).status,'pending');
  for(const [change,status] of [
    [f=>{f.c.state.portfolioStrategy.initiatives=[]},'initiative-missing'],
    [f=>{f.c.state.portfolioStrategy.initiatives[0].costM=9},'initiative-changed'],
    [f=>{f.c.state.portfolioStrategy.initiatives[0].status='killed'},'initiative-changed'],
    [f=>{f.c.state.investmentCommittee.scenarios.bull=NaN},'evidence-unavailable'],
    [f=>{f.c.state.investmentCommittee.scenarios.bull=-.1},'evidence-unavailable']
  ]){const f=fixture(),r=request(f);change(f);const before=snapshot(f);assert.equal(respond(f,r,'attach-evidence',0).status,status);assert.equal(snapshot(f),before)}
  for(const action of ['approve','reject']){const f=fixture(),r=request(f);respond(f,r,action,0);const before=snapshot(f);assert.equal(respond(f,r,'attach-evidence',1).status,'already-decided');assert.equal(snapshot(f),before)}
  const invalid=fixture(),ir=request(invalid),invalidBefore=snapshot(invalid);
  for(const rev of [-1,'0',.5,null])assert.equal(respond(invalid,ir,'attach-evidence',rev).status,'invalid-response');
  assert.equal(respond(invalid,{threadId:'missing'},'attach-evidence',0).status,'unsupported-request');assert.equal(snapshot(invalid),invalidBefore);
  invoke(invalid,'mail.decision.respond',{threadId:ir.threadId,requestId:'forged',evidence:{initiative:{name:'forged'}},action:'attach-evidence',expectedRevision:0});
  assert.equal(evidence(invalid,ir).initiative.name,'Architecture bet');assert.equal(evidence(invalid,ir).requestId,ir.requestId);
  const broken=fixture(),b=request(broken),preFailure=snapshot(broken);broken.c.failSave=true;
  assert.throws(()=>respond(broken,b,'attach-evidence',0),/persistence failure/);assert.equal(snapshot(broken),preFailure);
  broken.c.failSave=false;assert.equal(respond(broken,b,'attach-evidence',0).ok,true);
  const projection=fixture(),pr=request(projection);projection.c.failMail=true;
  assert.equal(respond(projection,pr,'attach-evidence',0).mailSynced,false);assert.equal(ledger(projection,pr).revision,1);
  projection.c.failMail=false;assert.equal(respond(projection,pr,'attach-evidence',0).status,'reused');
  for(const missing of ['attachment','message']){
    const box=projection.c.frontierMailExport(),t=box.threads.find(t=>t.id===pr.threadId);
    if(missing==='attachment')delete t.attachments;else t.messages.pop();
    projection.c.frontierMailImport(box);projection.c.frontierMailSyncDecision(ledger(projection,pr));
    assert.equal(thread(projection,pr).attachments.length,1);assert.equal(thread(projection,pr).messages.length,2);
  }
  // Reload both stores and remove live inputs; saved evidence remains authoritative.
  const loaded=fixture();loaded.c.state=copy(projection.c.state);loaded.c.frontierMailImport(projection.c.frontierMailExport());
  const stored=copy(evidence(loaded,pr));loaded.c.state.portfolioStrategy.initiatives=[];loaded.c.state.investmentCommittee.scenarios={bull:.8,base:.1,bear:.1};
  assert.equal(respond(loaded,pr,'attach-evidence',0).status,'reused');assert.deepEqual(copy(evidence(loaded,pr)),stored);
  let legacyReads=0;loaded.c.ensureArtifactLab=()=>{legacyReads++};loaded.c.artifactMetrics=()=>{legacyReads++;return{}};loaded.c.frontierCommandRegistry=()=>[];
  vm.runInContext(fs.readFileSync('command-adapters.js','utf8'),loaded.c,{filename:'command-adapters.js'});
  const detail=['finance-evidence',pr.requestId,stored.id,'return',pr.threadId].map(encodeURIComponent).join('/'),readBefore=snapshot(loaded);
  invoke(loaded,'artifacts.open',{detail});assert.deepEqual(copy(loaded.c.frontierArtifactsSnapshot().evidence),stored);
  assert.equal(loaded.c.frontierArtifactsSnapshot().returnThreadId,pr.threadId);assert.equal(loaded.c.frontierArtifactsUiAction('apply').status,'read-only');
  assert.equal(legacyReads,0);assert.equal(snapshot(loaded),readBefore,'Viewing evidence mutated simulation or Mail');
  invoke(loaded,'artifacts.open',{detail:detail.replace('/return/'+pr.threadId,'/return/m1')});assert.equal(loaded.c.frontierArtifactsSnapshot().returnThreadId,null);
  loaded.c.state.investmentCommittee.mailRequests=[];invoke(loaded,'artifacts.open',{detail});assert.equal(loaded.c.frontierArtifactsSnapshot().evidence,null);
  const box=loaded.c.frontierMailExport();box.threads=box.threads.filter(t=>t.id!==pr.threadId);loaded.c.frontierMailImport(box);
  assert.equal(loaded.c.frontierArtifactsSnapshot().returnThreadId,null);assert.equal(legacyReads,0);
  const a=fixture(),z=fixture();z.c.state=copy(a.c.state);z.c.frontierMailImport(a.c.frontierMailExport());
  const script=[['finance.funding.mail.request',{initiativeId:'IN-001'}],['mail.decision.respond',{threadId:'m7',action:'attach-evidence',expectedRevision:0}],['mail.decision.respond',{threadId:'m7',action:'attach-evidence',expectedRevision:0}],['mail.decision.respond',{threadId:'m7',action:'follow-up',expectedRevision:1}],['mail.decision.respond',{threadId:'m7',action:'approve',expectedRevision:2}],['mail.decision.respond',{threadId:'m7',action:'attach-evidence',expectedRevision:0}]];
  for(const [index,[name,payload]] of script.entries()){
    const before=hash(snapshot(a));invoke(a,name,payload);invoke(z,name,payload);
    report.hashes.push({index:index+1,name,payload,before,after:hash(snapshot(a))});
    if(hash(snapshot(a))!==hash(snapshot(z)))report.firstDivergence=index+1;
    assert.equal(report.firstDivergence,null,'First replay divergence at command '+(index+1));
  }
  assert.equal(report.hashes[2].before,report.hashes[2].after);assert.equal(report.hashes.at(-1).before,report.hashes.at(-1).after);
  report.snapshotHash=hash(original);report.status='pass';
}catch(error){report.status='fail';report.error=String(error.stack||error);throw error}
finally{fs.mkdirSync('artifacts/mail-evidence-domain',{recursive:true});fs.writeFileSync('artifacts/mail-evidence-domain/report.json',JSON.stringify(report,null,2)+'\n')}
console.log('Mail evidence: immutable owner record, guards, recovery, pure Artifacts reads and deterministic replay passed');
