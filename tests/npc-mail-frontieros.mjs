import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const base=process.env.TEST_URL||'http://127.0.0.1:4173/';
const out=path.resolve('artifacts/npc-mail-frontieros');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const pageErrors=[];
const report={version:2,item:'P5.3.8',status:'pass',generatedAt:null,surfaces:{},pageErrors:0,evidence:[]};

const navigationState=page=>page.evaluate(()=>({cash:state.cash,run:state.activeRun,workstation:state.workstation,npc:state.npcEmployees,incidents:state.organization.incidents,gates:state.investmentCommittee?.gates,portfolio:state.portfolioStrategy,mail:frontierMailExport()}));
async function reloadRunAndReturn(page,threadId,folder,surface){
 const before=await navigationState(page);
 await page.getByRole('button',{name:'Open Run'}).click();
 await page.locator('[data-frontieros-native-app="training"]').waitFor({state:'visible'});
 assert.equal((await page.evaluate(()=>frontierOsSessionSnapshot())).current.detail,`nan/data/return/${threadId}/from/${folder}`);
 await page.reload({waitUntil:'networkidle'});
 await page.locator('[data-frontieros-native-app="training"]').waitFor({state:'visible'});
 const run=await page.evaluate(()=>frontierRunMonitorSnapshot());
 assert.equal(run.returnFolder,folder);assert.equal(run.returnThreadId,threadId);assert.equal(run.incidentId,'nan');assert.equal(run.view,'data');
 const back=page.getByRole('button',{name:'← Back to advice'});await back.scrollIntoViewIfNeeded();
 const bounds=await back.boundingBox();assert(bounds.height>=(surface==='phone'?44:40),`${surface}: return target too short: ${bounds.height}`);assert(bounds.x>=0);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Return control overflows viewport');
 await back.click();await page.locator('[data-frontieros-native-app="mail"]').waitFor({state:'visible'});
 const mail=await page.evaluate(()=>frontierMailSnapshot());assert.equal(mail.threadId,threadId);assert.equal(mail.folder,folder);
 assert.equal((await page.evaluate(()=>frontierOsSessionSnapshot())).current.detail,`thread/${threadId}/from/${folder}`);
 assert.deepEqual(await navigationState(page),before,'Run reload/return changed saved simulation or advice');
 await page.locator('[data-fm-back]').click();
 assert.equal((await page.evaluate(()=>frontierMailSnapshot())).folder,folder);
 await page.locator(`[data-fm-thread="${threadId}"]`).click();
}

