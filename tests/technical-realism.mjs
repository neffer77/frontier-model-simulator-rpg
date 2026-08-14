import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(url,{waitUntil:'networkidle'});
const found=page.getByRole('button',{name:/found the lab/i});if(await found.count())await found.click();
for(let i=0;i<8&&await page.locator('.story-overlay').count();i++){const next=page.locator('.story-overlay button.primary');if(await next.count())await next.click();else break;await page.waitForTimeout(30)}

const audit=await page.evaluate(()=>({entries:REALISM_AUDIT.length,sources:Object.keys(REALISM_SOURCES).length,statuses:[...new Set(REALISM_AUDIT.map(x=>x.status))]}));
assert(audit.entries>=12,'realism audit should cover the major simulator domains');
assert(audit.sources>=10,'realism audit should expose primary-source registry');
for(const status of ['grounded','corrected','approx','synthetic','game'])assert(audit.statuses.includes(status),`missing ${status} realism classification`);

const physics=await page.evaluate(()=>{
  const dense=trainingPhysics(MODEL_TIERS.find(x=>x.id==='70b'));
  const moe=trainingPhysics(MODEL_TIERS.find(x=>x.id==='moe'));
  return {dense,moe};
});
assert.equal(physics.moe.totalParamsB,176,'MoE should preserve total parameter count');
assert.equal(physics.moe.activeParamsB,44,'MoE should expose active parameter proxy');
assert.equal(physics.moe.computeParamsB,44,'MoE FLOP accounting should use active parameters');
assert(physics.moe.flops < 6*176e9*3000e9,'MoE must not charge dense-total-parameter FLOPs');
assert.equal(physics.moe.effectiveH100TFLOPS,330,'H100-hour conversion baseline should be explicit');
assert.equal(physics.dense.flopsMethod,'6 × parameters × tokens','dense model should retain labeled 6ND approximation');
assert.equal(physics.moe.flopsMethod,'6 × active-parameter proxy × tokens','MoE should label its sparse compute proxy');

await page.waitForTimeout(80);
const prereq=await page.locator('.tech-node small').allTextContents();
assert(prereq.some(x=>x.startsWith('Lab prerequisite:')),'research-tree dependencies should be labeled as lab prerequisites');
assert(await page.locator('.realism-launch').isVisible(),'realism audit launcher should be visible');
await page.locator('.realism-launch').click();await page.waitForTimeout(80);
assert(await page.getByRole('heading',{name:'Technical Realism Audit'}).isVisible(),'realism audit page should open');
assert((await page.locator('.realism-card').count())>=12,'realism page should show audit cards');
assert((await page.locator('.realism-card a').count())>=10,'grounded claims should link primary sources');

assert.equal(errors.length,0,`runtime errors: ${errors.join(' | ')}`);
await browser.close();
console.log('Technical realism tests passed');
