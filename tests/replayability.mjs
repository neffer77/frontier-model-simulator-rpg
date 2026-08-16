import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function dismissStory(p){for(let i=0;i<12&&await p.locator('.story-overlay').count();i++){const next=p.locator('.story-overlay button').last();if(!(await next.count()))break;await next.click();await p.waitForTimeout(30)}}
await page.goto(url,{waitUntil:'networkidle'});

assert(await page.locator('.replay-founder').isVisible(),'fresh founder screen should expose run configuration');
assert.equal(await page.locator('.replay-choice-grid').count()>=3,true,'difficulty, archetype, and challenge choices should render');
const defaults=await page.evaluate(()=>({setup:JSON.parse(localStorage.getItem('frontier-run-setup-v1')),canonical:replayCanonicalDefault(),balanced:REPLAY_ARCHETYPES.balanced,archetypes:Object.keys(REPLAY_ARCHETYPES).length}));
assert.equal(defaults.setup.difficulty,'standard','new players should start on Standard difficulty');
assert.equal(defaults.setup.archetype,'balanced','new players should get the canonical no-modifier archetype');
assert.equal(defaults.setup.challenge,'generalist','guided mastery should remain the default challenge');
assert.deepEqual(defaults.setup,defaults.canonical,'persisted first-run defaults should match the canonical declaration');
assert.equal(defaults.balanced.cash,1);assert.equal(defaults.balanced.compute,1);assert.equal(defaults.balanced.research,0);assert.equal(defaults.balanced.reputation,0);
assert.equal(defaults.archetypes,5,'Item 11 should expose canonical plus four specialized lab archetypes');
assert((await page.getByRole('button',{name:/Balanced Lab/}).getAttribute('class')||'').includes('selected'),'Balanced Lab should be visibly selected for a fresh player');

await page.getByRole('button',{name:/Redline/}).click();
await page.getByRole('button',{name:/Systems Lab/}).click();
await page.getByRole('button',{name:/Scale Race/}).click();
await page.getByRole('button',{name:/Found the lab/i}).click();
await page.waitForTimeout(120);await dismissStory(page);

const configured=await page.evaluate(()=>({report:replayReport(),cash:state.cashM,compute:state.compute,physics:trainingPhysics(MODEL_TIERS[0])}));
assert.equal(configured.report.run.difficulty,'redline');
assert.equal(configured.report.run.archetype,'systems');
assert.equal(configured.report.run.challenge,'scale');
assert.equal(configured.report.progress.deadline,96,'Redline Scale Race should use the explicit 80% deadline');
assert(Math.abs(configured.cash-1.71)<.01,'difficulty × archetype should deterministically set starting cash');
assert.equal(configured.compute,16875,'difficulty × systems archetype should deterministically set starting compute');
assert.equal(configured.physics.flopsMethod,'6 × parameters × tokens','difficulty must not change technical training math');
assert(await page.locator('.replay-hud').isVisible(),'active run challenge should remain visible during play');
assert((await page.evaluate(()=>REALISM_AUDIT.some(x=>x.domain==='Replay difficulty / archetypes'&&x.status==='game'))),'replay values should register as game abstractions in the realism audit');

const funding=await page.evaluate(()=>{
  const before={cash:state.cashM,compute:state.compute};state.reputation=2;checkFunding();
  return {cash:Number((state.cashM-before.cash).toFixed(2)),compute:state.compute-before.compute,claims:[...(state.fundingClaimed||[])],feed:(state.feed||[]).slice(0,8)};
});
assert(funding.claims.includes('seed'),'seed funding should unlock at the canonical technical milestone');
assert.equal(funding.cash,2.4,'Redline should receive 80% of the canonical $3M seed round');
assert.equal(funding.compute,16000,'Redline should receive 80% of the canonical 20,000 H100h seed grant');
assert(funding.feed.some(x=>/Seed round closed \(Redline\): \+\$2\.4M/.test(x)),'funding log should report the scaled payout actually received');
assert(!funding.feed.some(x=>/Seed round closed: \+\$3M/.test(x)),'funding log must not claim the unscaled canonical payout');

