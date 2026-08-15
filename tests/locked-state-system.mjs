import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const devices=[
  {name:'desktop',viewport:{width:1440,height:1000},isMobile:false,hasTouch:false},
  {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];
async function settle(page,ms=80){await page.waitForTimeout(ms);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
async function dismissStory(page){for(let i=0;i<12;i++){const o=page.locator('.story-overlay');if(!(await o.count()))break;const b=o.locator('button').last();if(!(await b.count()))break;await b.click();await settle(page,25)}}
async function prepare(page){
  await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.flLockedStateSystem),'1','locked-state runtime missing');
  const founder=page.getByRole('button',{name:/found the lab/i});assert(await founder.count(),'founder CTA missing');await founder.click();await settle(page);await dismissStory(page);await settle(page,120);
  await page.evaluate(()=>{window.frontierCompanyDashboardSync?.();window.frontierLockedStateSync?.()});await settle(page,60);
}
async function assertPlan(page,target,expectedStage,unlocked=false){
  const plan=await page.evaluate(t=>window.campaignUnlockPlan?.(t)||null,target);assert(plan,`missing unlock plan for ${target}`);
  assert.equal(plan.unlockStageId,expectedStage,`${target}: unlock stage drift`);assert.equal(plan.unlocked,unlocked,`${target}: unexpected unlock state`);assert(plan.label,`${target}: label missing`);return plan;
}

