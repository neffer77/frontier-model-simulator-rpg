import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

function fixture(){
  const storage=new Map(),commands=new Map(),events=[];
  const c={console,Date,Math,JSON,structuredClone,Map,Set,
    state:{day:8,cash:30000000,programLearning:{programMaturity:.45},npcEmployees:[{id:'maya',name:'Maya Chen'},{id:'priya',name:'Priya Rao'},{id:'external',name:'Not on committee'}],
      portfolioStrategy:{initiatives:[{id:'IN-001',key:'research',name:'Architecture bet',createdDay:8,status:'proposed',costM:2.4,fundedM:0,peopleAllocated:0,progress:0,risk:.52,upsideM:14,theme:'science'}]},
      investmentCommittee:{version:1,scenarios:{bull:.25,base:.5,bear:.25},gates:{},decisions:[],debates:[],committeeIds:['maya','priya'],optionDiscipline:.51}},
    ensurePortfolioStrategy(){throw Error('Typed decisions must not advance unrelated portfolio progression')},
    save(){if(c.failSave)throw Error('Injected simulation persistence failure');storage.set('simulation',JSON.stringify(c.state))},render(){},
    document:{getElementById(){return null},querySelector(){return null}},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(c.failMail)throw Error('Injected Mail persistence failure');storage.set(k,v)},removeItem:k=>storage.delete(k)},
    frontierRegisterCommand:(name,fn)=>commands.set(name,fn),frontierEmitEvent:(type,data)=>events.push({type,data})};
  c.window=c;vm.createContext(c);
  for(const file of ['investment-committee.js','frontier-mail-frontieros.js','frontier-mail-command.js']){
    let code=fs.readFileSync(file,'utf8');if(file==='investment-committee.js')code=code.slice(0,code.indexOf('const icBaseRender='));
    vm.runInContext(code,c,{filename:file});
  }
  return {c,storage,commands,events};
}
const f=fixture();
assert(f.commands.has('finance.funding.mail.request'),'Missing typed Finance → Mail request command');
assert(f.commands.has('mail.decision.respond'),'Missing typed Mail response command');
const copy=x=>JSON.parse(JSON.stringify(x));
const invoke=(f,name,payload)=>f.commands.get(name)(copy(payload),{emit:(type,data)=>f.events.push({type,data})});
const request=f=>invoke(f,'finance.funding.mail.request',{initiativeId:'IN-001'});
const respond=(f,threadId,action,expectedRevision,delegateId=null)=>invoke(f,'mail.decision.respond',{threadId,action,expectedRevision,delegateId});
const snapshot=f=>JSON.stringify({state:f.c.state,mail:f.c.frontierMailExport()});
const receipt=(f,id)=>f.c.fundingMailRequest(id);
const first=request(f),initial=snapshot(f);
assert(first.ok);assert.equal(request(f).threadId,first.threadId);assert.equal(snapshot(f),initial,'Request retry changed state');
assert.equal(f.c.state.investmentCommittee.version,2);assert.equal(receipt(f,first.requestId).amountM,.6);
assert.equal(respond(f,first.threadId,'delegate',0,'external').status,'invalid-delegate');assert.equal(snapshot(f),initial,'Ineligible delegate mutated state');
assert.equal(respond(f,first.threadId,'delegate',0,'maya').status,'delegated');
assert.equal(f.c.state.cash,30000000);assert.equal(f.c.state.portfolioStrategy.initiatives[0].progress,0,'Delegation advanced progression');
const delegated=snapshot(f);assert.equal(respond(f,first.threadId,'delegate',0,'maya').status,'reused');assert.equal(snapshot(f),delegated);
assert.equal(respond(f,first.threadId,'approve',0).status,'revision-conflict');assert.equal(snapshot(f),delegated);
assert.equal(respond(f,first.threadId,'approve',1).status,'approved');
assert.equal(f.c.state.cash,29400000);assert.equal(f.c.state.investmentCommittee.gates['IN-001'].stage,1);assert.equal(f.c.state.investmentCommittee.decisions.length,1);
assert.equal(receipt(f,first.requestId).delegateId,'maya');assert.equal(receipt(f,first.requestId).audit.length,3);
const approved=snapshot(f);assert.equal(respond(f,first.threadId,'approve',1).status,'reused');assert.equal(snapshot(f),approved,'Approval retry duplicated mutation');
assert.equal(respond(f,first.threadId,'reject',2).status,'already-decided');assert.equal(snapshot(f),approved);
assert.equal(f.c.frontierMailExport().threads.find(t=>t.id===first.threadId).messages.length,3);
// Reload both durable stores and retry the same serialized receipt.
const loaded=fixture();loaded.c.state=copy(f.c.state);loaded.c.frontierMailImport(f.c.frontierMailExport());
const loadedBefore=snapshot(loaded);assert.equal(respond(loaded,first.threadId,'approve',1).status,'reused');assert.equal(snapshot(loaded),loadedBefore);

