import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
async function settle(page){await page.waitForTimeout(100);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
async function dismissStory(page){for(let i=0;i<12;i++){const o=page.locator('.story-overlay');if(!(await o.count()))break;const b=o.locator('button').last();if(!(await b.count()))break;await b.click();await settle(page)}}
function luminance(rgb){const m=String(rgb).match(/rgba?\(([^)]+)\)/);if(!m)return 0;const [r,g,b]=m[1].split(',').map(Number);return(.2126*r+.7152*g+.0722*b)/255}

const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e)));
await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()});await page.reload({waitUntil:'networkidle'});
const found=page.getByRole('button',{name:/found the lab/i});assert(await found.count(),'founder button missing');await found.click();await settle(page);await dismissStory(page);
await page.evaluate(()=>{state.campaign ||= {version:1};state.campaign.graduated=true;state.campaign.companyPriority='research';state.campaign.modelReviewed=true;save();render()});await settle(page);await dismissStory(page);

await page.evaluate(()=>window.criticalPathOpen());await settle(page);await dismissStory(page);
const cp=page.locator('.cp-card');assert(await cp.count(),'Critical Path card missing');
assert(await cp.evaluate(el=>el.classList.contains('pd-enhanced')),'Critical Path card was not disclosure-enhanced on mobile');
assert.equal(await cp.getAttribute('data-pd-state'),'empty','Critical Path empty state was not classified');
assert(await cp.evaluate(el=>el.classList.contains('pd-collapsed')),'empty Critical Path section should default collapsed');
const cpToggle=cp.locator(':scope > .pd-toggle');assert.equal(await cpToggle.count(),1,'Critical Path must have exactly one disclosure toggle');
assert.equal(await cpToggle.getAttribute('aria-expanded'),'false','collapsed disclosure aria state is wrong');
assert((await cpToggle.textContent()).includes('Dependency graph'),'collapsed disclosure must identify the section');
assert((await cpToggle.textContent()).includes('No data yet'),'empty disclosure needs explicit status text');
assert(luminance(await cpToggle.evaluate(el=>getComputedStyle(el).backgroundColor))<.72,'empty disclosure row should remain dark');
assert.equal(await cp.locator(':scope > h2').evaluate(el=>getComputedStyle(el).display),'none','collapsed section heading should not remain as a duplicate strip');

await cpToggle.click();await settle(page);
assert.equal(await cpToggle.getAttribute('aria-expanded'),'true','expanded disclosure aria state is wrong');
assert(!(await cp.evaluate(el=>el.classList.contains('pd-collapsed'))),'Critical Path did not expand');
assert.notEqual(await cp.locator(':scope > h2').evaluate(el=>getComputedStyle(el).display),'none','expanded section heading should be visible');
const rememberedKey=await cp.getAttribute('data-pd-key');
await page.evaluate(()=>render());await settle(page);await dismissStory(page);
const cpAfterRender=page.locator('.cp-card');
assert.equal(await cpAfterRender.getAttribute('data-pd-key'),rememberedKey,'stable disclosure key changed after render');
assert.equal(await cpAfterRender.locator(':scope > .pd-toggle').getAttribute('aria-expanded'),'true','expanded state did not survive re-render');

await page.evaluate(()=>{state.view='criticalPath';document.getElementById('app').innerHTML=`<div id="pd-fixture"><section class="overview-card"><h2>Overview</h2><p>Primary context always visible.</p></section><section class="alpha-card"><h2>Alpha work</h2><p>Ready work.</p></section><section class="beta-card locked"><h2>Beta work</h2><p>Requires an unlock.</p></section><section class="gamma-card"><h2>Gamma work</h2><p>No active projects.</p></section></div>`;frontierDisclosureSync()});await settle(page);
const alpha=page.locator('.alpha-card'),beta=page.locator('.beta-card'),gamma=page.locator('.gamma-card');
assert.equal(await alpha.getAttribute('data-pd-state'),'ready','ready section classification failed');
assert.equal(await alpha.locator(':scope > .pd-toggle').getAttribute('aria-expanded'),'true','first ready secondary section should default expanded');
assert.equal(await beta.getAttribute('data-pd-state'),'locked','locked section classification failed');
assert((await beta.locator(':scope > .pd-toggle').textContent()).includes('Locked'),'locked disclosure should say Locked');
assert.equal(await gamma.getAttribute('data-pd-state'),'empty','empty future section classification failed');
await beta.locator(':scope > .pd-toggle').click();await settle(page);const betaKey=await beta.getAttribute('data-pd-key');
await page.evaluate(()=>{const host=document.getElementById('pd-fixture'),beta=host.querySelector('.beta-card'),gamma=host.querySelector('.gamma-card');host.insertBefore(gamma,beta);frontierDisclosureSync()});await settle(page);
assert.equal(await page.locator('.beta-card').getAttribute('data-pd-key'),betaKey,'reordering sections changed the stable disclosure key');
assert.equal(await page.locator('.beta-card > .pd-toggle').getAttribute('aria-expanded'),'true','reordering sections lost saved disclosure state');
await page.evaluate(()=>{for(let i=0;i<5;i++)frontierDisclosureSync()});await settle(page);assert.equal(await page.locator('#pd-fixture .pd-toggle').count(),3,'repeated disclosure synchronization created duplicate toggles');
await page.setViewportSize({width:1000,height:800});await settle(page);assert.equal(await page.locator('#app .pd-toggle').count(),0,'desktop resize left mobile disclosure toggles behind');assert.equal(await page.locator('#app .pd-enhanced').count(),0,'desktop resize left mobile disclosure classes behind');await page.evaluate(()=>criticalPathOpen());await settle(page);await dismissStory(page);assert.equal(await page.locator('#app .pd-toggle').count(),0,'desktop dense page should not receive mobile disclosure controls');
assert.equal(errors.length,0,`runtime errors: ${errors.join(' | ')}`);await ctx.close();await browser.close();console.log('Progressive disclosure browser regression passed');
