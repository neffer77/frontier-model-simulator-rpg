import fs from 'node:fs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const inventory=JSON.parse(fs.readFileSync('visual-qa/inventory.json','utf8'));
const matrix=JSON.parse(fs.readFileSync('visual-qa/responsive-matrix.json','utf8'));
const devices=matrix.viewports.map(v=>({name:v.name,mode:v.id,viewport:{width:v.width,height:v.height},isMobile:v.isMobile,hasTouch:v.hasTouch,expect:v.expect}));
async function settle(page,ms=45){await page.waitForTimeout(ms);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
async function sync(page){await page.evaluate(()=>{window.frontierPageSweepSync?.();window.frontierResponsiveSync?.();window.frontierAccessibilitySync?.();window.frontierOverlaySync?.()});await settle(page,25)}
async function dismissStory(page){for(let i=0;i<10;i++){const overlay=page.locator('.story-overlay');if(!(await overlay.count()))break;const button=overlay.locator('button').last();if(!(await button.count()))break;await button.click();await settle(page,25)}}
async function graduate(page){await page.evaluate(()=>{state.campaign||={version:1};state.campaign.graduated=true;state.campaign.companyPriority=state.campaign.companyPriority||'research';state.campaign.modelReviewed=true;save();render()});await settle(page,70);await sync(page)}
async function goHome(page){await page.evaluate(()=>window.gameplayGoHome?.());await settle(page,50);await dismissStory(page);await sync(page)}
async function availableEntrypoint(page,names){return page.evaluate(xs=>xs.find(name=>typeof window[name]==='function'&&window[name].length===0)||null,names)}
async function invoke(page,name){return page.evaluate(fn=>{try{window[fn]();return {ok:true}}catch(error){return {ok:false,error:String(error?.stack||error)}}},name)}
async function columns(page,selector){return page.locator(selector).first().evaluate(el=>{const value=getComputedStyle(el).gridTemplateColumns.trim();if(!value||value==='none')return 0;return value.split(/\s+/).filter(Boolean).length})}
async function assertBounds(page,locator,d,label){
  assert(await locator.count(),`${d.name}/${label}: surface missing`);
  const r=await locator.first().evaluate(el=>{const x=el.getBoundingClientRect();return {left:x.left,right:x.right,top:x.top,bottom:x.bottom,width:x.width,height:x.height}});
  assert(r.left>=-3&&r.right<=d.viewport.width+3,`${d.name}/${label}: horizontal viewport escape ${JSON.stringify(r)}`);
  assert(r.top>=-3&&r.bottom<=d.viewport.height+3,`${d.name}/${label}: vertical viewport escape ${JSON.stringify(r)}`);
  return r;
}
async function assertContainment(page,d,label){
  const audit=await page.evaluate(()=>window.frontierResponsiveAudit?.());assert(audit,`${d.name}/${label}: responsive audit unavailable`);
  assert.equal(audit.mode,d.mode,`${d.name}/${label}: runtime mode ${audit.mode}`);
  assert(audit.overflow<=6,`${d.name}/${label}: document overflow ${audit.overflow}px; offenders=${JSON.stringify(audit.offenders.slice(0,5))}`);
  if(audit.nav){assert(audit.nav.left>=-3&&audit.nav.right<=d.viewport.width+3,`${d.name}/${label}: bottom nav horizontal overflow ${JSON.stringify(audit.nav)}`);assert(audit.nav.bottom<=d.viewport.height+3,`${d.name}/${label}: bottom nav below viewport ${JSON.stringify(audit.nav)}`)}
  const shell=page.locator('#app .fl-page-shell').first();if(await shell.count()){const r=await shell.evaluate(el=>el.getBoundingClientRect());assert(r.width<=d.viewport.width+3,`${d.name}/${label}: page shell ${r.width}px wider than viewport`)}
  const wrappers=page.locator('.fl-responsive-table-wrap');for(let i=0;i<await wrappers.count();i++){const r=await wrappers.nth(i).evaluate(el=>el.getBoundingClientRect());assert(r.left>=-4&&r.right<=d.viewport.width+4,`${d.name}/${label}: table wrapper escapes viewport ${JSON.stringify(r)}`)}
  return audit;
}

const browser=await chromium.launch({headless:true});
for(const d of devices){
  const ctx=await browser.newContext({viewport:d.viewport,isMobile:d.isMobile,hasTouch:d.hasTouch});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e)));
  await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});await settle(page,70);await sync(page);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.flResponsiveSweep),'1',`${d.name}: responsive runtime missing`);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.flResponsiveMode),d.mode,`${d.name}: wrong initial responsive mode`);
  const registry=await page.evaluate(()=>window.frontierResponsiveRegistry?.()||[]);assert.deepEqual(registry.map(x=>x.id),devices.map(x=>x.mode),`${d.name}: responsive registry drifted`);

  const founder=page.getByRole('button',{name:/found the lab/i});assert.equal(await founder.count(),1,`${d.name}: founder CTA missing`);await founder.click();await settle(page,100);await sync(page);
  await assertBounds(page,page.locator('[data-fl-overlay-panel="story"]'),d,'intro story');
  await dismissStory(page);await graduate(page);await goHome(page);

  assert.equal(await columns(page,'.company-system-groups'),d.expect.companyGroups,`${d.name}: Company system group columns drifted`);
  assert.equal(await columns(page,'.resource-strip'),d.expect.resourceColumns,`${d.name}: resource strip columns drifted`);
  assert.equal(await columns(page,'.world-grid'),d.expect.worldColumns,`${d.name}: world-grid columns drifted`);
  assert.equal(await columns(page,'.gameplay-bottom-nav'),d.expect.bottomNavColumns,`${d.name}: bottom navigation destinations drifted`);
  await assertBounds(page,page.locator('.gameplay-bottom-nav'),d,'bottom navigation');await assertContainment(page,d,'company home');

  await page.evaluate(()=>gameplayToggleMenu());await settle(page,60);await sync(page);await assertBounds(page,page.locator('[data-fl-overlay-panel="more"]'),d,'More sheet');await page.keyboard.press('Escape');await settle(page,40);await sync(page);
  await page.evaluate(()=>showExplain('FSDP'));await settle(page,55);await sync(page);await assertBounds(page,page.locator('[data-fl-overlay-panel="modal"]'),d,'technical explainer');await page.keyboard.press('Escape');await settle(page,40);await sync(page);
  await page.evaluate(()=>{state.story.seen=[...(state.story?.seen||[]).filter(x=>x!=='firstIncident'),'firstIncident'];state.story.active=null;state.selectedIncident='nan';save();render()});await settle(page,80);await sync(page);await assertBounds(page,page.locator('[data-fl-overlay-panel="incident"]'),d,'incident');await page.evaluate(()=>{state.selectedIncident=null;save();render()});await settle(page,55);await sync(page);

  // A deliberately wider-than-any-viewport table must scroll locally without expanding the document.
  await page.evaluate(()=>{const fixture=document.createElement('section');fixture.id='responsive-table-fixture';fixture.innerHTML='<table style="min-width:2200px"><caption>Capacity comparison</caption><thead><tr><th>System</th><th>Capacity</th></tr></thead><tbody><tr><td>Training</td><td>2200</td></tr></tbody></table>';document.getElementById('app').appendChild(fixture)});await settle(page,55);await sync(page);
  const tableWrap=page.locator('#responsive-table-fixture .fl-responsive-table-wrap');assert.equal(await tableWrap.count(),1,`${d.name}: wide table was not contained`);assert.equal(await tableWrap.getAttribute('data-fl-responsive-scrollable'),'true',`${d.name}: wide table not detected as scrollable`);assert.equal(await tableWrap.getAttribute('role'),'region',`${d.name}: scrollable table region semantics missing`);assert(/horizontally scrollable/i.test(await tableWrap.getAttribute('aria-label')||''),`${d.name}: scrollable table label missing`);await assertContainment(page,d,'wide table fixture');await page.evaluate(()=>document.getElementById('responsive-table-fixture')?.remove());await settle(page,35);

  let tested=0;
  for(const screen of inventory.screens){
    await goHome(page);const entry=await availableEntrypoint(page,screen.entrypoints||[]);assert(entry,`${d.name}/${screen.id}: no zero-argument entrypoint`);
    const before=errors.length,result=await invoke(page,entry);assert(result.ok,`${d.name}/${screen.id}: ${entry} threw ${result.error||''}`);await settle(page,50);await dismissStory(page);await sync(page);
    const pageId=await page.evaluate(()=>document.getElementById('app')?.dataset.flPageId||null);assert.equal(pageId,screen.id,`${d.name}/${screen.id}: page sweep tagged ${pageId}`);
    await assertContainment(page,d,screen.id);
    const newErrors=errors.slice(before);assert.equal(newErrors.length,0,`${d.name}/${screen.id}: runtime errors ${newErrors.join(' | ')}`);tested++;
  }
  assert.equal(tested,inventory.screens.length,`${d.name}: incomplete responsive page sweep`);
  assert.equal(errors.length,0,`${d.name}: runtime errors: ${errors.join(' | ')}`);await ctx.close();
}

