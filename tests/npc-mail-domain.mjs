import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const files=['npc-team.js','frontier-mail-frontieros.js','frontier-mail-command.js'];
function fixture(){
 const storage=new Map(),commands=new Map(),events=[];
 const context={console,Date,Math,JSON,structuredClone,Map,Set,
 state:{day:8,selectedIncident:'nan',activeRun:{name:'NOVA-1',startedDay:8,incident:'nan'},workstation:{incidentId:'nan',investigated:[],evidence:[]},organization:{incidents:[{id:'INC-0001',incidentType:'nan',status:'open'}]}},
 INCIDENTS:[{id:'nan',title:'NaN incident',role:'Training'}],
 save(){},render(){throw Error('Native advice must not invoke the legacy renderer')},
 document:{getElementById(){return null},querySelector(){return null}},
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
 sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
 frontierRegisterCommand:(name,fn)=>commands.set(name,fn),frontierEmitEvent:(type,data)=>events.push({type,data}),
 ensureIncidentRecord(){return context.state.organization.incidents[0]}
 };context.window=context;vm.createContext(context);for(const f of files)vm.runInContext(fs.readFileSync(f,'utf8').replace(/\nrender\(\);\s*$/, ''),context,{filename:f});
 return {context,commands,storage,events};
}
const f=fixture();assert(f.commands.has('npc.advice.mail.request'),'Native NPC Mail command is missing');
const payload={employeeId:'maya',incidentId:'nan',view:'data'};
const request=()=>f.commands.get('npc.advice.mail.request')(payload,{emit:(type,data)=>f.events.push({type,data})});
f.context.ensureNpcTeam();const beforeInvalid=JSON.stringify(f.context.state);assert.equal(f.commands.get('npc.advice.mail.request')({...payload,employeeId:'missing'},{emit(){}}).status,'unknown-employee');assert.equal(JSON.stringify(f.context.state),beforeInvalid,'Unknown employee changed canonical state');
const first=request();assert.equal(first.ok,true);const before=JSON.stringify(f.context.state);const second=request();assert.equal(second.threadId,first.threadId);assert.equal(JSON.stringify(f.context.state),before,'Retry changed NPC state');
let box=f.context.frontierMailExport();let thread=box.threads.find(t=>t.id===first.threadId);assert.equal(thread.messages.length,1);assert.equal(thread.linkedEntity.incidentRecordId,'INC-0001');assert.equal(thread.linkedEntity.view,'data');assert.equal(f.context.state.npcEmployees[0].incidentsHelped,1);assert.equal(f.context.state.workstation.npcSubview,undefined);
assert.equal(f.context.frontierMailLinkedIncidentAvailable(first.threadId),true);
// Navigation must carry folder context without changing simulation or saved advice.
const routes=[];f.context.frontierOsNavigate=(app,options)=>{routes.push({app,...options});return{ok:true}};
for(const folder of ['inbox','needs-decision','unread','starred','archive']){
 f.context.frontierMailOpen({detail:`thread/${first.threadId}/from/${folder}`});
 const saved=JSON.stringify({state:f.context.state,mail:f.context.frontierMailExport()});
 await f.context.frontierMailOpenLinked(first.threadId);
 assert.equal(routes.at(-1).detail,`nan/data/return/${first.threadId}/from/${folder}`,'Run route lost originating folder');
 assert.equal(JSON.stringify({state:f.context.state,mail:f.context.frontierMailExport()}),saved,'Link navigation mutated saved state');
}
// Exercise the actual Run Monitor parser and Back control, including old links.
f.context.WORKSTATION_CASES={nan:{}};
let click;
f.context.document.getElementById=()=>({innerHTML:'',querySelector:()=>({addEventListener:(type,handler)=>{click=handler}})});
vm.runInContext(fs.readFileSync('run-monitor-frontieros.js','utf8'),f.context);
const savedRun=JSON.stringify(f.context.state);
for(const folder of ['inbox','needs-decision','unread','starred','archive']){
 f.context.frontierRunMonitorOpen({detail:`nan/data/return/${first.threadId}/from/${folder}`});
 const run=f.context.frontierRunMonitorSnapshot();assert.equal(run.returnFolder,folder);assert.equal(run.incidentId,'nan');assert.equal(run.view,'data');
 await click({target:{closest:selector=>selector==='[data-rm-return-mail]'?{dataset:{rmReturnMail:first.threadId}}:null}});
 assert.equal(routes.at(-1).app,`frontieros://mail/thread/${first.threadId}/from/${folder}`);
}
f.context.frontierRunMonitorOpen({detail:`nan/data/return/${first.threadId}`});
assert.equal(f.context.frontierRunMonitorSnapshot().returnFolder,null,'Legacy link retained unrelated folder');
await click({target:{closest:()=>({dataset:{rmReturnMail:first.threadId}})}});
assert.equal(routes.at(-1).app,`frontieros://mail/thread/${first.threadId}`);
f.context.frontierRunMonitorOpen({detail:'nan/data/return/thread%2Fwith%20space/from/archive'});
assert.equal(f.context.frontierRunMonitorSnapshot().returnThreadId,'thread/with space');
await click({target:{closest:()=>({dataset:{rmReturnMail:'thread/with space'}})}});
assert.equal(routes.at(-1).app,'frontieros://mail/thread/thread%2Fwith%20space/from/archive');
for(const detail of ['nan/data','%invalid']){
 f.context.frontierRunMonitorOpen({detail});assert.equal(f.context.frontierRunMonitorSnapshot().returnThreadId,null);assert.equal(f.context.frontierRunMonitorSnapshot().returnFolder,null);
}
assert.equal(JSON.stringify(f.context.state),savedRun,'Run navigation mutated canonical state');
f.context.document.getElementById=()=>null;
f.context.state.activeRun.name='DIFFERENT-RUN';assert.equal(f.context.frontierMailLinkedIncidentAvailable(first.threadId),false);f.context.state.activeRun.name='NOVA-1';
f.context.state.organization.incidents[0].status='resolved';assert.equal(f.context.frontierMailLinkedIncidentAvailable(first.threadId),false);f.context.state.organization.incidents[0].status='open';
f.context.state.organization.incidents=[];assert.equal(f.context.frontierMailLinkedIncidentAvailable(first.threadId),false);
// Replay the same serialized command from identical simulation + mailbox snapshots.
const a=fixture(),b=fixture();const initial=JSON.stringify(a.context.frontierMailExport());b.storage.set('frontier.os.mail.v1',initial);
const invoke=x=>x.commands.get('npc.advice.mail.request')(JSON.parse(JSON.stringify(payload)),{emit(){}});
assert.equal(invoke(a).threadId,invoke(b).threadId);assert.equal(JSON.stringify(a.context.state),JSON.stringify(b.context.state),'Simulation diverged on command 1');assert.equal(JSON.stringify(a.context.frontierMailExport()),JSON.stringify(b.context.frontierMailExport()),'Mailbox diverged on command 1');
const migrated=fixture();migrated.storage.set('frontier.os.mail.v1',JSON.stringify({schemaVersion:1,nextId:2,threads:[{id:'m1',from:'Legacy',subject:'Preserve me',updatedAt:10,messages:[{id:'old',from:'Legacy',at:10,body:'Still here'}]}]}));const migratedBox=migrated.context.frontierMailExport();assert.equal(migratedBox.schemaVersion,3);assert.equal(migratedBox.threads[0].messages[0].body,'Still here');assert.equal(migratedBox.threads[0].linkedEntity,null);
console.log('NPC Mail domain: delivery, idempotency, stale links and deterministic replay passed');
