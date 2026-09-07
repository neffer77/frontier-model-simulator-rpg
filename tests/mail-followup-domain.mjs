import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fixture} from './helpers/mail-decision-fixture.mjs';
const copy=x=>JSON.parse(JSON.stringify(x));
const invoke=(f,name,payload)=>f.commands.get(name)(copy(payload),{emit:(type,data)=>f.events.push({type,data})});
const request=f=>invoke(f,'finance.funding.mail.request',{initiativeId:'IN-001'});
const respond=(f,r,action,expectedRevision,delegateId=null)=>invoke(f,'mail.decision.respond',{threadId:r.threadId,action,expectedRevision,delegateId});
const snapshot=f=>JSON.stringify({state:f.c.state,mail:f.c.frontierMailExport()});
const ledger=(f,r)=>f.c.fundingMailRequest(r.requestId);
const f=fixture(),r=request(f),before=copy(f.c.state);
assert.equal(respond(f,r,'follow-up',0).status,'pending','Missing typed follow-up: must retain pending status');
const audit=ledger(f,r).audit.at(-1),reply=audit.followUp;
assert.equal(audit.action,'follow-up');assert.equal(ledger(f,r).revision,1);assert.equal(reply.reviewerId,'maya');
assert.match(reply.response,/0.60M/);assert.match(reply.response,/52%/);assert.match(reply.response,/No funds moved/);
assert.deepEqual(copy(f.c.state.portfolioStrategy),before.portfolioStrategy);assert.deepEqual(copy(f.c.state.npcEmployees),before.npcEmployees);
assert.equal(f.c.state.cash,before.cash);assert.deepEqual(copy(f.c.state.investmentCommittee.gates),before.investmentCommittee.gates);
assert.deepEqual(copy(f.c.state.investmentCommittee.decisions),before.investmentCommittee.decisions);
const messages=f.c.frontierMailExport().threads.find(t=>t.id===r.threadId).messages;
assert.equal(messages.length,3);assert.equal(messages[1].from,'You');assert.equal(messages[2].from,'Maya Chen');assert.equal(messages[2].body,reply.response);
assert(f.events.some(e=>e.type==='finance.funding.follow-up.recorded'));
const recorded=snapshot(f);assert.equal(respond(f,r,'follow-up',0).status,'reused');assert.equal(snapshot(f),recorded);
assert.equal(respond(f,r,'follow-up',1).status,'follow-up-already-recorded');assert.equal(snapshot(f),recorded);
assert.equal(respond(f,r,'approve',0).status,'revision-conflict');assert.equal(snapshot(f),recorded);
assert.equal(respond(f,r,'approve',1).status,'approved');assert.equal(f.c.state.cash,29400000);
const approved=snapshot(f);assert.equal(respond(f,r,'follow-up',2).status,'already-decided');assert.equal(snapshot(f),approved);

const delegated=fixture(),d=request(delegated);respond(delegated,d,'delegate',0,'priya');
assert.equal(respond(delegated,d,'follow-up',1).status,'delegated');assert.equal(ledger(delegated,d).delegateId,'priya');
assert.equal(ledger(delegated,d).audit.at(-1).followUp.reviewerId,'priya');assert.equal(delegated.c.state.cash,30000000);
assert.equal(respond(delegated,d,'reject',2).status,'rejected');assert.equal(delegated.c.state.cash,30000000);

for(const [change,status] of [[f=>{f.c.state.portfolioStrategy.initiatives=[]},'initiative-missing'],[f=>{f.c.state.portfolioStrategy.initiatives[0].costM=9},'initiative-changed'],[f=>{f.c.state.investmentCommittee.committeeIds=[]},'reviewer-unavailable']]){
  const f=fixture(),r=request(f);change(f);const before=snapshot(f);assert.equal(respond(f,r,'follow-up',0).status,status);assert.equal(snapshot(f),before);
}
const missing=fixture(),m=request(missing);respond(missing,m,'delegate',0,'maya');missing.c.state.npcEmployees=missing.c.state.npcEmployees.filter(e=>e.id!=='maya');
assert.equal(respond(missing,m,'follow-up',1).status,'reviewer-unavailable');
const poor=fixture(),p=request(poor);poor.c.state.cash=0;assert.equal(respond(poor,p,'follow-up',0).status,'pending');assert.equal(poor.c.state.cash,0);
const broken=fixture(),b=request(broken),saved=snapshot(broken);broken.c.failSave=true;assert.throws(()=>respond(broken,b,'follow-up',0),/persistence failure/);assert.equal(snapshot(broken),saved);
broken.c.failSave=false;assert.equal(respond(broken,b,'follow-up',0).status,'pending');
const projection=fixture(),pr=request(projection);projection.c.failMail=true;assert.equal(respond(projection,pr,'follow-up',0).mailSynced,false);projection.c.failMail=false;
assert.equal(respond(projection,pr,'follow-up',0).status,'reused');assert.equal(projection.c.frontierMailExport().threads.find(t=>t.id===pr.threadId).messages.length,3);
// Recover a partially missing projected response without duplicating its question.
const box=projection.c.frontierMailExport();box.threads.find(t=>t.id===pr.threadId).messages.pop();projection.c.frontierMailImport(box);
projection.c.frontierMailSyncDecision(ledger(projection,pr));assert.equal(projection.c.frontierMailExport().threads.find(t=>t.id===pr.threadId).messages.length,3);
const reload=fixture();reload.c.state=copy(projection.c.state);reload.c.frontierMailImport(projection.c.frontierMailExport());reload.c.state.npcEmployees[0].name='Renamed later';
respond(reload,pr,'follow-up',0);assert.equal(ledger(reload,pr).audit.at(-1).followUp.reviewerName,'Maya Chen');
assert.equal(reload.c.frontierMailExport().threads.find(t=>t.id===pr.threadId).messages[2].from,'Maya Chen');

const a=fixture(),z=fixture();z.c.frontierMailImport(a.c.frontierMailExport());const script=[['finance.funding.mail.request',{initiativeId:'IN-001'}],['mail.decision.respond',{threadId:'m7',action:'follow-up',expectedRevision:0}],['mail.decision.respond',{threadId:'m7',action:'follow-up',expectedRevision:0}],['mail.decision.respond',{threadId:'m7',action:'approve',expectedRevision:1}]];
const hashes=[],hash=f=>createHash('sha256').update(snapshot(f)).digest('hex');
for(const [index,[name,payload]] of script.entries()){const before=hash(a);invoke(a,name,payload);invoke(z,name,payload);assert.equal(hash(a),hash(z),'First replay divergence at command '+(index+1));hashes.push({index:index+1,name,payload,before,after:hash(a)})}
assert.equal(hashes[2].before,hashes[2].after);
fs.mkdirSync('artifacts/mail-followup-domain',{recursive:true});fs.writeFileSync('artifacts/mail-followup-domain/report.json',JSON.stringify({status:'pass',firstDivergence:null,hashes},null,2)+'\n');
console.log('Mail follow-up: owner response, unchanged money/status, retries, stale guards, recovery and replay passed');
