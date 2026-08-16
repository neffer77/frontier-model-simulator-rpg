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

// Desktop: identity exists before gameplay, revisions monotonically increase,
// and reload creates a fresh runtime session without resetting simulation state.
{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  await page.goto(url,{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'networkidle'});

  const initial=await page.evaluate(()=>frontierDiagnostics());
  evidence.push({case:'desktop-initial',diagnostics:initial});
  assert.equal(initial.schemaVersion,1,'identity schema must be 1');
  assert(initial.build.buildId,'build identity missing');
  if(initial.build.buildId!=='local'){
    assert.match(initial.build.buildId,/^[a-f0-9]{12}$/i,'generated build id must be a 12-character Git SHA');
    assert(initial.build.gitSha?.startsWith(initial.build.buildId),'generated build id must match full Git SHA');
    assert(initial.build.builtAt,'generated build timestamp missing');
  }
  assert.match(initial.session.sessionId,/^sess_/,'session id missing');
  assert.equal(initial.state.stateRevision,0,'fresh unsaved state should begin at revision 0');
  assert.equal(initial.device.mode,'desktop','desktop device classification drifted');
  assert.equal(initial.route,'founder/setup','fresh route should be founder/setup');

  await page.evaluate(()=>save());
  const first=await page.evaluate(()=>frontierDiagnostics());
  await page.evaluate(()=>save());
  const second=await page.evaluate(()=>frontierDiagnostics());
  evidence.push({case:'desktop-second-save',diagnostics:second});
  assert.equal(first.state.stateRevision,1,'first save must create revision 1');
  assert.equal(second.state.stateRevision,2,'second save must create revision 2');
  assert(second.state.lastMutationAt,'last mutation timestamp missing');

  const sessionBefore=second.session.sessionId;
  await page.reload({waitUntil:'networkidle'});
  const afterReload=await page.evaluate(()=>frontierDiagnostics());
  evidence.push({case:'desktop-reload',diagnostics:afterReload});
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
  evidence.push({case:'legacy-save-migrated',diagnostics:migrated});
  assert.equal(migrated.state.stateRevision,1,'legacy save must acquire revision metadata on first ordinary save');
  assert.equal(migrated.state.saveFormatVersion,3,'legacy save format identity drifted');
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
  assert.equal(diag.device.mode,device.mode,`${device.name} classification drifted`);
  assert.equal(diag.device.viewport.width,device.viewport.width,`${device.name} viewport width missing`);
  assert.equal(diag.device.viewport.height,device.viewport.height,`${device.name} viewport height missing`);
  await context.close();
}

await browser.close();
const report={version:1,item:'P5.0.1',status:'pass',generatedAt:new Date().toISOString(),cases:evidence.length,evidence};
fs.writeFileSync(path.join(outDir,'report.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'REPORT.md'),`# P5.0.1 runtime identity\n\n- Status: **PASS**\n- Evidence cases: **${evidence.length}**\n- Build: \`${evidence[0]?.diagnostics?.build?.buildId||'unknown'}\`\n- Revision after two saves: **${evidence.find(x=>x.case==='desktop-second-save')?.diagnostics?.state?.stateRevision??'unknown'}**\n- Canonical modes: phone portrait, phone landscape, tablet, desktop, wide desktop\n`);
console.log('P5.0.1 state/build/session identity regression passed');
