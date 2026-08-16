import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const devices=[
  {name:'desktop',viewport:{width:1440,height:1000},isMobile:false,hasTouch:false},
  {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];
async function settle(page,ms=80){await page.waitForTimeout(ms);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
async function sync(page){await page.evaluate(()=>window.frontierOverlaySync?.());await settle(page,25)}
async function found(page){
  await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.flOverlaySystem),'1','overlay runtime missing');
  const founder=page.getByRole('button',{name:/found the lab/i});assert(await founder.count(),'founder CTA missing');await founder.click();await settle(page,120);await sync(page);
}
async function assertOverlay(page,d,type){
  const host=page.locator(`[data-fl-overlay-type="${type}"]:visible`);
  assert.equal(await host.count(),1,`${d.name}/${type}: expected one visible overlay`);
  const panel=host.locator(`[data-fl-overlay-panel="${type}"]`);assert.equal(await panel.count(),1,`${d.name}/${type}: panel missing`);
  assert.equal(await panel.getAttribute('role'),'dialog',`${d.name}/${type}: dialog role missing`);
  assert.equal(await panel.getAttribute('aria-modal'),'true',`${d.name}/${type}: aria-modal missing`);
  assert.equal(await page.evaluate(()=>document.body.classList.contains('fl-overlay-open')),true,`${d.name}/${type}: body scroll lock missing`);
  const visual=await panel.evaluate(el=>{const r=el.getBoundingClientRect(),cs=getComputedStyle(el),m=cs.backgroundColor.match(/rgba?\(([^)]+)\)/),v=m?m[1].split(',').map(Number):[0,0,0];return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,bg:cs.backgroundColor,lum:(.2126*(v[0]||0)+.7152*(v[1]||0)+.0722*(v[2]||0))/255}});
  assert(visual.left>=-2&&visual.right<=d.viewport.width+2,`${d.name}/${type}: panel overflows horizontally ${JSON.stringify(visual)}`);
  assert(visual.top>=-2&&visual.bottom<=d.viewport.height+2,`${d.name}/${type}: panel overflows vertically ${JSON.stringify(visual)}`);
  assert(visual.lum<.68,`${d.name}/${type}: panel surface unexpectedly bright (${visual.bg})`);
  const top=await page.evaluate(()=>window.frontierOverlayTop?.());assert.equal(top?.type,type,`${d.name}/${type}: not reported as top overlay`);
  return {host,panel};
}

