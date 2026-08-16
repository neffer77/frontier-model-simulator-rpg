import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const base=process.env.TEST_URL||'http://127.0.0.1:4173/';
const outDir=path.resolve('artifacts/debug-bundle');
fs.rmSync(outDir,{recursive:true,force:true});
fs.mkdirSync(outDir,{recursive:true});

const browser=await chromium.launch({headless:true});
const pageErrors=[];
let bundle;

{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  const page=await context.newPage();
  page.on('pageerror',error=>pageErrors.push(String(error?.stack||error)));
  await page.goto(`${base}?token=URL_SECRET_SHOULD_NOT_LEAK#private-fragment`,{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'networkidle'});

  await page.evaluate(async()=>{
    frontierRegisterCommand('qa.debugMutation',(payload,ctx)=>{
      state.research+=2;
      state.__debugFixture={password:payload.password,apiKey:payload.apiKey,note:'safe-note'};
      ctx.emit('qa.debug.fixture',{password:payload.password,safe:'visible'});
      save();
      return {ok:true};
    },{source:'qa',description:'Debug bundle mutation fixture'});
    await frontierDispatchCommand('qa.debugMutation',{password:'STATE_PASSWORD_SECRET',apiKey:'API_KEY_SECRET'},{source:'qa-test'});
    const observed=document.createElement('button');observed.id='debug-bundle-click';observed.textContent='Debug bundle observed click';document.body.appendChild(observed);observed.click();observed.remove();
    frontierEmitEvent('runtime.error',{message:'Synthetic diagnostic error',token:'ERROR_TOKEN_SECRET'},{source:'qa',severity:'error'});
  });

  bundle=await page.evaluate(()=>frontierCreateDebugBundle({reason:'ci-regression'}));
  const serialized=JSON.stringify(bundle);
  assert.equal(bundle.schemaVersion,1,'debug bundle schema drifted');
  assert.equal(bundle.item,'P5.0.3','debug bundle item drifted');
  assert.match(bundle.bundleId,/^dbg_/,'debug bundle id missing');
  assert.match(bundle.identity?.session?.sessionId||'',/^sess_/,'bundle missing P5.0.1 session identity');
  assert(bundle.identity?.build?.buildId,'bundle missing build identity');
  assert(bundle.identity?.state?.stateRevision>0,'bundle missing state revision');
  assert.equal(bundle.environment.url,new URL(base).origin+new URL(base).pathname,'bundle URL must exclude query/hash');
  assert(bundle.commandEvent?.events?.length>0,'bundle missing P5.0.2 event history');
  assert(bundle.actionTrail?.some(event=>event.type==='command.started'),'bundle missing command trail');
  assert(bundle.actionTrail?.some(event=>event.type==='ui.click'),'bundle missing observed UI trail');
  assert(bundle.errors?.some(event=>event.data?.message==='Synthetic diagnostic error'),'bundle missing runtime error evidence');
  assert(bundle.reproduction?.steps?.some(step=>step.kind==='command'&&step.name==='qa.debugMutation'),'bundle missing command reproduction step');
  assert.equal(bundle.state?.__debugFixture?.password,'[REDACTED]','state password was not redacted');
  assert.equal(bundle.state?.__debugFixture?.apiKey,'[REDACTED]','state API key was not redacted');
  assert(!serialized.includes('STATE_PASSWORD_SECRET'),'state secret leaked into bundle');
  assert(!serialized.includes('API_KEY_SECRET'),'API key leaked into bundle');
  assert(!serialized.includes('ERROR_TOKEN_SECRET'),'event secret leaked into bundle');
  assert(!serialized.includes('URL_SECRET_SHOULD_NOT_LEAK'),'URL query leaked into bundle');
  assert(!serialized.includes('private-fragment'),'URL fragment leaked into bundle');
  assert(bundle.storage?.localStorage?.keys?.includes('frontier-lab-v3'),'storage inventory missing save key');
  assert('supported' in (bundle.serviceWorker||{}),'service-worker diagnostics missing');
  assert('supported' in (bundle.cacheStorage||{}),'cache diagnostics missing');
  assert(bundle.dom?.app?.exists,'DOM context missing app root');
  assert(bundle.performance?.resources?.count>=0,'performance context missing');

  await page.evaluate(async()=>{await frontierOpenDiagnostics();return true});
  await page.locator('.frontier-debug-panel').waitFor({state:'visible'});
  assert.equal(await page.locator('.frontier-debug-panel').getAttribute('role'),'dialog','diagnostics panel must be a dialog');
  assert(await page.getByText('FrontierOS Diagnostics').isVisible(),'diagnostics heading missing');
  assert(await page.getByRole('button',{name:'Download debug bundle'}).isVisible(),'diagnostics download control missing');
  await page.screenshot({path:path.join(outDir,'diagnostics-desktop.png'),fullPage:true});
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.frontier-debug-panel').count(),0,'Escape must close diagnostics');

  // The documented keyboard shortcut should open the same console.
  await page.keyboard.press(process.platform==='darwin'?'Meta+Shift+D':'Control+Shift+D');
  await page.locator('.frontier-debug-panel').waitFor({state:'visible'});
  await page.evaluate(()=>{frontierCloseDiagnostics();return true});

  await context.tracing.stop({path:path.join(outDir,'trace.zip')});
  await context.close();
}

