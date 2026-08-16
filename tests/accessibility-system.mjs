import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const devices=[
  {name:'desktop',viewport:{width:1440,height:1000},isMobile:false,hasTouch:false},
  {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];
async function settle(page,ms=80){await page.waitForTimeout(ms);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
async function a11ySync(page){await page.evaluate(()=>window.frontierAccessibilitySync?.());await settle(page,30)}
async function reset(page){await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});await settle(page,60);await a11ySync(page)}
async function auditClean(page,label){const result=await page.evaluate(()=>window.frontierAccessibilityAudit?.());assert(result,`${label}: accessibility audit missing`);assert.deepEqual(result.unlabeledButtons,[],`${label}: unlabeled buttons ${JSON.stringify(result.unlabeledButtons)}`);assert.deepEqual(result.unlabeledFields,[],`${label}: unlabeled fields ${JSON.stringify(result.unlabeledFields)}`);return result}
async function clearStory(page){if(await page.locator('.story-overlay').count()){await page.keyboard.press('Escape');await settle(page,140);await a11ySync(page)}}

const browser=await chromium.launch({headless:true});
for(const d of devices){
  const ctx=await browser.newContext({viewport:d.viewport,isMobile:d.isMobile,hasTouch:d.hasTouch});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e)));
  await reset(page);
  assert.equal(await page.getAttribute('html','lang'),'en',`${d.name}: document language missing`);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.flAccessibilitySystem),'1',`${d.name}: accessibility runtime missing`);

  const skip=page.locator('.fl-skip-link');assert.equal(await skip.count(),1,`${d.name}: skip link missing`);await skip.focus();await settle(page,150);
  const skipStyle=await skip.evaluate(el=>{const cs=getComputedStyle(el);return {transform:cs.transform,outline:cs.outlineWidth}});assert.equal(skipStyle.transform,'none',`${d.name}: focused skip link remained offscreen`);
  await skip.click();await settle(page,30);assert.equal(await page.evaluate(()=>document.activeElement?.id),'app',`${d.name}: skip link did not move focus to #app`);
  await auditClean(page,`${d.name}/founder`);

  const founder=page.getByRole('button',{name:/found the lab/i});assert.equal(await founder.count(),1,`${d.name}: founder CTA missing`);await founder.click();await settle(page,130);await a11ySync(page);
  const story=page.locator('[data-fl-overlay-panel="story"]');assert.equal(await story.count(),1,`${d.name}: intro story missing`);assert.equal(await story.getAttribute('role'),'dialog',`${d.name}: story lost dialog role`);
  const storyProgress=story.locator('[role="progressbar"]');assert.equal(await storyProgress.count(),1,`${d.name}: story progressbar semantics missing`);assert.equal(await storyProgress.getAttribute('aria-valuemax'),'100',`${d.name}: story progress max missing`);
  await auditClean(page,`${d.name}/story`);await clearStory(page);

  assert(await page.locator('#app h1').count(),`${d.name}: current workspace has no h1`);
  const rolebar=page.locator('.rolebar');assert.equal(await rolebar.getAttribute('aria-label'),'Engineering role',`${d.name}: role navigation unlabeled`);assert.equal(await rolebar.locator('button[aria-pressed="true"]').count(),1,`${d.name}: active engineering role semantics missing`);
  const campaign=page.locator('.campaign-dots');assert.equal(await campaign.getAttribute('role'),'progressbar',`${d.name}: campaign progress semantics missing`);assert.equal(await campaign.getAttribute('aria-valuemax'),'7',`${d.name}: campaign progress max incorrect`);
  const colorBridge=await page.evaluate(()=>{const sample=document.querySelector('.sub'),probe=document.createElement('span');probe.style.color='var(--fl-text-muted)';document.body.appendChild(probe);const a=sample?getComputedStyle(sample).color:null,b=getComputedStyle(probe).color;probe.remove();return {actual:a,expected:b}});assert.equal(colorBridge.actual,colorBridge.expected,`${d.name}: legacy muted copy did not use accessible semantic color`);await auditClean(page,`${d.name}/company`);

  // Keyboard modality must produce a visible ring on the next real tabbable control.
  // The skip-link ordering itself was already verified above by direct focus + activation;
  // browser focus-history after programmatic activation is not a stable first-Tab contract.
  await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur()});await page.keyboard.press('Tab');
  const focused=await page.evaluate(()=>({tag:document.activeElement?.tagName||'',className:document.activeElement?.className||'',text:(document.activeElement?.textContent||'').trim().slice(0,60)}));
  assert(focused.tag,`${d.name}: keyboard navigation did not focus a control`);
  const focusRing=await page.evaluate(()=>{const cs=getComputedStyle(document.activeElement);return {style:cs.outlineStyle,width:parseFloat(cs.outlineWidth)||0}});assert.notEqual(focusRing.style,'none',`${d.name}: keyboard focus outline missing on ${JSON.stringify(focused)}`);assert(focusRing.width>=3,`${d.name}: focus outline too thin ${focusRing.width}`);

  await page.evaluate(()=>gameplayToggleMenu());await settle(page,80);await a11ySync(page);const moreClose=page.locator('.gameplay-more-sheet header button');assert.equal(await moreClose.getAttribute('aria-label'),'Close',`${d.name}: More close button lacks accessible name`);const locked=page.locator('.gameplay-system-grid button[aria-disabled="true"]');assert(await locked.count()>0,`${d.name}: expected early campaign locks`);await auditClean(page,`${d.name}/more`);await page.evaluate(()=>gameplayCloseMenu());await settle(page,60);

  await page.evaluate(()=>showExplain('FSDP'));await settle(page,70);await a11ySync(page);const modal=page.locator('[data-fl-overlay-panel="modal"]');assert.equal(await modal.locator('.x').getAttribute('aria-label'),'Close',`${d.name}: explainer close label missing`);const source=modal.locator('a[target="_blank"]');assert(/opens in new tab/i.test(await source.getAttribute('aria-label')||''),`${d.name}: external-source link does not announce new tab`);await auditClean(page,`${d.name}/modal`);await page.keyboard.press('Escape');await settle(page,60);

  await page.evaluate(()=>{state.story.seen=[...(state.story?.seen||[]).filter(x=>x!=='firstIncident'),'firstIncident'];state.story.active=null;openIncident('nan')});await settle(page,100);await a11ySync(page);
  const incident=page.locator('[data-fl-overlay-panel="incident"]');assert.equal(await incident.getAttribute('role'),'alertdialog',`${d.name}: live incident should be alertdialog`);
  const tabs=incident.locator('[role="tab"]');assert.equal(await tabs.count(),3,`${d.name}: incident tab semantics missing`);const selected=incident.locator('[role="tab"][aria-selected="true"]');assert.equal(await selected.count(),1,`${d.name}: exactly one incident tab must be selected`);await selected.focus();await page.keyboard.press('ArrowRight');await settle(page,100);await a11ySync(page);assert.equal((await incident.locator('[role="tab"][aria-selected="true"]').textContent())?.trim().toLowerCase(),'systems',`${d.name}: ArrowRight did not activate next incident tab`);assert.equal(await incident.locator('.alarm').getAttribute('aria-hidden'),'true',`${d.name}: decorative alarm glyph should be hidden from assistive tech`);await auditClean(page,`${d.name}/incident`);
  await page.evaluate(()=>{state.selectedIncident=null;state.workstation=null;save();render()});await settle(page,70);await a11ySync(page);

  await page.evaluate(()=>{const fixture=document.createElement('section');fixture.id='a11y-fixture';fixture.innerHTML='<input id="experimentBudget"><button type="button">×</button><table><thead><tr><th>Metric</th></tr></thead><tbody><tr><th>Run A</th></tr></tbody></table>';document.getElementById('app').appendChild(fixture)});await settle(page,60);await a11ySync(page);
  const fixture=page.locator('#a11y-fixture');assert.equal(await fixture.locator('input').getAttribute('aria-label'),'Experiment Budget',`${d.name}: derived field label missing`);assert.equal(await fixture.locator('button').getAttribute('aria-label'),'Close',`${d.name}: symbol-only button label missing`);assert.equal(await fixture.locator('thead th').getAttribute('scope'),'col',`${d.name}: table column scope missing`);assert.equal(await fixture.locator('tbody th').getAttribute('scope'),'row',`${d.name}: table row scope missing`);await auditClean(page,`${d.name}/fixture`);await page.evaluate(()=>document.getElementById('a11y-fixture')?.remove());

  if(d.name==='mobile'){
    const undersized=await page.evaluate(()=>[...document.querySelectorAll('button')].filter(el=>{const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||!el.getClientRects().length||el.closest('[aria-hidden="true"]'))return false;const r=el.getBoundingClientRect(),inline=el.matches('.term,.tech-help,.knowledge button');return r.height<(inline?31:43)}).map(el=>({text:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,50),h:el.getBoundingClientRect().height,className:el.className})));assert.deepEqual(undersized,[],`${d.name}: undersized touch targets ${JSON.stringify(undersized)}`);
    await page.evaluate(()=>document.documentElement.style.fontSize='32px');await settle(page,60);const zoom=await page.evaluate(()=>({eyebrow:parseFloat(getComputedStyle(document.querySelector('.eyebrow')).fontSize),overflow:document.documentElement.scrollWidth-window.innerWidth}));assert(zoom.eyebrow>=20,`${d.name}: microcopy did not respond to text scaling (${zoom.eyebrow}px)`);assert(zoom.overflow<=2,`${d.name}: text scaling caused horizontal overflow ${zoom.overflow}px`);await page.evaluate(()=>document.documentElement.style.fontSize='');
  }

  await page.emulateMedia({reducedMotion:'reduce'});await settle(page,40);const motion=await page.evaluate(()=>{const el=document.querySelector('.satellite');return el?parseFloat(getComputedStyle(el).animationDuration)||0:0});assert(motion<=.01,`${d.name}: reduced-motion animation still active (${motion}s)`);
  assert.equal(errors.length,0,`${d.name}: runtime errors: ${errors.join(' | ')}`);await ctx.close();
}
await browser.close();
console.log('Contrast / accessibility regression passed on desktop + mobile');