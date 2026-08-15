import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const devices=[
  {name:'desktop',viewport:{width:1440,height:1000},isMobile:false,hasTouch:false},
  {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];

async function settle(page){await page.waitForTimeout(90);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
async function dismissStory(page){for(let i=0;i<12;i++){const o=page.locator('.story-overlay');if(!(await o.count()))break;const b=o.locator('button').last();if(!(await b.count()))break;await b.click();await settle(page)}}

const browser=await chromium.launch({headless:true});
for(const d of devices){
  const ctx=await browser.newContext({viewport:d.viewport,isMobile:d.isMobile,hasTouch:d.hasTouch});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e)));
  await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.flSurfaceSystem),'1',`${d.name}: shared surface adapter did not initialize`);

  const found=page.getByRole('button',{name:/found the lab/i});assert(await found.count(),`${d.name}: founder button missing`);await found.click();await settle(page);await dismissStory(page);
  await page.evaluate(()=>{state.campaign ||= {version:1};state.campaign.graduated=true;state.campaign.companyPriority='research';state.campaign.modelReviewed=true;state.view='company';save();render()});await settle(page);

  const corePanels=await page.locator('.panel').evaluateAll(els=>els.map(el=>({classes:el.className,surface:el.dataset.flSurface})));
  assert(corePanels.length>=6,`${d.name}: expected core dashboard panels`);
  assert(corePanels.every(x=>String(x.classes).includes('fl-panel')&&x.surface==='panel'),`${d.name}: core panels are not normalized: ${JSON.stringify(corePanels)}`);

  const launches=await page.locator('#app button').evaluateAll(els=>els.filter(el=>[...el.classList].some(c=>c.endsWith('-launch'))).map(el=>({classes:el.className,surface:el.dataset.flSurface,bg:getComputedStyle(el).backgroundImage,border:getComputedStyle(el).borderColor,radius:getComputedStyle(el).borderRadius})));
  assert(launches.length>=8,`${d.name}: expected a substantial set of dashboard launchers, found ${launches.length}`);
  assert(launches.every(x=>String(x.classes).includes('fl-launch')&&x.surface==='launch'),`${d.name}: legacy launchers were not tagged: ${JSON.stringify(launches)}`);
  assert(new Set(launches.map(x=>x.radius)).size===1,`${d.name}: launchers should share one canonical radius: ${JSON.stringify(launches.map(x=>x.radius))}`);

  await page.evaluate(()=>window.criticalPathOpen());await settle(page);
  const cpCard=page.locator('.cp-card').first();assert(await cpCard.count(),`${d.name}: Critical Path card missing`);
  assert(await cpCard.evaluate(el=>el.classList.contains('fl-card')&&el.dataset.flSurface==='card'),`${d.name}: Critical Path card not normalized`);

  await page.evaluate(()=>window.roadmapPressureOpen());await settle(page);
  const rpCard=page.locator('.rp-card').first();assert(await rpCard.count(),`${d.name}: Roadmap card missing`);
  assert(await rpCard.evaluate(el=>el.classList.contains('fl-card')),`${d.name}: Roadmap card not normalized`);
  const rpKpis=await page.locator('.rp-summary > *').evaluateAll(els=>els.map(el=>({classes:el.className,surface:el.dataset.flSurface,bg:getComputedStyle(el).backgroundColor})));
  assert(rpKpis.length>0&&rpKpis.every(x=>String(x.classes).includes('fl-kpi')&&x.surface==='kpi'),`${d.name}: Roadmap KPI cards not normalized: ${JSON.stringify(rpKpis)}`);

  // Future modules that follow the naming contract are normalized without being added to an allowlist.
  await page.evaluate(()=>{
    const host=document.createElement('section');host.id='surface-fixture';host.innerHTML=`
      <article class="future-card">Future card</article>
      <button class="future-launch"><b>Future launch</b><small>Open system</small></button>
      <div class="future-summary"><div>One</div><div>Two</div></div>
      <div class="future-row">Future row</div>
      <div class="future-actions"><button>Action</button></div>
      <div class="future-empty">Nothing here yet</div>
      <span class="future-badge">NEW</span>
      <article class="story-scene-card" id="special-card-fixture">Special cinematic card</article>`;
    document.getElementById('app').appendChild(host)
  });await settle(page);
  const expected=[['.future-card','fl-card'],['.future-launch','fl-launch'],['.future-row','fl-row'],['.future-actions','fl-actions'],['.future-empty','fl-empty'],['.future-badge','fl-badge']];
  for(const [selector,cls] of expected)assert(await page.locator(selector).evaluate((el,expectedClass)=>el.classList.contains(expectedClass),cls),`${d.name}: ${selector} missing ${cls}`);
  assert(await page.locator('.future-summary').evaluate(el=>el.classList.contains('fl-kpi-grid')),`${d.name}: future summary missing KPI grid primitive`);
  assert(await page.locator('.future-summary > div').evaluateAll(els=>els.every(el=>el.classList.contains('fl-kpi'))),`${d.name}: future summary children missing KPI primitive`);
  assert(!(await page.locator('#special-card-fixture').evaluate(el=>el.classList.contains('fl-card'))),`${d.name}: cinematic story cards should remain specialized`);

  assert.equal(errors.length,0,`${d.name}: runtime errors: ${errors.join(' | ')}`);
  await ctx.close();
}
await browser.close();
console.log('Shared panel/card browser regression passed');