const browser=await chromium.launch({headless:true});
for(const d of devices){
  const ctx=await browser.newContext({viewport:d.viewport,isMobile:d.isMobile,hasTouch:d.hasTouch});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e)));
  await found(page);

  await assertOverlay(page,d,'story');
  const storyFocused=await page.evaluate(()=>document.querySelector('[data-fl-overlay-panel="story"]')?.contains(document.activeElement));assert(storyFocused,`${d.name}: initial story focus is outside dialog`);
  await page.keyboard.press('Escape');await settle(page,120);await sync(page);assert.equal(await page.locator('.story-overlay').count(),0,`${d.name}: Escape did not dismiss story`);
  assert.equal(await page.evaluate(()=>document.body.classList.contains('fl-overlay-open')),false,`${d.name}: scroll lock survived story dismissal`);

  const more=page.locator('.gameplay-bottom-nav button').filter({hasText:'More'});assert.equal(await more.count(),1,`${d.name}: More button missing`);await more.focus();await more.click();await settle(page,120);
  assert.equal((await page.evaluate(()=>window.frontierOverlayTop?.()))?.type,'more',`${d.name}: body-class observer did not register More sheet`);await assertOverlay(page,d,'more');
  await page.keyboard.press('Shift+Tab');assert(await page.evaluate(()=>document.querySelector('[data-fl-overlay-panel="more"]')?.contains(document.activeElement)),`${d.name}: Shift+Tab escaped More sheet`);
  await page.keyboard.press('Escape');await settle(page,120);assert.equal(await page.evaluate(()=>document.body.classList.contains('gameplay-menu-open')),false,`${d.name}: Escape did not close More sheet`);
  assert.equal(await page.evaluate(()=>window.frontierOverlayTop?.()),null,`${d.name}: More sheet remained in stack after class-driven close`);
  assert(/more/i.test(await page.evaluate(()=>document.activeElement?.textContent||'')),`${d.name}: focus was not restored to More control`);

  await page.evaluate(()=>campaignOpenPriority());await settle(page,80);await sync(page);await assertOverlay(page,d,'priority');
  await page.keyboard.press('Escape');await settle(page,80);await sync(page);assert.equal(await page.locator('.campaign-priority').count(),0,`${d.name}: priority decision did not dismiss`);

  await page.evaluate(()=>gameFeelMilestone('Regression milestone','Overlay contract check.'));await settle(page,60);await sync(page);await assertOverlay(page,d,'milestone');
  await page.keyboard.press('Escape');await settle(page,60);await sync(page);assert.equal(await page.locator('.feel-milestone').count(),0,`${d.name}: milestone did not dismiss`);
  await page.evaluate(()=>showExplain('FSDP'));await settle(page,60);await sync(page);await assertOverlay(page,d,'modal');
  await page.keyboard.press('Escape');await settle(page,60);await sync(page);assert.equal(await page.locator('.modal-back').count(),0,`${d.name}: technical explainer did not dismiss`);

  // Use the canonical incident opener so modern workstation state is materialized.
  await page.evaluate(()=>{state.story.seen=[...(state.story?.seen||[]).filter(x=>x!=='firstIncident'),'firstIncident'];state.story.active=null;openIncident('nan')});await settle(page,100);await sync(page);await assertOverlay(page,d,'incident');
  await page.keyboard.press('Escape');await settle(page,40);await sync(page);assert.equal(await page.locator('.incident-back').count(),1,`${d.name}: Escape incorrectly dismissed incident`);
  assert.equal((await page.evaluate(()=>window.frontierOverlayTop?.()))?.dismissible,false,`${d.name}: incident should report non-dismissible`);
  await page.evaluate(()=>{state.selectedIncident=null;state.workstation=null;save();render()});await settle(page,80);await sync(page);

  await page.evaluate(()=>{
    state.story.seen=(state.story?.seen||[]).filter(x=>x!=='firstIncident');
    state.story.active='firstIncident';state.story.index=0;state.story.objective={kicker:'FIRST INCIDENT',title:'Red on the Dashboard',body:'Diagnose before reacting.',cta:'Open training',action:'gameplayGoTrain',tone:'danger'};
    openIncident('nan');
  });
  await settle(page,100);await page.evaluate(()=>gameFeelMilestone('Something broke','Read the evidence before reacting.'));await settle(page,50);await page.evaluate(()=>showExplain('GRAD'));await settle(page,50);await sync(page);
  assert.equal((await page.evaluate(()=>window.frontierOverlayTop?.()))?.type,'modal',`${d.name}: technical explainer must top collision stack`);
  for(const type of ['story','milestone','incident'])assert.equal(await page.locator(`[data-fl-overlay-type="${type}"]`).getAttribute('aria-hidden'),'true',`${d.name}: ${type} was not suspended beneath modal`);

  await page.keyboard.press('Escape');await settle(page,80);await sync(page);assert.equal((await page.evaluate(()=>window.frontierOverlayTop?.()))?.type,'story',`${d.name}: story should resume after explainer closes`);
  assert.equal(await page.locator('[data-fl-overlay-type="story"]').getAttribute('aria-hidden'),null,`${d.name}: story remained aria-hidden after resume`);

  await page.keyboard.press('Escape');await settle(page,110);await sync(page);assert.equal((await page.evaluate(()=>window.frontierOverlayTop?.()))?.type,'milestone',`${d.name}: milestone should resume after story closes`);
  await page.keyboard.press('Escape');await settle(page,70);await sync(page);assert.equal((await page.evaluate(()=>window.frontierOverlayTop?.()))?.type,'incident',`${d.name}: incident should resume after milestone closes`);
  await page.keyboard.press('Escape');await settle(page,40);await sync(page);assert.equal((await page.evaluate(()=>window.frontierOverlayTop?.()))?.type,'incident',`${d.name}: incident escaped at end of stack`);
  await page.evaluate(()=>{state.selectedIncident=null;state.workstation=null;save();render()});await settle(page,80);await sync(page);
  assert.equal(await page.evaluate(()=>document.body.classList.contains('fl-overlay-open')),false,`${d.name}: scroll lock remained after stack cleared`);

  const registry=await page.evaluate(()=>window.frontierOverlayRegistry?.()||[]);assert.deepEqual(registry.map(x=>x.id),['more','priority','incident','milestone','story','modal'],`${d.name}: overlay registry order drifted`);
  assert.equal(errors.length,0,`${d.name}: runtime errors: ${errors.join(' | ')}`);await ctx.close();
}
await browser.close();
console.log('Modal / overlay / story regression passed on desktop + mobile');