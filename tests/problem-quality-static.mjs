import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const index=read('index.html');
const launcher=read('Frontier Model Simulator.js');
const sw=read('sw.js');
const workstation=read('workstation.js');
const policy=read('problem-quality.js');

for(const [name,text] of [['index',index],['Scriptable launcher',launcher],['service worker',sw]]){
  assert.ok(text.includes('problem-quality.js'),`${name} must include problem-quality.js`);
}
assert.ok(index.indexOf('problem-quality.js')<index.indexOf('workstation.js'),'browser must load quality policy before workstation');
assert.ok(launcher.indexOf('problem-quality.js')<launcher.indexOf('workstation.js'),'Scriptable must load quality policy before workstation');
assert.ok(sw.includes("const CACHE='frontier-lab-v23'"),'PWA cache must be bumped for P2-K');
assert.ok(policy.includes('PROBLEM_QUALITY_REPEAT=[1,.72,.42,.20,.08]'),'repeat decay schedule must stay explicit');
assert.ok(policy.includes("if(quality.protectedSolve)return {mastery:0,research:0,reputation:0"),'protected repeats must grant no progression');
assert.ok(workstation.includes("recordProblemQualityFailure(inc,w)"),'failed production actions must enter anti-grind history');
assert.ok(!workstation.includes('state.knowledge[inc.term]=(state.knowledge[inc.term]||0)+1;'),'failed production actions must not grant knowledge');
assert.ok(workstation.includes('problemQualityPreview(inc,c,w,grade)'),'successful solves must use quality scoring');
assert.ok(workstation.includes('antiGrindProtected:quality.protectedSolve'),'run history must preserve anti-grind status');
console.log('P2-K static integration checks passed');