const browser=await chromium.launch({headless:true});
for(const d of devices){
  const ctx=await browser.newContext({viewport:d.viewport,isMobile:d.isMobile,hasTouch:d.hasTouch});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e)));
  await prepare(page);
  assert.equal(await page.evaluate(()=>campaignCurrentStage().id),'firstCall',`${d.name}: expected Chapter 1 start`);
  const registry=await page.evaluate(()=>campaignUnlockRegistry?.()||[]);assert.equal(registry.length,23,`${d.name}: expected 4 core + 19 system unlock plans`);
  await assertPlan(page,'dataEvalsOpen','firstCall',true);await assertPlan(page,'techDebtOpen','recover',false);const opsPlan=await assertPlan(page,'opsOpen','firstHire',false);assert.equal(opsPlan.unlockChapter,6,`${d.name}: Operations should identify Chapter 6`);await assertPlan(page,'releaseGovOpen','tradeoff',false);await assertPlan(page,'governanceOpen','graduated',false);await assertPlan(page,'models','firstModel',false);await assertPlan(page,'team','firstHire',false);

  const team=page.locator('.gameplay-bottom-nav button[data-campaign-target="team"]');const models=page.locator('.gameplay-bottom-nav button[data-campaign-target="models"]');const home=page.locator('.gameplay-bottom-nav button[data-campaign-target="home"]');
  assert.equal(await team.getAttribute('aria-disabled'),'true',`${d.name}: Team should expose locked semantics`);assert.equal(await models.getAttribute('aria-disabled'),'true',`${d.name}: Models should expose locked semantics`);assert(!(await home.evaluate(el=>el.classList.contains('fl-campaign-locked'))),`${d.name}: Home must remain unlocked`);assert(await team.locator('.fl-lock-meta').count(),`${d.name}: Team lock chapter badge missing`);

  const companyLaunches=page.locator('.company-system-hub button.fl-launch');assert(await companyLaunches.count()>=8,`${d.name}: Company Systems launchers missing`);
  const companyLocked=companyLaunches.locator('.fl-campaign-locked');assert(await companyLocked.count()>=6,`${d.name}: expected locked Company systems in Chapter 1`);
  const dataLaunch=companyLaunches.filter({hasText:/DATA \+ EVALS/i}).first();assert(await dataLaunch.count(),`${d.name}: Data + Evals launcher missing`);assert(!(await dataLaunch.evaluate(el=>el.classList.contains('fl-campaign-locked'))),`${d.name}: Data + Evals should be unlocked in Chapter 1`);
  const opsLaunch=companyLaunches.filter({hasText:/OPERATIONS/i}).first();assert(await opsLaunch.count(),`${d.name}: Operations launcher missing`);assert(await opsLaunch.evaluate(el=>el.classList.contains('fl-campaign-locked')),`${d.name}: Operations launcher should be locked`);assert((await opsLaunch.getAttribute('title')||'').includes('CHAPTER 6'),`${d.name}: Operations launcher title should explain unlock chapter`);

  await page.evaluate(()=>gameplayToggleMenu());await settle(page,50);
  const moreOps=page.locator('.gameplay-system-grid button[data-campaign-target="opsOpen"]');assert(await moreOps.count(),`${d.name}: More-sheet Operations target missing`);assert(await moreOps.evaluate(el=>el.classList.contains('fl-campaign-locked')),`${d.name}: More-sheet Operations should be visibly locked`);assert(await moreOps.locator('.fl-lock-meta').count(),`${d.name}: More-sheet lock metadata missing`);
  const moreData=page.locator('.gameplay-system-grid button[data-campaign-target="dataEvalsOpen"]');assert(!(await moreData.evaluate(el=>el.classList.contains('fl-campaign-locked'))),`${d.name}: More-sheet Data + Evals should be unlocked`);await page.evaluate(()=>gameplayCloseMenu());

  await opsLaunch.click();await settle(page,70);assert.equal(await page.evaluate(()=>state.view),'company',`${d.name}: locked Operations launcher changed view`);
  const panel=page.locator('.fl-lock-explainer');assert.equal(await panel.count(),1,`${d.name}: lock explainer missing`);assert.equal(await panel.getAttribute('role'),'region',`${d.name}: lock explainer region semantics missing`);assert(/Operations is not available yet/i.test(await panel.locator('h3').textContent()||''),`${d.name}: lock explainer target title missing`);
  const copy=(await panel.textContent())||'';assert(copy.includes('CHAPTER 1 · FIRST CALL'),`${d.name}: current prerequisite missing`);assert(copy.includes('CHAPTER 6 · BUILD THE LAB'),`${d.name}: unlock point missing`);assert(copy.includes('Campaign progress toward unlock'),`${d.name}: progress explanation missing`);assert(await panel.getByRole('button',{name:/Choose a training run/i}).count(),`${d.name}: current-objective CTA missing`);
  const rect=await panel.evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}});assert(rect.left>=-2&&rect.right<=d.viewport.width+2,`${d.name}: lock explainer overflows viewport ${JSON.stringify(rect)}`);if(d.name==='mobile'){const h=await panel.getByRole('button',{name:/Choose a training run/i}).evaluate(el=>el.getBoundingClientRect().height);assert(h>=43,`mobile lock CTA below ~44px (${h})`)}
  await panel.getByRole('button',{name:/Close lock explanation/i}).click();assert.equal(await panel.count(),0,`${d.name}: lock explainer did not close`);

  await page.evaluate(()=>{const shell=document.querySelector('.game-shell');const b=document.createElement('button');b.id='qaUnavailable';b.disabled=true;b.textContent='Synthetic blocked action';shell.appendChild(b)});await settle(page,50);await page.evaluate(()=>window.frontierLockedStateSync?.());
  const blocked=page.locator('#qaUnavailable');assert(await blocked.evaluate(el=>el.classList.contains('fl-unavailable-now')),`${d.name}: disabled action missing unavailable treatment`);assert.equal(await blocked.getAttribute('aria-disabled'),null,`${d.name}: native disabled action should not be relabeled as campaign lock`);assert((await blocked.getAttribute('title')||'').includes('current simulation state'),`${d.name}: disabled action explanation missing`);await page.evaluate(()=>{const b=document.getElementById('qaUnavailable');b.disabled=false;window.frontierLockedStateSync?.()});assert(!(await blocked.evaluate(el=>el.classList.contains('fl-unavailable-now'))),`${d.name}: unavailable treatment survived re-enable`);

  await page.evaluate(()=>{state.campaign.graduated=true;state.campaign.companyPriority='Research velocity';save();render()});await settle(page,140);await dismissStory(page);await page.evaluate(()=>{window.frontierCompanyDashboardSync?.();window.frontierLockedStateSync?.()});await settle(page,30);
  assert.equal(await page.evaluate(()=>campaignCurrentStage().id),'graduated',`${d.name}: graduation fixture failed`);assert.equal((await page.evaluate(()=>campaignUnlockPlan('opsOpen').unlocked)),true,`${d.name}: Operations did not unlock after graduation`);
  const unlockedOps=page.locator('.company-system-hub button.fl-launch').filter({hasText:/OPERATIONS/i}).first();assert(await unlockedOps.count(),`${d.name}: graduated Operations launcher missing`);assert(!(await unlockedOps.evaluate(el=>el.classList.contains('fl-campaign-locked'))),`${d.name}: Operations retained campaign lock after graduation`);assert.equal(await unlockedOps.getAttribute('aria-disabled'),null,`${d.name}: owned aria-disabled survived unlock`);
  const unlockedTeam=page.locator('.gameplay-bottom-nav button[data-campaign-target="team"]');assert(!(await unlockedTeam.evaluate(el=>el.classList.contains('fl-campaign-locked'))),`${d.name}: Team retained campaign lock after graduation`);

  assert.equal(errors.length,0,`${d.name}: runtime errors: ${errors.join(' | ')}`);await ctx.close();
}
await browser.close();
console.log('Locked / unavailable state regression passed on desktop + mobile');