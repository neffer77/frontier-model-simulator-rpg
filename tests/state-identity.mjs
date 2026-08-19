import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const outDir=path.resolve('artifacts/state-identity');
fs.rmSync(outDir,{recursive:true,force:true});
fs.mkdirSync(outDir,{recursive:true});
const evidence=[];
const browser=await chromium.launch({headless:true});

{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  await page.goto(url,{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'networkidle'});

  const initial=await page.evaluate(()=>frontierDiagnostics());
  evidence.push({case:'desktop-initial',diagnostics:initial});
  assert.equal(initial.schemaVersion,1);
  assert(initial.build.buildId);
  if(initial.build.buildId!=='local'){
    assert.match(initial.build.buildId,/^[a-f0-9]{12}$/i);
    assert(initial.build.gitSha?.startsWith(initial.build.buildId));
    assert(initial.build.builtAt);
  }
  assert.match(initial.session.sessionId,/^sess_/);
  assert(Number.isInteger(initial.state.stateRevision)&&initial.state.stateRevision>=0);
  assert.equal(initial.device.mode,'desktop');
  assert.equal(initial.route,'founder/setup');

  await page.evaluate(()=>save());
  const baseline=await page.evaluate(()=>frontierDiagnostics());
  evidence.push({case:'desktop-bootstrap-normalized',diagnostics:baseline});
  const baselineRevision=baseline.state.stateRevision;

  await page.evaluate(()=>save());
  const noop=await page.evaluate(()=>frontierDiagnostics());
  assert.equal(noop.state.stateRevision,baselineRevision,'no-op save must not create a state revision');

  await page.evaluate(()=>{state.day+=1;save()});
  const mutated=await page.evaluate(()=>frontierDiagnostics());
  evidence.push({case:'desktop-state-mutation',diagnostics:mutated});
  assert.equal(mutated.state.stateRevision,baselineRevision+1,'one direct state change must advance exactly one revision');
  assert(mutated.state.lastMutationAt);

  await page.evaluate(()=>save());
  const secondNoop=await page.evaluate(()=>frontierDiagnostics());
  assert.equal(secondNoop.state.stateRevision,mutated.state.stateRevision,'second no-op save fabricated a revision');

  const sessionBefore=mutated.session.sessionId;
  const persistedBeforeReload=Number(await page.evaluate(()=>JSON.parse(localStorage.getItem('frontier-lab-v3')||'{}')?._frontier?.stateRevision||0));

  // The outgoing page owns its unload lifecycle and may commit legitimate domain state
  // before navigation completes. The invariant we care about is that the *new page's*
  // bootstrap does not manufacture another semantic revision. Playwright owns navigation
  // so there is no execution-context race.
  await page.reload({waitUntil:'networkidle'});

  const afterReload=await page.evaluate(()=>frontierDiagnostics());
  const reloadTimeline=await page.evaluate(()=>frontierStateWriteTimeline?.()||[]);
  const lifecycleDelta=afterReload.state.stateRevision-persistedBeforeReload;
  evidence.push({case:'desktop-reload',diagnostics:afterReload,persistedBeforeReload,lifecycleDelta,writeTimeline:reloadTimeline});
  fs.writeFileSync(path.join(outDir,'reload-write-timeline.json'),JSON.stringify({beforeRevision:persistedBeforeReload,afterRevision:afterReload.state.stateRevision,lifecycleDelta,writes:reloadTimeline},null,2)+'\n');

  assert.notEqual(afterReload.session.sessionId,sessionBefore);
  assert(afterReload.state.stateRevision>=persistedBeforeReload,'reload lost a persisted state revision');
  assert(reloadTimeline.length>0,'reload bootstrap produced no persistence evidence');
  assert(reloadTimeline.every(w=>w.semanticChanged===false),`new-page bootstrap fabricated a semantic revision: ${JSON.stringify(reloadTimeline)}`);
  assert(reloadTimeline.every(w=>w.stateRevision===afterReload.state.stateRevision),`bootstrap writes disagree on persisted revision: ${JSON.stringify(reloadTimeline)}`);
  assert(reloadTimeline.every(w=>w.priorRevision===afterReload.state.stateRevision),`new-page bootstrap advanced the unload persistence boundary: ${JSON.stringify(reloadTimeline)}`);

  const text=await page.evaluate(()=>frontierDiagnosticsText());
  for(const marker of ['FrontierOS Diagnostics','Build','Session','State rev','Device','Viewport','Route'])assert(text.includes(marker),`diagnostics text missing ${marker}`);
  await context.close();
}