// Mobile presentation is a release contract: diagnostics must remain usable in the
// canonical phone portrait viewport and must not produce horizontal overflow.
{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  page.on('pageerror',error=>pageErrors.push(String(error?.stack||error)));
  await page.goto(base,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{await frontierOpenDiagnostics();return true});
  await page.locator('.frontier-debug-panel').waitFor({state:'visible'});
  const layout=await page.locator('.frontier-debug-window').evaluate(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  assert(layout.left>=-1&&layout.right<=layout.viewport+1,'phone diagnostics escapes viewport');
  assert(layout.scrollWidth<=layout.viewport+1,'phone diagnostics introduces page-level horizontal overflow');
  await page.screenshot({path:path.join(outDir,'diagnostics-phone.png'),fullPage:true});
  await context.close();
}

await browser.close();
assert.equal(pageErrors.length,0,`runtime page errors: ${pageErrors.join(' | ')}`);

fs.writeFileSync(path.join(outDir,'bundle.json'),JSON.stringify(bundle,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'reproduction.json'),JSON.stringify(bundle.reproduction,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'page-errors.json'),JSON.stringify(pageErrors,null,2)+'\n');
const report={
  version:1,item:'P5.0.3',status:'pass',generatedAt:new Date().toISOString(),
  buildId:bundle.identity?.build?.buildId,sessionId:bundle.identity?.session?.sessionId,stateRevision:bundle.identity?.state?.stateRevision,
  route:bundle.identity?.route,device:bundle.identity?.device?.mode,eventCount:bundle.commandEvent?.events?.length||0,
  actionCount:bundle.actionTrail?.length||0,errorCount:bundle.errors?.length||0,reproductionSteps:bundle.reproduction?.steps?.length||0,
  evidence:['bundle.json','reproduction.json','page-errors.json','diagnostics-desktop.png','diagnostics-phone.png','trace.zip'],
  privacy:{stateSecretsRedacted:true,eventSecretsRedacted:true,urlQueryExcluded:true,urlFragmentExcluded:true,storageValuesExcluded:true}
};
fs.writeFileSync(path.join(outDir,'report.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'REPORT.md'),`# P5.0.3 Debug Bundle + Diagnostics\n\n- Status: **PASS**\n- Build: \`${report.buildId}\`\n- Session: \`${report.sessionId}\`\n- State revision: **${report.stateRevision}**\n- Events captured: **${report.eventCount}**\n- Action trail entries: **${report.actionCount}**\n- Reproduction steps: **${report.reproductionSteps}**\n- Runtime page errors: **0**\n- Secret redaction: **PASS**\n- URL query/fragment exclusion: **PASS**\n- Desktop diagnostics screenshot: **captured**\n- Phone diagnostics screenshot: **captured**\n- Playwright trace: **captured**\n`);
console.log('P5.0.3 debug bundle + diagnostics regression passed');
