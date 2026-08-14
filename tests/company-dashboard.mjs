import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const devices=[
  {name:'desktop',viewport:{width:1440,height:1000},isMobile:false,hasTouch:false},
  {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];
const KEY_LAUNCHERS=[
  ['.data-evals-launch','model'],['.debt-launch','model'],['.arch-launch','model'],['.fork-launch','model'],['.maint-launch','model'],
  ['.ops-launch','operations'],['.slo-launch','operations'],['.rg-launch','operations'],['.rp-launch','execution']
];

async function settle(page){await page.waitForTimeout(110);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
async function dismissStory(page){for(let i=0;i<12;i++){const o=page.locator('.story-overlay');if(!(await o.count()))break;const b=o.locator('button').last();if(!(await b.count()))break;await b.click();await settle(page)}}
function luminance(rgb){const m=String(rgb).match(/rgba?\(([^)]+)\)/);if(!m)return 0;const [r,g,b]=m[1].split(',').map(Number);return (.2126*r+.7152*g+.0722*b)/255}
async function assertDashboard(page,label,{minimumLaunchers=1}={}){
  const hub=page.locator('.company-system-hub');assert.equal(await hub.count(),1,`${label}: expected exactly one Company Systems hub`);
  const launchers=hub.locator('button.fl-launch');assert((await launchers.count())>=minimumLaunchers,`${label}: expected at least ${minimumLaunchers} grouped launchers`);
  const orphan=await page.locator('.game-shell > button').evaluateAll(els=>els.filter(el=>el.classList.contains('fl-launch')||[...el.classList].some(c=>c.endsWith('-launch'))).map(el=>el.className));
  assert.equal(orphan.length,0,`${label}: orphan launchers remain directly under .game-shell: ${JSON.stringify(orphan)}`);
  const overflow=await hub.evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));assert(overflow.scroll<=overflow.client+3,`${label}: dashboard hub overflows horizontally: ${JSON.stringify(overflow)}`);
  const bright=await hub.locator('*').evaluateAll(els=>els.filter(el=>{const r=el.getBoundingClientRect(),cs=getComputedStyle(el);if(r.width*r.height<550||cs.display==='none'||cs.visibility==='hidden')return false;const m=cs.backgroundColor.match(/rgba?\(([^)]+)\)/);if(!m)return false;const [red,green,blue,a=1]=m[1].split(',').map(Number);const lum=(.2126*red+.7152*green+.0722*blue)/255;return a>.72&&lum>.88}).map(el=>({className:el.className,bg:getComputedStyle(el).backgroundColor,text:(el.textContent||'').trim().slice(0,80)})));
  assert.equal(bright.length,0,`${label}: near-white dashboard surfaces survived: ${JSON.stringify(bright)}`);
}

