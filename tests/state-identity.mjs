import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});

// Desktop: identity exists before gameplay, revisions monotonically increase,
// and reload creates a fresh runtime session without resetting simulation state.
{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  await page.goto(url,{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'networkidle'});

  const initial=await page.evaluate(()=>frontierDiagnostics());
  assert.equal(initial.schemaVersion,1,'identity schema must be 1');
  assert.equal(initial.build.buildId,'local','source server should use local build fallback');
  assert.match(initial.session.sessionId,/^sess_/,'session id missing');
  assert.equal(initial.state.stateRevision,0,'fresh unsaved state should begin at revision 0');
  assert.equal(initial.device.mode,'desktop','desktop device classification drifted');
  assert.equal(initial.route,'founder/setup','fresh route should be founder/setup');

  await page.evaluate(()=>save());
  const first=await page.evaluate(()=>frontierDiagnostics());
  await page.evaluate(()=>save());
  const second=await page.evaluate(()=>frontierDiagnostics());
  assert.equal(first.state.stateRevision,1,'first save must create revision 1');
  assert.equal(second.state.stateRevision,2,'second save must create revision 2');
  assert(second.state.lastMutationAt,'last mutation timestamp missing');

  const sessionBefore=second.session.sessionId;
  await page.reload({waitUntil:'networkidle'});
  const afterReload=await page.evaluate(()=>frontierDiagnostics());
  assert.notEqual(afterReload.session.sessionId,sessionBefore,'reload must create a new runtime session');
  assert.equal(afterReload.state.stateRevision,2,'state revision must survive reload');

  const text=await page.evaluate(()=>frontierDiagnosticsText());
  for(const marker of ['FrontierOS Diagnostics','Build','Session','State rev','Device','Viewport','Route'])assert(text.includes(marker),`diagnostics text missing ${marker}`);
  await context.close();
}

// True pre-P5 save: install raw localStorage before any application script (and
// therefore before the Storage.setItem instrumentation) executes.
{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  await page.addInitScript(()=>{
    const legacy={version:3,company:'Legacy Lab',prefix:'OLD',day:7,cashM:2.4,compute:18000,reputation:0,research:0,infra:1,employees:5,role:'Full-Stack Frontier Engineer',tech:[],models:[],activeRun:null,runHistory:[],selectedIncident:null,incidentTab:'metrics',knowledge:{},feed:[],started:false};
    localStorage.setItem('frontier-lab-v3',JSON.stringify(legacy));
  });
  await page.goto(url,{waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>state.company),'Legacy Lab','legacy v3 save stopped loading');
  assert.equal((await page.evaluate(()=>frontierDiagnostics())).state.stateRevision,0,'legacy save should begin without fabricated history');
  await page.evaluate(()=>save());
  const migrated=await page.evaluate(()=>frontierDiagnostics());
  assert.equal(migrated.state.stateRevision,1,'legacy save must acquire revision metadata on first ordinary save');
  assert.equal(migrated.state.saveFormatVersion,3,'legacy save format identity drifted');
  await context.close();
}

// Mobile classification is part of the canonical identity payload.
{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  await page.goto(url,{waitUntil:'networkidle'});
  const diag=await page.evaluate(()=>frontierDiagnostics());
  assert.equal(diag.device.mode,'phone-portrait','phone portrait classification drifted');
  assert.equal(diag.device.viewport.width,390,'phone viewport width missing from diagnostics');
  assert.equal(diag.device.viewport.height,844,'phone viewport height missing from diagnostics');
  await context.close();
}

await browser.close();
console.log('P5.0.1 state/build/session identity regression passed');