const wrong=await page.evaluate(()=>{
  state.activeRun={name:'PENALTY-TEST',tier:'350m',progress:35,phase:'pretraining',physics:trainingPhysics(MODEL_TIERS[0]),startedDay:state.day,loss:2.5,incident:'nan'};state.selectedIncident='nan';
  const before={day:state.day,cash:state.cashM};solveIncident('lr');const result={days:state.day-before.day,cashLoss:Number((before.cash-state.cashM).toFixed(3)),wrong:state.balancePacing?.stats?.wrongIncidentChoices||0,feed:(state.feed||[]).slice(0,6)};
  state.activeRun=null;state.selectedIncident=null;if(state.balancePacing)state.balancePacing.lastEconomicDay=state.day;save();render();return result;
});
assert.equal(wrong.days,3,'Redline wrong diagnosis should add two difficulty days on top of the base one-day consequence');
assert(wrong.cashLoss>=.18,'Redline wrong diagnosis should cost at least the explicit $0.18M difficulty penalty');
assert.equal(wrong.wrong,1,'wrong diagnosis should still feed canonical balance telemetry');
assert(wrong.feed.some(x=>/Difficulty consequence: wrong diagnosis cost 2d and \$0\.18M/.test(x)),'difficulty consequence should be visible in company history');

await dismissStory(page);await page.locator('.replay-hud').click();await page.waitForTimeout(50);
assert(await page.getByRole('heading',{name:'Run Archive'}).isVisible(),'run archive should open');
assert(/80 core combinations/.test(await page.locator('.replay-card').last().textContent()),'archive should report the five-archetype replay matrix');
await page.getByRole('button',{name:/Return to company/i}).click();await page.waitForTimeout(50);

await page.evaluate(()=>{
  state.day=60;
  state.models.push({id:'test-30b',name:'TEST-30B',tier:'30B Dense',paramsB:30,day:60,architecture:{type:'Dense Transformer',parametersB:30,activeParametersB:30,contextLength:8192,precision:'BF16 mixed'},training:{status:'completed',startedDay:20,completedDay:60,config:{},history:[]},checkpoints:[],evals:[],experiments:[],postTraining:[],launches:[],incidents:[],costs:{trainingM:6.5,simulatedH100h:1},capabilities:{},weaknesses:[],technicalDebt:[],discoveries:[]});
  save();render();
});
await page.waitForTimeout(120);
const cleared=await page.evaluate(()=>replayReport());
assert.equal(cleared.run.completed,true,'challenge completion should be detected from real simulator state');
assert.equal(cleared.run.medal,'gold','Day 60 of a Day 96 challenge should earn gold');
assert.equal(cleared.career.completedRuns,1,'career archive should persist completed run');
assert(cleared.career.points>=2,'Redline gold clear should award career points');

// Start a fresh company in-memory while preserving the separate career archive.
await page.evaluate(()=>{localStorage.removeItem('frontier-lab-v3');state=fresh();render()});
await page.waitForTimeout(120);
assert(await page.locator('.replay-founder').isVisible(),'new run should return to founder setup');
assert(await page.getByText('New Game+ legacy perk').isVisible(),'a completed run should unlock New Game+ perk selection');
const careerText=await page.locator('.replay-founder-head em').textContent();
assert(/1 career clear/.test(careerText),'career archive must survive company-save reset');

const lateCtx=await browser.newContext({viewport:{width:1280,height:1000}});
const late=await lateCtx.newPage();const lateErrors=[];late.on('pageerror',e=>lateErrors.push(e.message));
await late.goto(url,{waitUntil:'networkidle'});
await late.getByRole('button',{name:/Redline/}).click();
await late.getByRole('button',{name:/Scale Race/}).click();
await late.getByRole('button',{name:/Found the lab/i}).click();await late.waitForTimeout(80);
await late.evaluate(()=>{
  state.day=97;
  state.models.push({id:'late-30b',name:'LATE-30B',tier:'30B Dense',paramsB:30,day:97,architecture:{type:'Dense Transformer',parametersB:30,activeParametersB:30,contextLength:8192,precision:'BF16 mixed'},training:{status:'completed',startedDay:90,completedDay:97,config:{},history:[]},checkpoints:[],evals:[],experiments:[],postTraining:[],launches:[],incidents:[],costs:{trainingM:6.5,simulatedH100h:1},capabilities:{},weaknesses:[],technicalDebt:[],discoveries:[]});
  save();render();
});
await late.waitForTimeout(100);
const expired=await late.evaluate(()=>replayReport());
assert.equal(expired.progress.failed,true,'deadline should be marked missed');
assert.equal(expired.progress.success,false,'late technical completion must not count as challenge success');
assert.equal(expired.run.completed,false,'late completion must not award a career clear');
assert.equal(lateErrors.length,0,`late-run runtime errors: ${lateErrors.join(' | ')}`);
await lateCtx.close();

assert.equal(errors.length,0,`runtime errors: ${errors.join(' | ')}`);
await browser.close();
console.log('Replayability and difficulty tests passed');