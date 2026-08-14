import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(url,{waitUntil:'networkidle'});

assert(await page.locator('.replay-founder').isVisible(),'fresh founder screen should expose run configuration');
assert.equal(await page.locator('.replay-choice-grid').count()>=3,true,'difficulty, archetype, and challenge choices should render');
await page.getByRole('button',{name:/Redline/}).click();
await page.getByRole('button',{name:/Systems Lab/}).click();
await page.getByRole('button',{name:/Scale Race/}).click();
await page.getByRole('button',{name:/Found the lab/i}).click();
await page.waitForTimeout(120);
for(let i=0;i<8&&await page.locator('.story-overlay').count();i++){const next=page.locator('.story-overlay button.primary');if(await next.count())await next.click();else break;await page.waitForTimeout(25)}

const configured=await page.evaluate(()=>({report:replayReport(),cash:state.cashM,compute:state.compute,physics:trainingPhysics(MODEL_TIERS[0])}));
assert.equal(configured.report.run.difficulty,'redline');
assert.equal(configured.report.run.archetype,'systems');
assert.equal(configured.report.run.challenge,'scale');
assert.equal(configured.report.progress.deadline,96,'Redline Scale Race should use the explicit 80% deadline');
assert(Math.abs(configured.cash-1.71)<.01,'difficulty × archetype should deterministically set starting cash');
assert.equal(configured.compute,16875,'difficulty × systems archetype should deterministically set starting compute');
assert.equal(configured.physics.flopsMethod,'6 × parameters × tokens','difficulty must not change technical training math');
assert(await page.locator('.replay-hud').isVisible(),'active run challenge should remain visible during play');

await page.locator('.replay-hud').click();await page.waitForTimeout(50);
assert(await page.getByRole('heading',{name:'Run Archive'}).isVisible(),'run archive should open');
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

await page.evaluate(()=>localStorage.removeItem('frontier-lab-v3'));
await page.reload({waitUntil:'networkidle'});await page.waitForTimeout(80);
assert(await page.locator('.replay-founder').isVisible(),'new run should return to founder setup');
assert(await page.getByText('New Game+ legacy perk').isVisible(),'a completed run should unlock New Game+ perk selection');
const careerText=await page.locator('.replay-founder-head em').textContent();
assert(/1 career clear/.test(careerText),'career archive must survive company-save reset');

assert.equal(errors.length,0,`runtime errors: ${errors.join(' | ')}`);
await browser.close();
console.log('Replayability and difficulty tests passed');