const browser=await chromium.launch({headless:true});
for(const d of devices){
  const ctx=await browser.newContext({viewport:d.viewport,isMobile:d.isMobile,hasTouch:d.hasTouch});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e)));
  await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.flCompanyDashboard),'1',`${d.name}: Company/Home dashboard organizer did not initialize`);

  const found=page.getByRole('button',{name:/found the lab/i});assert(await found.count(),`${d.name}: founder CTA missing`);await found.click();await settle(page);await dismissStory(page);
  await page.evaluate(()=>window.frontierCompanyDashboardSync?.());await settle(page);
  const earlyCount=await page.locator('.company-system-hub button.fl-launch').count();
  if(earlyCount)await assertDashboard(page,`${d.name} early Company/Home`,{minimumLaunchers:1});

  await page.evaluate(()=>{state.campaign ||= {version:1};state.campaign.graduated=true;state.campaign.companyPriority='research';state.campaign.modelReviewed=true;state.view='company';save();render()});await settle(page);await page.evaluate(()=>window.frontierCompanyDashboardSync?.());await settle(page);
  await assertDashboard(page,`${d.name} graduated Company/Home`,{minimumLaunchers:8});

  const groups=new Set(await page.locator('.company-system-group').evaluateAll(els=>els.map(el=>el.dataset.dashboardGroup)));
  assert(groups.has('model'),`${d.name}: Model & Engineering group missing`);
  assert(groups.has('operations'),`${d.name}: Operations & Releases group missing`);
  assert(groups.size>=3,`${d.name}: expected at least three populated dashboard groups, got ${JSON.stringify([...groups])}`);

  let keyFound=0;
  for(const [selector,expectedGroup] of KEY_LAUNCHERS){
    const l=page.locator(selector).first();if(!(await l.count()))continue;keyFound++;
    assert(await l.evaluate((el,g)=>el.closest('.company-system-group')?.dataset.dashboardGroup===g,expectedGroup),`${d.name}: ${selector} not grouped under ${expectedGroup}`);
  }
  assert(keyFound>=7,`${d.name}: expected at least 7 known dashboard launchers, found ${keyFound}`);

  const geometry=await page.locator('.company-system-launch-grid').evaluateAll(els=>els.filter(el=>el.children.length>=2).slice(0,3).map(el=>[...el.children].map(x=>Math.round(x.getBoundingClientRect().left))));
  if(geometry.length){
    for(const lefts of geometry){
      const columns=new Set(lefts).size;
      if(d.name==='desktop')assert(columns>=2,`desktop: launcher grid should use multiple columns: ${JSON.stringify(lefts)}`);
      else assert.equal(columns,1,`mobile: launcher grid should collapse to one column: ${JSON.stringify(lefts)}`);
    }
  }

  // A future feature module that appends a top-level launcher must be absorbed automatically.
  await page.evaluate(()=>{
    const shell=document.querySelector('.game-shell');const b=document.createElement('button');
    b.className='future-systems-launch';b.dataset.dashboardId='future-systems';b.innerHTML='<span>FUTURE SYSTEM</span><b>Quantum Planning</b><small>Future module fallback</small>';b.onclick=()=>{};shell.insertBefore(b,shell.querySelector('.world-grid'));
  });await settle(page);await page.evaluate(()=>window.frontierCompanyDashboardSync?.());await settle(page);
  const future=page.locator('.future-systems-launch');assert(await future.count(),`${d.name}: future launcher missing`);
  assert(await future.evaluate(el=>el.closest('.company-system-group')?.dataset.dashboardGroup==='other'),`${d.name}: future launcher should fall back to Other Lab Systems`);
  assert.equal(await page.locator('.company-system-hub').count(),1,`${d.name}: future launcher created duplicate hub`);

  const before=await page.locator('.company-system-hub button').count();
  await page.evaluate(()=>{window.frontierCompanyDashboardSync?.();window.frontierCompanyDashboardSync?.()});await settle(page);
  assert.equal(await page.locator('.company-system-hub button').count(),before,`${d.name}: repeated dashboard sync changed launcher count`);
  assert.equal(await page.locator('.company-system-hub').count(),1,`${d.name}: repeated dashboard sync duplicated hub`);

  // Reorganized launchers retain their original navigation behavior.
  const data=page.locator('.data-evals-launch').first();
  if(await data.count()){
    await data.click();await settle(page);
    assert.equal(await page.evaluate(()=>state.view),'dataEvals',`${d.name}: Data + Evals launcher lost navigation behavior after grouping`);
    await page.evaluate(()=>window.gameplayGoHome());await settle(page);await page.evaluate(()=>window.frontierCompanyDashboardSync?.());await settle(page);
    await assertDashboard(page,`${d.name} returned Company/Home`,{minimumLaunchers:8});
  }

  assert.equal(errors.length,0,`${d.name}: runtime errors: ${errors.join(' | ')}`);
  await ctx.close();
}
await browser.close();
console.log('Company/Home dashboard regression passed');