// Live viewport transition: resizing in-place must update mode and table scroll-region semantics without reload.
{
  const ctx=await browser.newContext({viewport:{width:1440,height:1000}});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e)));
  await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});await settle(page,70);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.flResponsiveMode),'desktop','resize lifecycle should begin on desktop');
  await page.evaluate(()=>{const fixture=document.createElement('section');fixture.id='responsive-resize-fixture';fixture.innerHTML='<table style="min-width:720px"><caption>Resize lifecycle</caption><tr><th>Metric</th><td>Value</td></tr></table>';document.getElementById('app').appendChild(fixture)});await settle(page,80);
  const wrap=page.locator('#responsive-resize-fixture .fl-responsive-table-wrap');assert.equal(await wrap.count(),1,'resize lifecycle table was not wrapped');assert.notEqual(await wrap.getAttribute('role'),'region','desktop-sized table should not add a scroll-region tab stop');

  await page.setViewportSize({width:390,height:844});await settle(page,120);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.flResponsiveMode),'phone-portrait','resize listener did not switch to phone portrait');assert.equal(await wrap.getAttribute('data-fl-responsive-scrollable'),'true','table did not become locally scrollable after shrink');assert.equal(await wrap.getAttribute('role'),'region','shrunken table did not gain scroll-region semantics');

  await page.setViewportSize({width:1440,height:1000});await settle(page,120);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.flResponsiveMode),'desktop','resize listener did not return to desktop');assert.equal(await wrap.getAttribute('data-fl-responsive-scrollable'),'false','table remained marked scrollable after expansion');assert.notEqual(await wrap.getAttribute('role'),'region','table retained unnecessary scroll-region semantics after expansion');assert.equal(await wrap.getAttribute('tabindex'),null,'table retained unnecessary tab stop after expansion');
  assert.equal(errors.length,0,`resize lifecycle runtime errors: ${errors.join(' | ')}`);await ctx.close();
}

await browser.close();
console.log(`Responsive visual sweep passed for ${inventory.screens.length} screens across ${devices.length} canonical viewports plus live resize lifecycle`);
