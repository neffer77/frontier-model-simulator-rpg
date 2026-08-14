import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(url,{waitUntil:'networkidle'});
const found=page.getByRole('button',{name:/found the lab/i});if(await found.count())await found.click();
for(let i=0;i<8&&await page.locator('.story-overlay').count();i++){const next=page.locator('.story-overlay button.primary');if(await next.count())await next.click();else break;await page.waitForTimeout(30)}

const initial=await page.evaluate(()=>balanceReport());
assert(initial.resources.monthlyBurnM>0,'monthly burn must be positive');
assert(initial.resources.runwayMonths>0,'fresh lab should have positive runway');

const seed=await page.evaluate(()=>{
  const before=state.compute;state.reputation=2;checkFunding();const once=state.compute;checkFunding();return {before,once,twice:state.compute,claimed:[...state.fundingClaimed],cash:state.cashM};
});
assert(seed.claimed.includes('seed'),'first shipped-model reputation should unlock seed funding');
assert(seed.once-seed.before>=20000,'seed round must add meaningful compute');
assert.equal(seed.twice,seed.once,'funding compute must be idempotent');

const repeatFundingRep=await page.evaluate(()=>{
  const models=state.models,reputation=state.reputation;state.models=Array.from({length:7},(_,i)=>({name:`CHEAP-${i}`,tier:'350M Dense',day:i+1}));state.reputation=14;const effective=balanceFundingReputation();state.models=models;state.reputation=reputation;return effective;
});
assert(repeatFundingRep<15,'repeating the cheapest tier must not farm Series A eligibility');

const infra=await page.evaluate(()=>{
  state.cashM=50;const before=state.compute,level=state.infra;upgradeInfra();return {before,after:state.compute,from:level,to:state.infra};
});
assert.equal(infra.to,infra.from+1,'infrastructure upgrade should succeed with sufficient cash');
assert(infra.after-infra.before>=15000,'infrastructure must add usable compute capacity');

const capex=await page.evaluate(()=>{
  state.cashM=50;ensureQuarterlyBoardState();setQuarterPlan('balanced',3);const before=state.compute,allocation=state.quarterlyBoard.plan.allocations.compute;approveQuarterPlan();return {before,after:state.compute,allocation,status:state.quarterlyBoard.plan.status};
});
assert.equal(capex.status,'funded','quarterly plan should fund');
assert(capex.allocation>0&&capex.after>capex.before,'compute allocation must purchase real H100-hours');

const burn=await page.evaluate(()=>{
  state.cashM=10;state.balancePacing.lastEconomicDay=state.day;const monthly=balanceMonthlyBurn(),before=state.cashM;state.day+=30;render();return {before,after:state.cashM,monthly};
});
assert(burn.after<burn.before,'simulated time must consume operating cash');
assert(Math.abs((burn.before-burn.after)-burn.monthly)<0.05,'30 simulated days should charge about one month of burn');

const debt=await page.evaluate(()=>{
  ensureTechDebtState();state.techDebt.items=[];state.techDebt.policy.autoSeeded=true;state.techDebt.nextId=1;const item=techDebtAdd('fragile_precision','balance-test');const open=techDebtImpact().score;techDebtPay(item.id,'accept');const accepted=techDebtImpact().score;return {open,accepted,status:item.status};
});
assert.equal(debt.status,'accepted','debt should enter accepted state');
assert(debt.accepted>0,'accepted technical debt must retain real consequence pressure');
assert(debt.accepted<debt.open,'accepted risk should reduce pressure relative to unresolved debt, not erase it');

const cooldown=await page.evaluate(()=>{
  state.campaign.failureInjected=true;state.selectedIncident=null;state.activeRun={name:'BAL-TEST',tier:'350m',progress:35,phase:'pretraining',physics:trainingPhysics(MODEL_TIERS[0]),startedDay:state.day,loss:2.5,incident:null,balanceIncidentCount:2};state.balancePacing.lastResolvedIncidentDay=state.day;advanceRun();return {incident:state.activeRun?.incident||null,progress:state.activeRun?.progress||100};
});
assert.equal(cooldown.incident,null,'incident cap/cooldown should suppress ordinary incident spam');
assert(cooldown.progress>35,'suppressed incident should not block training progress');

assert.equal(errors.length,0,`runtime errors: ${errors.join(' | ')}`);
await browser.close();
console.log('Balance and pacing tests passed');