async function runJourney(surface,viewport,device={}){
  const context=await browser.newContext({viewport,...device});
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  const page=await context.newPage();
  page.on('pageerror',error=>pageErrors.push(`${surface}: ${String(error?.stack||error)}`));
  try{
  const query=surface==='phone'?'?frontieros=1':'?frontieros=desktop';
  await page.goto(`${base}${query}`,{waitUntil:'networkidle'});
  await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()});
  await page.reload({waitUntil:'networkidle'});
  await page.evaluate(()=>{
    state.started=true;state.cash=30000000;state.day=8;state.activeRun={name:'NOVA-LINK',tier:'7b',progress:44,phase:'pretraining',physics:{steps:1000,batch:1048576,tokens:1048576000,flops:1.2e20,gpuHours:240},startedDay:8,loss:1.928,incident:'nan'};state.selectedIncident='nan';state.workstation=newWorkstation('nan');ensureIncidentRecord('nan');modelLabCaptureActiveRun();save();
  });
  const opened=await page.evaluate(()=>frontierOsNavigate('training',{detail:'nan/data',source:'npc-mail-qa'}));
  assert.equal(opened.ok,true,`${surface}: Run Monitor did not open`);
  await page.locator('[data-frontieros-native-app="training"]').waitFor({state:'visible'});
  let run=await page.evaluate(()=>frontierRunMonitorSnapshot());
  assert.equal(run.incidentId,'nan',`${surface}: incident context missing`);
  assert.equal(run.view,'data',`${surface}: originating view missing`);
  assert(run.team.length>=8&&run.team.some(person=>person.id==='maya'),`${surface}: canonical team missing`);
  const before=await page.evaluate(()=>{
    const employee=state.npcEmployees.find(person=>person.id==='maya');
    const record=state.organization.incidents.find(item=>item.status==='open'&&item.incidentType==='nan');
    return {employee:{incidentsHelped:employee.incidentsHelped,workload:employee.workload,trust:employee.trust,memories:employee.memories.length},recordId:record.id,consultations:record.participants.maya?.consultations||0,mail:frontierMailExport()};
  });
  await page.getByRole('button',{name:/Ask Maya/}).click();
  await page.locator('[data-frontieros-native-app="mail"]').waitFor({state:'visible'});
  const afterFirst=await page.evaluate(()=>{
    const mail=frontierMailSnapshot(),employee=state.npcEmployees.find(person=>person.id==='maya'),record=state.organization.incidents.find(item=>item.id===mail.threads.find(thread=>thread.requestKey?.includes(':maya'))?.linkedEntity?.incidentRecordId);
    return {mail,employee:{incidentsHelped:employee.incidentsHelped,workload:employee.workload,trust:employee.trust,memories:employee.memories.length},consultations:record?.participants?.maya?.consultations||0,legacySubview:state.workstation?.npcSubview||null};
  });
  const advice=afterFirst.mail.threads.find(thread=>thread.requestKey?.includes(':maya'));
  assert(advice,`${surface}: advice thread was not persisted`);
  assert.equal(afterFirst.mail.threadId,advice.id,`${surface}: delivered thread was not opened`);
  assert.equal(advice.messageCount,1,`${surface}: advice must be a single message`);
  assert.equal(advice.linkedEntity.incidentRecordId,before.recordId,`${surface}: incident record link drifted`);
  assert.equal(advice.linkedEntity.view,'data',`${surface}: source view link drifted`);
  assert.equal(advice.linkedStatus.available,true,`${surface}: live link reported stale`);
  assert.equal(afterFirst.employee.incidentsHelped,before.employee.incidentsHelped+1,`${surface}: canonical incident count did not increment once`);
  assert.equal(afterFirst.employee.workload,before.employee.workload+4,`${surface}: canonical workload mutation missing`);
  assert.equal(afterFirst.employee.trust,before.employee.trust+1,`${surface}: canonical trust mutation missing`);
  assert.equal(afterFirst.employee.memories,before.employee.memories+1,`${surface}: canonical memory mutation missing`);
  assert.equal(afterFirst.consultations,before.consultations+1,`${surface}: incident participant history missing`);
  assert.notEqual(afterFirst.legacySubview,'advice',`${surface}: legacy advice subview leaked into native journey`);
  const mailShot=`${surface}-mail-advice.png`;
  await page.screenshot({path:path.join(out,mailShot),fullPage:true});report.evidence.push(mailShot);
  const bundle=await page.evaluate(()=>frontierCreateDebugBundle({reason:'npc-mail-journey'}));
  assert.equal(bundle.applicationState?.mail?.start?.threads?.length,before.mail.threads.length,`${surface}: debug bundle lost starting mailbox`);
  assert.equal(bundle.applicationState?.mail?.current?.threads?.length,before.mail.threads.length+1,`${surface}: debug bundle lost current mailbox`);
  assert.equal(bundle.reproduction?.applicationState?.mail?.start?.threads?.length,before.mail.threads.length,`${surface}: reproduction contract lacks mailbox start state`);
  await reloadRunAndReturn(page,advice.id,'inbox',surface);
  await page.getByRole('button',{name:'Open Run'}).click();
  await page.locator('[data-frontieros-native-app="training"]').waitFor({state:'visible'});
  run=await page.evaluate(()=>frontierRunMonitorSnapshot());
  assert.equal(run.incidentId,'nan',`${surface}: linked run lost incident`);
  assert.equal(run.view,'data',`${surface}: linked run lost source view`);
  assert.equal(run.returnThreadId,advice.id,`${surface}: linked run lost return thread`);
  assert(await page.getByRole('button',{name:'← Back to advice'}).isVisible(),`${surface}: explicit return control missing`);
  const runShot=`${surface}-linked-run.png`;
  await page.screenshot({path:path.join(out,runShot),fullPage:true});report.evidence.push(runShot);
  await page.getByRole('button',{name:'← Back to advice'}).click();
  await page.locator('[data-frontieros-native-app="mail"]').waitFor({state:'visible'});
  assert.equal((await page.evaluate(()=>frontierMailSnapshot())).threadId,advice.id,`${surface}: return did not restore advice thread`);
  await page.getByRole('button',{name:'Open Run'}).click();
  await page.locator('[data-frontieros-native-app="training"]').waitFor({state:'visible'});
  await page.getByRole('button',{name:/Ask Maya/}).click();
  await page.locator('[data-frontieros-native-app="mail"]').waitFor({state:'visible'});
  const afterRetry=await page.evaluate(()=>{
    const mail=frontierMailSnapshot(),employee=state.npcEmployees.find(person=>person.id==='maya'),record=state.organization.incidents.find(item=>item.id===mail.threads.find(thread=>thread.requestKey?.includes(':maya'))?.linkedEntity?.incidentRecordId);
    return {mail,employee:{incidentsHelped:employee.incidentsHelped,workload:employee.workload,trust:employee.trust,memories:employee.memories.length},consultations:record?.participants?.maya?.consultations||0};
  });
  const retried=afterRetry.mail.threads.find(thread=>thread.requestKey===advice.requestKey);
  assert.equal(retried.id,advice.id,`${surface}: retry created a different thread`);
  assert.equal(retried.messageCount,1,`${surface}: retry duplicated advice message`);
  assert.deepEqual(afterRetry.employee,afterFirst.employee,`${surface}: retry duplicated canonical employee mutation`);
  assert.equal(afterRetry.consultations,afterFirst.consultations,`${surface}: retry duplicated consultation history`);
  const events=await page.evaluate(()=>frontierEventJournal({limit:300}));
  for(const type of ['command.started','command.completed','npc.advice.mail.reused','mail.advice.link.opened','run-monitor.team.requested'])assert(events.some(event=>event.type===type),`${surface}: telemetry missing ${type}`);
  const beforeReload=await page.evaluate(()=>frontierOsSessionSnapshot());
  assert.equal(beforeReload.current?.detail,`thread/${advice.id}`,`${surface}: session did not preserve advice detail`);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(threadId=>{const session=window.frontierOsSessionSnapshot?.();return session?.current?.appId==='mail'&&session.current.detail===`thread/${threadId}`},advice.id);
  await page.locator('[data-frontieros-native-app="mail"]').waitFor({state:'visible'});
  const restored=await page.evaluate(()=>frontierOsSessionSnapshot());
  assert.equal(restored.current?.detail,`thread/${advice.id}`,`${surface}: session restore lost advice detail`);
  const afterReload=await page.evaluate(()=>frontierMailSnapshot());
  assert.equal(afterReload.threadId,advice.id,`${surface}: reload lost selected advice thread`);
  assert.equal(afterReload.threads.find(thread=>thread.id===advice.id)?.messageCount,1,`${surface}: reload lost or duplicated advice`);
  // A starred and then archived thread must survive destination reloads in place.
  await page.locator(`[data-fm-star="${advice.id}"]`).click();
  await page.locator('[data-fm-back]').click();await page.locator('[data-fm-folder="starred"]').click();
  await page.locator(`[data-fm-thread="${advice.id}"]`).click();
  await reloadRunAndReturn(page,advice.id,'starred',surface);
  await page.locator(`[data-fm-archive="${advice.id}"]`).click();
  await page.locator('[data-fm-folder="archive"]').click();await page.locator(`[data-fm-thread="${advice.id}"]`).click();
  await reloadRunAndReturn(page,advice.id,'archive',surface);
  const archiveShot=`${surface}-archive-return.png`;await page.screenshot({path:path.join(out,archiveShot),fullPage:true});report.evidence.push(archiveShot);
  // Old saved links keep the original plain-thread return behavior.
  await page.evaluate(id=>frontierOsNavigate('training',{detail:`nan/data/return/${id}`}),advice.id);
  await page.reload({waitUntil:'networkidle'});await page.locator('[data-frontieros-native-app="training"]').waitFor({state:'visible'});
  assert.equal((await page.evaluate(()=>frontierRunMonitorSnapshot())).returnFolder,null);
  await page.getByRole('button',{name:'← Back to advice'}).click();await page.locator('[data-frontieros-native-app="mail"]').waitFor({state:'visible'});
  assert.equal((await page.evaluate(()=>frontierOsSessionSnapshot())).current.detail,`thread/${advice.id}`);
  assert.equal((await page.evaluate(()=>frontierMailSnapshot())).threadId,advice.id);
  assert.equal((await page.evaluate(()=>frontierMailSnapshot())).threads.find(thread=>thread.id===advice.id).archived,true);
  await page.evaluate(()=>{state.activeRun.name='NOVA-OTHER';save();frontierMailOpenThread(frontierMailSnapshot().threadId)});
  assert.equal(await page.locator('[data-fm-linked-status="stale"]').count(),1,`${surface}: stale link warning missing`);
  assert.equal(await page.getByRole('button',{name:'Run unavailable'}).isDisabled(),true,`${surface}: stale link remained actionable`);
  const staleShot=`${surface}-stale-advice.png`;
  await page.screenshot({path:path.join(out,staleShot),fullPage:true});report.evidence.push(staleShot);
  const trace=`${surface}-trace.zip`;await context.tracing.stop({path:path.join(out,trace)});report.evidence.push(trace);
  report.surfaces[surface]={threadId:advice.id,requestKey:advice.requestKey,incidentRecordId:advice.linkedEntity.incidentRecordId,view:advice.linkedEntity.view,messageCount:retried.messageCount,reloadRestored:true,returnFolders:['inbox','starred','archive'],legacyLink:true,unchangedNavigationState:true,staleGuard:true};
  }catch(error){
   report.status='fail';report.failure=String(error.stack||error);report.pageErrors=pageErrors.length;
   await page.screenshot({path:path.join(out,`${surface}-failure.png`),fullPage:true}).catch(()=>{});
   const state=await page.evaluate(()=>({simulation:typeof state==='undefined'?null:state,mail:window.frontierMailExport?.(),run:window.frontierRunMonitorSnapshot?.(),session:window.frontierOsSessionSnapshot?.(),events:window.frontierEventJournal?.({limit:300})})).catch(()=>null);
   fs.writeFileSync(path.join(out,`${surface}-failure.json`),JSON.stringify(state,null,2));
   fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
   await context.tracing.stop({path:path.join(out,`${surface}-failure-trace.zip`)}).catch(()=>{});throw error;
  }finally{await context.close()}
}

