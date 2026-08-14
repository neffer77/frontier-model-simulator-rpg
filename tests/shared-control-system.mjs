import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const devices=[
  {name:'desktop',viewport:{width:1440,height:1000},isMobile:false,hasTouch:false},
  {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];

async function settle(page){await page.waitForTimeout(90);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
async function dismissStory(page){for(let i=0;i<12;i++){const o=page.locator('.story-overlay');if(!(await o.count()))break;const b=o.locator('button').last();if(!(await b.count()))break;await b.click();await settle(page)}}
async function hasClasses(locator,...classes){return locator.evaluate((el,cs)=>cs.every(c=>el.classList.contains(c)),classes)}

const browser=await chromium.launch({headless:true});
for(const d of devices){
  const ctx=await browser.newContext({viewport:d.viewport,isMobile:d.isMobile,hasTouch:d.hasTouch});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e)));
  await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.flControlSystem),'1',`${d.name}: shared control adapter did not initialize`);

  const found=page.getByRole('button',{name:/found the lab/i});assert(await found.count(),`${d.name}: founder CTA missing`);assert(await hasClasses(found,'fl-btn','fl-btn-primary'),`${d.name}: founder CTA should be primary`);await found.click();await settle(page);await dismissStory(page);
  await page.evaluate(()=>{state.campaign ||= {version:1};state.campaign.graduated=true;state.campaign.companyPriority='research';state.campaign.modelReviewed=true;state.view='company';save();render()});await settle(page);

  const objective=page.locator('.gameplay-objective button').first();if(await objective.count())assert(await hasClasses(objective,'fl-btn','fl-btn-primary'),`${d.name}: objective CTA should be primary`);

  const role=page.locator('.rolebar button').first();assert(await role.count(),`${d.name}: role navigation missing`);assert(await hasClasses(role,'fl-btn','fl-btn-nav'),`${d.name}: role switch should use nav control`);
  const roleRadius=await role.evaluate(el=>parseFloat(getComputedStyle(el).borderRadius));assert(roleRadius>20,`${d.name}: role navigation should preserve pill geometry, got ${roleRadius}px`);

  const bottom=page.locator('.gameplay-bottom-nav button').first();assert(await bottom.count(),`${d.name}: bottom navigation missing`);assert(await hasClasses(bottom,'fl-btn','fl-btn-nav'),`${d.name}: bottom navigation should use nav variant`);assert.equal(await bottom.evaluate(el=>getComputedStyle(el).display),'grid',`${d.name}: bottom navigation icon/label grid was flattened`);

  const expand=page.getByRole('button',{name:/expand campus/i}).first();assert(await expand.count(),`${d.name}: expand-campus button missing`);assert(await hasClasses(expand,'fl-btn','fl-btn-ghost'),`${d.name}: panel header action should be ghost`);

  const reset=page.getByRole('button',{name:/^reset$/i}).first();assert(await reset.count(),`${d.name}: reset button missing`);assert(await hasClasses(reset,'fl-btn','fl-btn-danger'),`${d.name}: destructive reset should be danger`);

  // Launch/card controls remain owned by their specialized systems.
  const launch=page.locator('.fl-launch').first();assert(await launch.count(),`${d.name}: expected dashboard launcher`);assert(!(await launch.evaluate(el=>el.classList.contains('fl-btn'))),`${d.name}: dashboard launchers should not be flattened into ordinary buttons`);
  const tier=page.locator('.tier').first();assert(await tier.count(),`${d.name}: training tier missing`);assert(!(await tier.evaluate(el=>el.classList.contains('fl-btn'))),`${d.name}: training tier card should stay specialized`);

  await page.evaluate(()=>window.criticalPathOpen());await settle(page);
  const back=page.getByRole('button',{name:/return to company/i}).first();assert(await back.count(),`${d.name}: Critical Path return control missing`);assert(await hasClasses(back,'fl-btn','fl-btn-ghost'),`${d.name}: page-header return should be ghost`);

  await page.evaluate(()=>window.showExplain?.('FLOPS'));await settle(page);
  const close=page.locator('.modal .x').first();assert(await close.count(),`${d.name}: explainer close control missing`);assert(await hasClasses(close,'fl-btn','fl-btn-icon'),`${d.name}: modal close should be icon control`);
  await close.click();await settle(page);

  // Synthetic future controls prove the semantic contract works without module allowlisting.
  await page.evaluate(()=>{
    const host=document.createElement('section');host.id='control-fixture';host.innerHTML=`
      <button id="future-secondary">Inspect</button>
      <button id="future-danger" onclick="removeSomething?.()">Remove record</button>
      <button id="future-locked" class="locked">Locked action</button>
      <button id="future-disabled" disabled>Disabled action</button>
      <header class="future-head"><button id="future-header">Return</button></header>
      <nav><button id="future-nav">Tab</button></nav>
      <button id="future-icon" aria-label="Close">×</button>
      <div class="future-actions"><button id="future-action">Save draft</button></div>
      <lab-disclosure label="More detail"><p>Legacy disclosure body</p></lab-disclosure>
      <div class="gameplay-system-grid"><button id="future-system-card"><span>SYS</span>System card</button></div>
      <input id="future-input" type="text" placeholder="Name">
      <select id="future-select"><option>One</option></select>
      <textarea id="future-textarea"></textarea>`;
    document.getElementById('app').appendChild(host)
  });await settle(page);

  const expected=[
    ['#future-secondary','fl-btn-secondary'],['#future-danger','fl-btn-danger'],['#future-locked','fl-btn-locked'],['#future-disabled','fl-btn-locked'],['#future-header','fl-btn-ghost'],['#future-nav','fl-btn-nav'],['#future-icon','fl-btn-icon'],['#future-action','fl-btn-secondary']
  ];
  for(const [selector,cls] of expected){const l=page.locator(selector);assert(await hasClasses(l,'fl-btn',cls),`${d.name}: ${selector} missing ${cls}`)}
  for(const selector of ['#future-input','#future-select','#future-textarea'])assert(await page.locator(selector).evaluate(el=>el.classList.contains('fl-control-field')),`${d.name}: ${selector} missing shared field styling`);
  assert(await page.locator('.future-actions').evaluate(el=>el.classList.contains('fl-control-group')),`${d.name}: action group not normalized`);

  const legacyDisclosure=page.locator('lab-disclosure > .lab-disclosure-toggle').first();assert(await legacyDisclosure.count(),`${d.name}: legacy lab-disclosure toggle missing`);assert(await hasClasses(legacyDisclosure,'fl-btn','fl-btn-ghost'),`${d.name}: legacy lab-disclosure should use ghost control hierarchy`);assert.equal(await legacyDisclosure.evaluate(el=>getComputedStyle(el).width),await legacyDisclosure.evaluate(el=>getComputedStyle(el.parentElement).width),`${d.name}: lab-disclosure toggle should span its disclosure surface`);
  assert(!(await page.locator('#future-system-card').evaluate(el=>el.classList.contains('fl-btn'))),`${d.name}: More-sheet/system navigation cards must remain specialized`);

  if(d.name==='mobile'){
    const heights=await page.locator('#future-secondary,#future-danger,#future-header,#future-nav,#future-icon').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height));
    assert(heights.every(h=>h>=43),`mobile: shared controls should meet ~44px touch height: ${JSON.stringify(heights)}`);
  }

  assert.equal(errors.length,0,`${d.name}: runtime errors: ${errors.join(' | ')}`);
  await ctx.close();
}
await browser.close();
console.log('Shared button/control browser regression passed');