const rejected=fixture(),rejectRequest=request(rejected),beforeReject=copy(rejected.c.state.portfolioStrategy);
assert.equal(respond(rejected,rejectRequest.threadId,'reject',0).status,'rejected');
assert.deepEqual(copy(rejected.c.state.portfolioStrategy),beforeReject);assert.equal(rejected.c.state.cash,30000000);assert.equal(rejected.c.state.investmentCommittee.decisions.length,0);
const rejectedBefore=snapshot(rejected);assert.equal(request(rejected).threadId,rejectRequest.threadId);assert.equal(respond(rejected,rejectRequest.threadId,'reject',0).status,'reused');assert.equal(snapshot(rejected),rejectedBefore);

const poor=fixture(),poorRequest=request(poor);poor.c.state.cash=1;const poorBefore=snapshot(poor);
assert.equal(respond(poor,poorRequest.threadId,'approve',0).status,'insufficient-cash');assert.equal(snapshot(poor),poorBefore);
assert.equal(poor.c.fundingMailStatus(poorRequest.requestId).canApprove,false);
poor.c.state.cash=1000000;assert.equal(respond(poor,poorRequest.threadId,'approve',0).status,'approved');

for(const [name,change,reason] of [
  ['deleted',f=>{f.c.state.portfolioStrategy.initiatives=[]},'initiative-missing'],
  ['changed cost',f=>{f.c.state.portfolioStrategy.initiatives[0].costM=3},'initiative-changed'],
  ['stopped',f=>{f.c.state.portfolioStrategy.initiatives[0].status='killed'},'initiative-changed'],
  ['completed',f=>{f.c.state.portfolioStrategy.initiatives[0].status='completed'},'initiative-changed'],
  ['reused id',f=>{f.c.state.portfolioStrategy.initiatives[0].createdDay=9},'initiative-changed'],
  ['direct funding',f=>{f.c.gateInitiative('IN-001','fund',{native:true})},'initiative-changed']
]){
  const f=fixture(),r=request(f);change(f);const before=snapshot(f);
  for(const action of ['approve','reject','delegate'])assert.equal(respond(f,r.threadId,action,0,'maya').status,reason,name);
  assert.equal(snapshot(f),before,name+' changed state');
}
const unknown=fixture();const unknownBefore=snapshot(unknown);
assert.equal(invoke(unknown,'finance.funding.mail.request',{initiativeId:'missing'}).status,'initiative-missing');
assert.equal(respond(unknown,'missing','approve',0).status,'unsupported-request');assert.equal(snapshot(unknown),unknownBefore);
const invalid=fixture(),invalidRequest=request(invalid),invalidBefore=snapshot(invalid);
for(const revision of [-1,0.5,'0',null])assert.equal(respond(invalid,invalidRequest.threadId,'approve',revision).status,'invalid-response');
assert.equal(respond(invalid,invalidRequest.threadId,'other',0).status,'invalid-response');assert.equal(snapshot(invalid),invalidBefore);

