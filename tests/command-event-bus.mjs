import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const outDir=path.resolve('artifacts/command-event-bus');
fs.rmSync(outDir,{recursive:true,force:true});
fs.mkdirSync(outDir,{recursive:true});

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const pageErrors=[];
page.on('pageerror',error=>pageErrors.push(String(error?.stack||error)));
await page.goto(url,{waitUntil:'networkidle'});
await page.evaluate(()=>localStorage.clear());
await page.reload({waitUntil:'networkidle'});

const initial=await page.evaluate(()=>frontierCommandEventSnapshot());
assert.equal(initial.schemaVersion,1,'command bus schema drifted');
assert.match(initial.sessionId,/^sess_/,'command bus must inherit P5.0.1 session identity');
assert(initial.events.some(event=>event.type==='runtime.command-bus.ready'),'bus-ready event missing');

// Subscription + explicit event emission.
const subscribed=await page.evaluate(()=>{
  window.__qaEvents=[];
  window.__qaUnsubscribe=frontierSubscribeEvent('qa.*',event=>window.__qaEvents.push(event.type));
  frontierEmitEvent('qa.one',{hello:'world'},{source:'qa'});
  frontierEmitEvent('other.one',{ignored:true},{source:'qa'});
  return window.__qaEvents.slice();
});
assert.deepEqual(subscribed,['qa.one'],'prefix subscription failed');

// Successful command: correlate command lifecycle, state save and revision change.
const success=await page.evaluate(async()=>{
  frontierRegisterCommand('qa.incrementResearch',(payload,ctx)=>{
    state.research+=(payload.amount||1);
    ctx.emit('qa.research.changed',{amount:payload.amount});
    save();
    return {research:state.research};
  },{source:'qa',description:'Mutation fixture'});
  const before=frontierDiagnostics().state.stateRevision;
  const result=await frontierDispatchCommand('qa.incrementResearch',{amount:3,password:'must-redact'},{source:'qa-test'});
  const events=frontierEventJournal({type:'command.*',limit:20});
  const completed=[...events].reverse().find(event=>event.type==='command.completed'&&event.data.name==='qa.incrementResearch');
  return {before,after:frontierDiagnostics().state.stateRevision,result,completed,all:frontierEventJournal({limit:50})};
});
assert.equal(success.result.research,3,'command handler did not execute');
assert(success.after>success.before,'state revision did not advance through command');
assert(success.completed,'command completion event missing');
assert.equal(success.completed.data.stateChanged,true,'command completion did not record state mutation');
const started=success.all.find(event=>event.type==='command.started'&&event.commandId===success.completed.commandId);
assert(started,'matching command.started event missing');
assert.equal(started.correlationId,success.completed.correlationId,'command correlation id drifted');
assert.equal(started.data.payload.password,'[REDACTED]','sensitive command payload was not redacted');
assert(success.all.some(event=>event.type==='state.saved'&&event.stateRevision===success.after),'P5.0.1 state-save bridge missing');
assert(success.all.some(event=>event.type==='qa.research.changed'&&event.correlationId===success.completed.correlationId),'handler-emitted event lost command correlation');

// Failure path must be visible and rethrow to the caller without destabilizing bus.
const failure=await page.evaluate(async()=>{
  frontierRegisterCommand('qa.fail',()=>{throw new Error('expected QA failure')},{source:'qa'});
  let message='';
  try{await frontierDispatchCommand('qa.fail',{reason:'fixture'})}catch(error){message=error.message}
  return {message,failed:frontierEventJournal({type:'command.failed',limit:10}).at(-1)};
});
assert.equal(failure.message,'expected QA failure','failed command did not reject to caller');
assert.equal(failure.failed.data.name,'qa.fail','failed command event missing command name');
assert.equal(failure.failed.severity,'error','failed command severity must be error');

// Unknown commands must also leave evidence.
const unknown=await page.evaluate(async()=>{
  let message='';
  try{await frontierDispatchCommand('qa.missing',{})}catch(error){message=error.message}
  return {message,failed:frontierEventJournal({type:'command.failed',limit:10}).at(-1)};
});
assert.match(unknown.message,/Unknown command/,'unknown command did not reject clearly');
assert.equal(unknown.failed.data.name,'qa.missing','unknown command failure not journaled');

// Legacy DOM interactions are visible even before every old screen migrates to commands.
await page.evaluate(()=>{
  const button=document.createElement('button');
  button.id='qa-observed-click';
  button.textContent='Observed click fixture';
  document.body.appendChild(button);
  button.click();
  button.remove();
});
const click=await page.evaluate(()=>frontierEventJournal({type:'ui.click',limit:10}).at(-1));
assert.equal(click.data.id,'qa-observed-click','legacy click observation missing');
assert.equal(click.data.label,'Observed click fixture','legacy click label missing');

// Registry metadata is exportable without handler functions.
const registry=await page.evaluate(()=>frontierCommandRegistry());
const fixture=registry.find(command=>command.name==='qa.incrementResearch');
assert(fixture,'registered command missing from registry snapshot');
assert.equal(fixture.source,'qa','command source metadata drifted');
assert(!('handler' in fixture),'command registry must not export executable handlers');

const snapshot=await page.evaluate(()=>frontierCommandEventSnapshot());
assert(snapshot.eventCount>=10,'journal unexpectedly sparse');
assert.equal(snapshot.stateRevision,await page.evaluate(()=>frontierDiagnostics().state.stateRevision),'snapshot revision disagrees with identity layer');
assert.equal(pageErrors.length,0,`runtime errors: ${pageErrors.join(' | ')}`);

await context.close();
await browser.close();

const report={
  version:1,
  item:'P5.0.2',
  status:'pass',
  generatedAt:new Date().toISOString(),
  buildId:snapshot.buildId,
  sessionId:snapshot.sessionId,
  stateRevision:snapshot.stateRevision,
  eventCount:snapshot.eventCount,
  commandCount:snapshot.commandCount,
  eventTypes:[...new Set(snapshot.events.map(event=>event.type))].sort(),
  commands:snapshot.commands,
  tail:snapshot.events.slice(-30)
};
fs.writeFileSync(path.join(outDir,'report.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'REPORT.md'),`# P5.0.2 Command + Event Bus\n\n- Status: **PASS**\n- Build: \`${report.buildId}\`\n- Session: \`${report.sessionId}\`\n- State revision: **${report.stateRevision}**\n- Journal events: **${report.eventCount}**\n- Registered commands: **${report.commandCount}**\n- Runtime errors: **0**\n- Sensitive payload redaction: **PASS**\n- Command correlation: **PASS**\n- Legacy click observation: **PASS**\n`);
console.log('P5.0.2 command + event bus regression passed');
