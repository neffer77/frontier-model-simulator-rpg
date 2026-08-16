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

// Desktop: identity exists before gameplay, no-op saves do not fabricate revisions,
// real state mutations advance exactly once, and reload creates a fresh session.
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
  assert(Number.isInteger(initial.state.stateRevision)&&initial.state.stateRevision>=0,'state revision missing');
  assert.equal(initial.device.mode,'desktop','desktop device classification drifted');
  assert.equal(initial.route,'founder/setup','fresh route should be founder/setup');

  const baselineRevision=initial.state.stateRevision;
  await page.evaluate(()=>save());
  const noop=await page.evaluate(()=>frontierDiagnostics());
  assert.equal(noop.state.stateRevision,baselineRevision,'no-op save must not create a state revision');

  await page.evaluate(()=>{state.day+=1;save()});
  const mutated=await page.evaluate(()=>frontierDiagnostics());
  evidence.push({case:'desktop-state-mutation',diagnostics:mutated});
  assert.equal(mutated.state.stateRevision,baselineRevision+1,'one state change must advance exactly one revision');
  assert(mutated.state.lastMutationAt,'last mutation timestamp missing');

  await page.evaluate(()=>save());
  const secondNoop=await page.evaluate(()=>frontierDiagnostics());
  assert.equal(secondNoop.state.stateRevision,mutated.state.stateRevision,'second no-op save fabricated a revision');

  const sessionBefore=mutated.session.sessionId;
  await page.reload({waitUntil:'networkidle'});
  const afterReload=await page.evaluate(()=>frontierDiagnostics());
  evidence.push({case:'desktop-reload',diagnostics:afterReload});
  assert.notEqual(afterReload.session.sessionId,sessionBefore,'reload must create a new runtime session');
  assert.equal(afterReload.state.stateRevision,mutated.state.stateRevision,'state revision must survive reload');

  const text=await page.evaluate(()=>frontierDiagnosticsText());
  for(const marker of ['FrontierOS Diagnostics','Build','Session','State rev','Device','Viewport','Route'])assert(text.includes(marker),`diagnostics text missing ${marker}`);
  await context.close();
}

// True pre-P5 save: install raw localStorage before any application script executes.
// Existing modules may legitimately migrate/add fields during startup; the contract
// here is that the old save loads and then participates in monotonic revisions.
{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  await page.addInitScript(()=>{
    const legacy={version:3,company:'Legacy Lab',prefix:'OLD',day:7,cashM:2.4,compute:18000,reputation:0,research:0,infra:1,employees:5,role:'Full-Stack Frontier Engineer',tech:[],models:[],activeRun:null,runHistory:[],selectedIncident:null,incidentTab:'metrics',knowledge:{},feed:[],started:false};
    localStorage.setItem('frontier-lab-v3',JSON.stringify(legacy));
  });
  await page.goto(url,{waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>state.company),'Legacy Lab','legacy v3 save stopped loading');
  const before=await page.evaluate(()=>frontierDiagnostics());
  assert.equal(before.state.saveFormatVersion,3,'legacy save format identity drifted');
  await page.evaluate(()=>save());
  const noop=await page.evaluate(()=>frontierDiagnostics());
  assert.equal(noop.state.stateRevision,before.state.stateRevision,'legacy no-op save fabricated a revision');
  await page.evaluate(()=>{state.day+=1;save()});
  const migrated=await page.evaluate(()=>frontierDiagnostics());
  evidence.push({case:'legacy-save-migrated',diagnostics:migrated});
  assert.equal(migrated.state.stateRevision,before.state.stateRevision+1,'legacy state mutation did not advance revision');
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
const desktopMutation=evidence.find(x=>x.case==='desktop-state-mutation')?.diagnostics;
const report={version:1,item:'P5.0.1',status:'pass',generatedAt:new Date().toISOString(),cases:evidence.length,evidence};
fs.writeFileSync(path.join(outDir,'report.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'REPORT.md'),`# P5.0.1 runtime identity\n\n- Status: **PASS**\n- Evidence cases: **${evidence.length}**\n- Build: \`${evidence[0]?.diagnostics?.build?.buildId||'unknown'}\`\n- Verified semantic revision: **${desktopMutation?.state?.stateRevision??'unknown'}**\n- Canonical modes: phone portrait, phone landscape, tablet, desktop, wide desktop\n`);
console.log('P5.0.1 state/build/session identity regression passed');
