import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fixture} from './helpers/mail-decision-fixture.mjs';
const copy=x=>JSON.parse(JSON.stringify(x));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const out='artifacts/mail-triage-domain';fs.mkdirSync(out,{recursive:true});
const report={status:'running',hashes:[],firstDivergence:null};
try{
  const {c,commands}=fixture(),call=(name,payload)=>commands.get(name)(payload,{emit(){}});
  const add=(id)=>{const i=copy(c.state.portfolioStrategy.initiatives[0]);i.id=id;i.name=id;c.state.portfolioStrategy.initiatives.push(i);return call('finance.funding.mail.request',{initiativeId:id})};
  const pending=add('pending'),delegated=add('delegated'),approved=add('approved'),rejected=add('rejected'),stale=add('stale'),missing=add('missing'),orphan=add('orphan');
  const respond=(r,action)=>call('mail.decision.respond',{threadId:r.threadId,action,expectedRevision:0,delegateId:'maya'});
  assert(respond(delegated,'delegate').ok);assert(respond(approved,'approve').ok);assert(respond(rejected,'reject').ok);
  c.state.portfolioStrategy.initiatives.find(i=>i.id==='stale').risk+=.1;
  c.state.portfolioStrategy.initiatives=c.state.portfolioStrategy.initiatives.filter(i=>i.id!=='missing');
  c.state.investmentCommittee.mailRequests=c.state.investmentCommittee.mailRequests.filter(r=>r.id!==orphan.requestId);
  const box=c.frontierMailExport();box.threads.find(t=>t.id===delegated.threadId).archived=true;
  box.threads.push({...copy(box.threads.find(t=>t.id===pending.threadId)),id:'unsupported',decisionRequest:{type:'other',id:pending.requestId}});
  c.frontierMailImport(box);
  const start=copy(c.state),mail=copy(c.frontierMailExport());
  assert.equal(c.frontierMailFolder('needs-decision'),true,'Missing Needs decision Mail view');
  const snap=c.frontierMailSnapshot();assert.equal(snap.counts['needs-decision'],2);
  assert.deepEqual(new Set(snap.visibleThreadIds),new Set([pending.threadId,delegated.threadId]));
  assert.equal(snap.counts.archive,2,'Triage must preserve archive membership');
  assert.deepEqual(copy(c.state),start,'Reading triage changed Finance');assert.deepEqual(copy(c.frontierMailExport()),mail,'Reading triage rewrote Mail');
  c.state.cash=0;assert.equal(c.frontierMailSnapshot().counts['needs-decision'],2,'Reject remains actionable without approval cash');
  c.frontierMailOpen({detail:'thread/'+delegated.threadId+'/from/needs-decision'});
  assert.equal(c.frontierMailSnapshot().threadId,delegated.threadId);assert.equal(c.frontierMailSnapshot().folder,'needs-decision');
  assert.equal(c.frontierMailExport().threads.find(t=>t.id===delegated.threadId).archived,true);
  c.frontierMailFolder('inbox');assert(!c.frontierMailSnapshot().visibleThreadIds.includes(delegated.threadId));
  c.frontierMailFolder('archive');assert(c.frontierMailSnapshot().visibleThreadIds.includes(delegated.threadId));
  const baseline={state:copy(c.state),mail:copy(c.frontierMailExport())};
  const sequence=[{name:'mail.open',payload:{detail:'needs-decision'}},{name:'mail.decision.respond',payload:{threadId:pending.threadId,action:'reject',expectedRevision:0}},{name:'mail.open',payload:{detail:'needs-decision'}},{name:'mail.decision.respond',payload:{threadId:pending.threadId,action:'reject',expectedRevision:0}}];
  function replay(){const f=fixture();f.c.state=copy(baseline.state);f.c.frontierMailImport(copy(baseline.mail));return sequence.map((step,index)=>{const result=f.commands.get(step.name)(step.payload,{emit(){}});return {index,...step,result:copy(result),hash:hash({state:f.c.state,mail:f.c.frontierMailExport(),triage:f.c.frontierMailSnapshot()})}})}
  const a=replay(),b=replay();report.hashes=a;report.firstDivergence=a.findIndex((x,i)=>x.hash!==b[i].hash);if(report.firstDivergence===-1)report.firstDivergence=null;assert.equal(report.firstDivergence,null);assert.equal(a.at(-1).result.status,'reused');assert.equal(a.at(-1).hash,a.at(-2).hash);
  assert(respond(pending,'reject').ok);assert.equal(c.frontierMailSnapshot().counts['needs-decision'],1);
  c.state.investmentCommittee.mailRequests.find(r=>r.id===delegated.requestId).status='cancelled';assert.equal(c.frontierMailSnapshot().counts['needs-decision'],0);
  c.fundingMailStatus=undefined;c.frontierMailFolder('needs-decision');assert.equal(c.frontierMailSnapshot().visibleThreadIds.length,0,'Missing owner must not offer decisions');
  report.status='pass';console.log('Mail triage: canonical availability, archived requests, missing/stale guards, pure reads and deterministic replay passed');
}catch(error){report.status='fail';report.error=String(error.stack||error);throw error}
finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n')}
