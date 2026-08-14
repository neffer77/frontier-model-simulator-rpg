import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const devices=[
  {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:1000},isMobile:false,hasTouch:false}
];
const browser=await chromium.launch({headless:true});
for(const d of devices){
  const ctx=await browser.newContext({viewport:d.viewport,isMobile:d.isMobile,hasTouch:d.hasTouch});
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'networkidle'});
  assert(await page.locator('#app').isVisible(),`${d.name}: app not visible`);
  const found=page.getByRole('button',{name:/found the lab/i});
  if(await found.count()){await found.click();await page.waitForTimeout(150);}
  for(let i=0;i<8&&await page.locator('.story-overlay').count();i++){
    const next=page.locator('.story-overlay button.primary');if(await next.count())await next.click();else break;
    await page.waitForTimeout(50);
  }
  assert(await page.locator('.gameplay-bottom-nav').isVisible(),`${d.name}: gameplay nav missing`);
  assert(await page.locator('.campaign-progress').isVisible(),`${d.name}: campaign progress missing`);
  assert(await page.locator('.balance-tempo').isVisible(),`${d.name}: balance tempo strip missing`);
  const report=await page.evaluate(()=>window.balanceReport?.());
  assert(report?.resources?.monthlyBurnM>0,`${d.name}: balance telemetry unavailable`);
  assert(report?.resources?.runwayMonths>=0,`${d.name}: invalid runway telemetry`);
  const team=page.getByRole('button',{name:/team/i}).last();
  assert((await team.getAttribute('class')||'').includes('locked'),`${d.name}: advanced Team navigation should start locked`);

  await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));
  const staleY=await page.evaluate(()=>scrollY);
  assert(staleY>80,`${d.name}: test page is not tall enough to exercise navigation scrolling`);
  await page.getByRole('button',{name:/train/i}).last().click();await page.waitForTimeout(450);
  const trainPosition=await page.evaluate(()=>{const el=document.querySelector('.run');if(!el)return null;const r=el.getBoundingClientRect();return {scrollY,top:r.top,bottom:r.bottom,height:innerHeight}});
  assert(trainPosition,`${d.name}: training section missing`);
  assert(Math.abs(trainPosition.scrollY-staleY)>40,`${d.name}: Train preserved stale scroll position`);
  assert(trainPosition.bottom>0&&trainPosition.top<trainPosition.height,`${d.name}: Train did not navigate training section into viewport`);

  await page.getByRole('button',{name:/home/i}).last().click();await page.waitForTimeout(180);
  assert((await page.evaluate(()=>scrollY))<80,`${d.name}: Home did not return to top on same-view navigation`);
  assert.equal(errors.length,0,`${d.name}: runtime errors: ${errors.join(' | ')}`);
  await ctx.close();
}
await browser.close();
console.log('Cross-device smoke test passed');