import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const budgets=JSON.parse(fs.readFileSync('release-budgets.json','utf8'));
const B=budgets.browser;
const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await ctx.newPage();
const errors=[];
const failed=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('requestfailed',r=>failed.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText||'failed'}`));

const wallStart=Date.now();
await page.goto(url,{waitUntil:'networkidle',timeout:B.maxInitialLoadMs});
const wallLoad=Date.now()-wallStart;
assert(await page.locator('#app').isVisible(),'release candidate app root is not visible');
assert(await page.locator('.replay-founder').isVisible(),'fresh RC should expose Item 11 run configuration');

const startup=await page.evaluate(()=>{
  const nav=performance.getEntriesByType('navigation')[0];
  const resources=performance.getEntriesByType('resource');
  return {
    navigationMs:nav?.duration||0,
    transferBytes:(nav?.transferSize||0)+resources.reduce((n,r)=>n+(r.transferSize||0),0),
    resourceCount:resources.length,
    domNodes:document.getElementsByTagName('*').length,
    serviceWorker:'serviceWorker' in navigator
  };
});
assert(wallLoad<=B.maxInitialLoadMs,`initial wall load ${wallLoad}ms exceeds ${B.maxInitialLoadMs}ms budget`);
assert(startup.navigationMs<=B.maxInitialLoadMs,`navigation ${startup.navigationMs.toFixed(0)}ms exceeds ${B.maxInitialLoadMs}ms budget`);
assert(startup.transferBytes<=B.maxInitialTransferBytes,`initial transfer ${startup.transferBytes}B exceeds ${B.maxInitialTransferBytes}B budget`);
assert(startup.domNodes<=B.maxDomNodes,`founder DOM ${startup.domNodes} nodes exceeds ${B.maxDomNodes} budget`);
assert(startup.serviceWorker,'release candidate browser must support PWA service workers');
assert.equal(failed.length,0,`initial load had failed requests: ${failed.join(' | ')}`);

await page.getByRole('button',{name:/found the lab/i}).click();
await page.waitForTimeout(120);
for(let i=0;i<10&&await page.locator('.story-overlay').count();i++){
  const next=page.locator('.story-overlay button.primary');
  if(!(await next.count()))break;
  await next.click();await page.waitForTimeout(30);
}
assert(await page.locator('.game-shell').isVisible(),'game shell did not render after founding');

// Render-chain regression: historically navigation could mutate state and then crash during repaint.
// Churn the shared render wrapper and verify singleton UI layers do not accumulate.
const renderLoop=await page.evaluate(iterations=>{
  const start=performance.now();
  for(let i=0;i<iterations;i++)render();
  return performance.now()-start;
},B.renderIterations);
await page.waitForTimeout(180);
assert(renderLoop<=B.maxRenderLoopMs,`${B.renderIterations} synchronous renders took ${renderLoop.toFixed(1)}ms; budget ${B.maxRenderLoopMs}ms`);
const postRender=await page.evaluate(()=>({
  domNodes:document.getElementsByTagName('*').length,
  campaign:document.querySelectorAll('.campaign-progress').length,
  tempo:document.querySelectorAll('.balance-tempo').length,
  replay:document.querySelectorAll('.replay-hud').length,
  realism:document.querySelectorAll('.realism-launch').length,
  nav:document.querySelectorAll('.gameplay-bottom-nav').length
}));
assert(postRender.domNodes<=B.maxDomNodes,`game DOM ${postRender.domNodes} nodes exceeds ${B.maxDomNodes} budget after render churn`);
for(const [name,count] of Object.entries(postRender).filter(([k])=>k!=='domNodes'))assert.equal(count,1,`${name} singleton duplicated or disappeared after render churn: ${count}`);

// Save migration: simulate a company created before Items 7/9/10/11 and verify modern layers
// reconstruct state without replacing company identity or resetting progress.
await page.evaluate(()=>{
  state.company='RC Migration Sentinel';
  state.day=17;
  state.research=4;
  delete state.campaign;
  delete state.balancePacing;
  delete state.realismAudit;
  delete state.replay;
  save();
});
await page.reload({waitUntil:'networkidle',timeout:B.maxInitialLoadMs});
await page.waitForTimeout(120);
const migrated=await page.evaluate(()=>({
  company:state.company,day:state.day,research:state.research,
  campaign:!!state.campaign,balance:!!state.balancePacing,realism:!!state.realismAudit,
  replay:state.replay?{difficulty:state.replay.difficulty,archetype:state.replay.archetype,challenge:state.replay.challenge,migrated:state.replay.migrated}:null
}));
assert.equal(migrated.company,'RC Migration Sentinel','save migration changed company identity');
assert.equal(migrated.day,17,'save migration reset simulated day');
assert.equal(migrated.research,4,'save migration reset technical progress');
assert(migrated.campaign&&migrated.balance&&migrated.realism&&migrated.replay,'modern state layers were not reconstructed');
assert.equal(migrated.replay.difficulty,'standard','legacy save should migrate to Standard');
assert.equal(migrated.replay.archetype,'legacy','legacy save should not receive a fresh-run archetype modifier');
assert.equal(migrated.replay.challenge,'legacy','legacy save should receive the untimed compatibility challenge');
assert.equal(migrated.replay.migrated,true,'legacy replay state should be marked migrated');

// PWA release gate: install/cache on localhost, reload under service-worker control, then prove
// the already-started company can cold-reload with the browser network disabled.
const registration=await page.evaluate(async()=>{
  const r=await navigator.serviceWorker.ready;
  return {scope:r.scope,active:!!r.active};
});
assert(registration.active,'service worker never reached active state');
if(!(await page.evaluate(()=>!!navigator.serviceWorker.controller))){
  await page.reload({waitUntil:'networkidle',timeout:B.maxInitialLoadMs});
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:B.maxInitialLoadMs});
}
assert(await page.evaluate(()=>!!navigator.serviceWorker.controller),'page is not controlled by the service worker');

await ctx.setOffline(true);
const offlineStart=Date.now();
await page.reload({waitUntil:'domcontentloaded',timeout:B.offlineReloadMs});
await page.waitForTimeout(150);
const offlineMs=Date.now()-offlineStart;
assert(offlineMs<=B.offlineReloadMs,`offline reload ${offlineMs}ms exceeds ${B.offlineReloadMs}ms budget`);
assert(await page.locator('#app').isVisible(),'offline PWA reload lost app root');
const offlineState=await page.evaluate(()=>({company:state.company,started:state.started,controlled:!!navigator.serviceWorker.controller}));
assert.equal(offlineState.company,'RC Migration Sentinel','offline PWA reload lost saved company');
assert.equal(offlineState.started,true,'offline PWA reload reset the company');
assert.equal(offlineState.controlled,true,'offline PWA reload escaped service-worker control');
await ctx.setOffline(false);

assert.equal(errors.length,0,`release candidate runtime errors: ${errors.join(' | ')}`);
await ctx.close();
await browser.close();
console.log(JSON.stringify({
  releaseCandidate:'pass',wallLoadMs:wallLoad,navigationMs:Math.round(startup.navigationMs),
  initialTransferBytes:startup.transferBytes,initialResources:startup.resourceCount,
  founderDomNodes:startup.domNodes,gameDomNodes:postRender.domNodes,
  renderLoopMs:Number(renderLoop.toFixed(1)),offlineReloadMs:offlineMs,budgetVersion:budgets.version
},null,2));