// Domain persistence failure rolls back money and the approval receipt together.
const broken=fixture(),brokenRequest=request(broken),brokenBefore=snapshot(broken);broken.c.failSave=true;
assert.throws(()=>respond(broken,brokenRequest.threadId,'approve',0),/persistence failure/);assert.equal(snapshot(broken),brokenBefore);
broken.c.failSave=false;assert.equal(respond(broken,brokenRequest.threadId,'approve',0).status,'approved');
// A projection write failure cannot cause another tranche on retry/reload.
const projection=fixture(),projectionRequest=request(projection);projection.c.failMail=true;
const partial=respond(projection,projectionRequest.threadId,'approve',0);assert(partial.ok);assert.equal(partial.mailSynced,false);assert.equal(projection.c.state.cash,29400000);
projection.c.failMail=false;assert.equal(respond(projection,projectionRequest.threadId,'approve',0).status,'reused');assert.equal(projection.c.state.cash,29400000);
assert.equal(projection.c.frontierMailExport().threads.find(t=>t.id===projectionRequest.threadId).messages.length,2);
// A failed first delivery is recovered by requesting the same canonical review.
const delivery=fixture();delivery.c.failMail=true;assert.throws(()=>request(delivery),/Mail persistence failure/);assert.equal(delivery.c.state.investmentCommittee.mailRequests.length,1);
delivery.c.failMail=false;assert(request(delivery).ok);assert.equal(delivery.c.state.investmentCommittee.mailRequests.length,1);

for(const version of [1,2]){
  const migrated=fixture();migrated.storage.set('frontier.os.mail.v1',JSON.stringify({schemaVersion:version,nextId:2,threads:[{id:'m1',from:'Original',subject:'Keep me',updatedAt:10,messages:[{id:'old',from:'Original',at:10,body:'History'}],linkedEntity:version===2?{type:'incident',incidentId:'nan'}:null}]}));
  const box=migrated.c.frontierMailExport();assert.equal(box.schemaVersion,3);assert.equal(box.threads[0].messages[0].body,'History');assert.equal(box.threads[0].decisionRequest,null);
  assert.equal(box.threads[0].linkedEntity?.type,version===2?'incident':undefined);
}

// Replay from identical simulation + mailbox snapshots; hash every action and
// report the first divergent command, not only the final state.
const a=fixture(),b=fixture();b.c.frontierMailImport(a.c.frontierMailExport());
const script=[{name:'finance.funding.mail.request',payload:{initiativeId:'IN-001'}},{name:'mail.decision.respond',payload:{threadId:'m7',action:'delegate',expectedRevision:0,delegateId:'maya'}},{name:'mail.decision.respond',payload:{threadId:'m7',action:'approve',expectedRevision:1}},{name:'mail.decision.respond',payload:{threadId:'m7',action:'approve',expectedRevision:1}}];
const hashes=[];
for(const [index,command] of script.entries()){
  const before=createHash('sha256').update(snapshot(a)).digest('hex');invoke(a,command.name,command.payload);invoke(b,command.name,command.payload);
  assert.equal(snapshot(a),snapshot(b),'First replay divergence at command '+(index+1)+': '+JSON.stringify(command));
  hashes.push({index:index+1,command,before,after:createHash('sha256').update(snapshot(a)).digest('hex')});
}
assert.equal(hashes.at(-1).before,hashes.at(-1).after,'Replay retry changed the state hash');
fs.mkdirSync('artifacts/mail-decision-domain',{recursive:true});
fs.writeFileSync('artifacts/mail-decision-domain/report.json',JSON.stringify({status:'pass',type:'finance.funding-gate',hashes,firstDivergence:null},null,2)+'\n');
console.log('Mail decisions: approve/reject/delegate, concurrency, stale guards, persistence recovery, migration and deterministic replay passed');