await runJourney('phone',{width:390,height:844},{isMobile:true,hasTouch:true});
await runJourney('desktop',{width:1440,height:1000});
async function checkResponsive(name,viewport,surface){
  const context=await browser.newContext({viewport,isMobile:surface==='phone',hasTouch:surface==='phone'}),page=await context.newPage();
  page.on('pageerror',error=>pageErrors.push(`${name}: ${String(error?.stack||error)}`));
  await page.goto(`${base}${surface==='phone'?'?frontieros=1':'?frontieros=desktop'}`,{waitUntil:'networkidle'});await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()});await page.reload({waitUntil:'networkidle'});
  await page.evaluate(()=>{state.started=true;state.activeRun={name:'NOVA-RESPONSIVE',tier:'7b',progress:38,phase:'pretraining',physics:{steps:1000,batch:1048576,tokens:1048576000,flops:1.2e20,gpuHours:240},startedDay:5,loss:2.03,incident:'nan'};state.selectedIncident='nan';state.workstation=newWorkstation('nan');ensureIncidentRecord('nan');save()});
  assert.equal((await page.evaluate(()=>frontierOsNavigate('training',{detail:'nan/data'}))).ok,true,`${name}: Run Monitor launch failed`);await page.locator('.rm-team').waitFor({state:'visible'});
  const teamCount=(await page.evaluate(()=>frontierRunMonitorSnapshot())).team.length;const layout=await page.locator('[data-frontieros-native-app="training"]').evaluate(root=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,left:root.getBoundingClientRect().left,right:root.getBoundingClientRect().right,buttons:[...root.querySelectorAll('.rm-team-person')].map(button=>{const rect=button.getBoundingClientRect();return{left:rect.left,right:rect.right,height:rect.height}})}));
  assert(teamCount>=8,`${name}: canonical roster unexpectedly small`);assert.equal(layout.buttons.length,teamCount,`${name}: responsive team roster incomplete`);assert(layout.documentWidth<=layout.viewport+1,`${name}: document overflow ${JSON.stringify(layout)}`);assert(layout.buttons.every(button=>button.left>=-1&&button.right<=layout.viewport+1),`${name}: team card escapes viewport`);assert(layout.buttons.every(button=>button.height>=(surface==='phone'?44:40)),`${name}: team card target too short`);
  const shot=`${name}-run-team.png`;await page.screenshot({path:path.join(out,shot),fullPage:true});report.evidence.push(shot);report.surfaces[name]={viewport,teamCards:layout.buttons.length,noHorizontalOverflow:true};await context.close();
}
await checkResponsive('phone-landscape',{width:844,height:390},'phone');
await checkResponsive('tablet',{width:820,height:1180},'phone');
await checkResponsive('wide',{width:1728,height:1117},'desktop');
await browser.close();
assert.equal(pageErrors.length,0,`runtime page errors: ${pageErrors.join(' | ')}`);
report.generatedAt=new Date().toISOString();report.pageErrors=pageErrors.length;
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(out,'REPORT.md'),`# P5.3.8 NPC → Mail Journey\n\n- Status: **PASS**\n- Phone end-to-end journey: **PASS**\n- Desktop end-to-end journey: **PASS**\n- Landscape/tablet/wide layout checks: **PASS**\n- Canonical NPC mutation + incident history: **PASS**\n- Retry idempotency: **PASS**\n- Linked Run Monitor return path: **PASS**\n- Reload/session persistence: **PASS**\n- Stale-link guard: **PASS**\n- Debug/reproduction mailbox snapshots: **PASS**\n- Runtime page errors: **0**\n- Screenshots and traces: **captured**\n`);
console.log('P5.3.8 NPC → Mail cross-device journey passed');
