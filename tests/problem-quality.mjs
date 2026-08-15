import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../problem-quality.js',import.meta.url),'utf8');
const context=vm.createContext({state:{day:1,diagnosticMastery:{}},console});
vm.runInContext(source,context);

const incident={id:'nan',term:'GRAD'};
const hardCase={decisive:['metrics','data'],tools:{metrics:{cost:0},data:{cost:12}}};
const clean={hints:0,falseMoves:0};
const hinted={hints:1,falseMoves:0};

const first=context.problemQualityPreview(incident,hardCase,clean,'S');
assert.equal(first.novel,true);
assert.ok(first.multiplier>1,'new weak clean solve should receive a bonus');
assert.ok(first.reasons.includes('new problem'));
assert.ok(first.reasons.includes('weak concept bonus'));
assert.ok(first.reasons.includes('no-hint bonus'));
assert.ok(first.reasons.includes('clean-solve bonus'));
assert.ok(first.reasons.includes('appropriate difficulty'));

const hintedPreview=context.problemQualityPreview(incident,hardCase,hinted,'A');
assert.ok(hintedPreview.multiplier<first.multiplier,'using a hint should reduce learning value');

const firstRewards=context.problemQualityRewards(3,'S',first);
context.state.diagnosticMastery.GRAD=firstRewards.mastery;
context.recordProblemQualitySolve(incident,clean,'S',first,firstRewards);
const second=context.problemQualityPreview(incident,hardCase,clean,'S');
assert.ok(second.multiplier<first.multiplier,'repeat solve should have diminishing returns');

for(let i=0;i<2;i++){
  const preview=context.problemQualityPreview(incident,hardCase,clean,'S');
  const rewards=context.problemQualityRewards(3,'S',preview);
  context.state.diagnosticMastery.GRAD+=rewards.mastery;
  context.recordProblemQualitySolve(incident,clean,'S',preview,rewards);
}
const fourth=context.problemQualityPreview(incident,hardCase,clean,'S');
assert.equal(fourth.protectedSolve,true,'fourth successful repeat should be anti-farm protected');
assert.deepEqual(context.problemQualityRewards(3,'S',fourth),{mastery:0,research:0,reputation:0,baseMastery:3,baseResearch:2,baseReputation:3});

const before=context.state.diagnosticMastery.GRAD;
context.recordProblemQualityFailure(incident,{hints:0,falseMoves:1});
assert.equal(context.state.diagnosticMastery.GRAD,before,'incorrect action must not grant mastery');
assert.equal(context.problemQualitySummary().uniqueProblems,1);
assert.ok(context.problemQualitySummary().protectedSolves>=0);

console.log('P2-K problem quality checks passed');
