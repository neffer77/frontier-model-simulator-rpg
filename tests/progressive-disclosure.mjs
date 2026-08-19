import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
async function settle(page){await page.waitForTimeout(100);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
async function clearTransientOverlays(page){for(let i=0;i<16;i++){const top=await page.evaluate(()=>window.frontierOverlayTop?.()?.type||null);if(!top||top==='incident')break;if(!['story','milestone','modal','priority','more'].includes(top))break;await page.keyboard.press('Escape');await settle(page)}await page.evaluate(()=>window.frontierOverlaySync?.())}

const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e)));
await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()});await page.reload({waitUntil:'networkidle'});
const found=page.getByRole('button',{name:/found the lab/i});assert(await found.count(),'founder button missing');await found.click();await settle(page);await clearTransientOverlays(page);
await page.evaluate(()=>{state.campaign ||= {version:1};state.campaign.graduated=true;state.campaign.companyPriority='research';state.campaign.modelReviewed=true;save();render()});await settle(page);await clearTransientOverlays(page);

await page.evaluate(()=>window.criticalPathOpen());await settle(page);await clearTransientOverlays(page);
const cp=page.locator('.cp-card');assert(await cp.count(),'Critical Path card missing');
assert(await cp.locator('.fl-zero-state,[data-fl-zero-key]').count(),'Critical Path should expose its actionable zero-state guidance');
assert(!(await cp.evaluate(el=>el.classList.contains('pd-enhanced'))),'actionable Critical Path zero-state must not be wrapped in progressive disclosure');
assert.equal(await cp.locator(':scope > .pd-toggle').count(),0,'actionable Critical Path zero-state must remain immediately visible on mobile');

await page.evaluate(()=>{state.view='criticalPath';document.getElementById('app').innerHTML=`<div id="pd-fixture"><section class="overview-card"><h2>Overview</h2><p>Primary context always visible.</p></section><section class="alpha-card"><h2>Alpha work</h2><p>Ready work.</p></section><section class="beta-card locked"><h2>Beta work</h2><p>Requires an unlock.</p></section><section class="gamma-card"><h2>Gamma work</h2><p>No active projects.</p></section></div>`;frontierDisclosureSync()});await settle(page);await clearTransientOverlays(page);
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
await page.setViewportSize({width:1000,height:800});await settle(page);assert.equal(await page.locator('#app .pd-toggle').count(),0,'desktop resize left mobile disclosure toggles behind');assert.equal(await page.locator('#app .pd-enhanced').count(),0,'desktop resize left mobile disclosure classes behind');await page.evaluate(()=>criticalPathOpen());await settle(page);await clearTransientOverlays(page);assert.equal(await page.locator('#app .pd-toggle').count(),0,'desktop dense page should not receive mobile disclosure controls');
assert.equal(errors.length,0,`runtime errors: ${errors.join(' | ')}`);await ctx.close();await browser.close();console.log('Progressive disclosure browser regression passed');