{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  await page.addInitScript(()=>{
    const legacy={version:3,company:'Legacy Lab',prefix:'OLD',day:7,cashM:2.4,compute:18000,reputation:0,research:0,infra:1,employees:5,role:'Full-Stack Frontier Engineer',tech:[],models:[],activeRun:null,runHistory:[],selectedIncident:null,incidentTab:'metrics',knowledge:{},feed:[],started:false};
    localStorage.setItem('frontier-lab-v3',JSON.stringify(legacy));
  });
  await page.goto(url,{waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>state.company),'Legacy Lab');
  const before=await page.evaluate(()=>frontierDiagnostics());
  assert.equal(before.state.saveFormatVersion,3);
  await page.evaluate(()=>save());
  const normalized=await page.evaluate(()=>frontierDiagnostics());
  await page.evaluate(()=>save());
  const noop=await page.evaluate(()=>frontierDiagnostics());
  assert.equal(noop.state.stateRevision,normalized.state.stateRevision);
  await page.evaluate(()=>{state.day+=1;save()});
  const migrated=await page.evaluate(()=>frontierDiagnostics());
  evidence.push({case:'legacy-save-migrated',diagnostics:migrated});
  assert.equal(migrated.state.stateRevision,normalized.state.stateRevision+1);
  await context.close();
}

for(const device of [
  {name:'phone portrait',viewport:{width:390,height:844},mode:'phone-portrait'},
  {name:'phone landscape',viewport:{width:844,height:390},mode:'phone-landscape'},
  {name:'tablet',viewport:{width:834,height:1112},mode:'tablet'},
  {name:'wide desktop',viewport:{width:1920,height:1080},mode:'wide-desktop'}
]){
  const context=await browser.newContext({viewport:device.viewport,isMobile:device.mode.startsWith('phone'),hasTouch:device.mode.startsWith('phone')});
  const page=await context.newPage();
  await page.goto(url,{waitUntil:'networkidle'});
  const diag=await page.evaluate(()=>frontierDiagnostics());
  evidence.push({case:device.mode,diagnostics:diag});
  assert.equal(diag.device.mode,device.mode);
  assert.equal(diag.device.viewport.width,device.viewport.width);
  assert.equal(diag.device.viewport.height,device.viewport.height);
  await context.close();
}

await browser.close();
const desktopMutation=evidence.find(x=>x.case==='desktop-state-mutation')?.diagnostics;
const reloadEvidence=evidence.find(x=>x.case==='desktop-reload');
const report={version:1,item:'P5.0.1',status:'pass',generatedAt:new Date().toISOString(),cases:evidence.length,evidence};
fs.writeFileSync(path.join(outDir,'report.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'REPORT.md'),`# P5.0.1 runtime identity\n\n- Status: **PASS**\n- Evidence cases: **${evidence.length}**\n- Build: \`${evidence[0]?.diagnostics?.build?.buildId||'unknown'}\`\n- Verified semantic revision: **${desktopMutation?.state?.stateRevision??'unknown'}**\n- Reload lifecycle delta: **${reloadEvidence?.lifecycleDelta??'unknown'}**\n- New-page bootstrap semantic writes: **0**\n- Canonical modes: phone portrait, phone landscape, tablet, desktop, wide desktop\n`);
console.log('P5.0.1 state/build/session identity regression passed');
