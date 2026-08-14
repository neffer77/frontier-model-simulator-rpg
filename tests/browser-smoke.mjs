import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const devices=[
  {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:1000},isMobile:false,hasTouch:false}
];
const browser=await chromium.launch({headless:true});
let failures=[];
for(const d of devices){
  const ctx=await browser.newContext({viewport:d.viewport,isMobile:d.isMobile,hasTouch:d.hasTouch});
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'networkidle'});
  assert(await page.locator('#app').isVisible(),`${d.name}: app not visible`);
  const found=page.getByRole('button',{name:/found the lab/i});
  if(await found.count()){await found.click();await page.waitForTimeout(150);}
  // Dismiss/advance the story overlay if present so navigation remains testable.
  for(let i=0;i<8&&await page.locator('.story-overlay').count();i++){
    const next=page.locator('.story-overlay button.primary');if(await next.count())await next.click();else break;
    await page.waitForTimeout(50);
  }
  assert(await page.locator('.gameplay-bottom-nav').isVisible(),`${d.name}: gameplay nav missing`);
  await page.evaluate(()=>scrollTo(0,Math.max(600,document.body.scrollHeight/2)));
  await page.getByRole('button',{name:/team/i}).last().click();await page.waitForTimeout(150);
  assert((await page.evaluate(()=>scrollY))<80,`${d.name}: navigation preserved stale scroll position`);
  await page.getByRole('button',{name:/home/i}).last().click();await page.waitForTimeout(100);
  assert.equal(errors.length,0,`${d.name}: runtime errors: ${errors.join(' | ')}`);
  await ctx.close();
}
await browser.close();
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('Cross-device smoke test passed');