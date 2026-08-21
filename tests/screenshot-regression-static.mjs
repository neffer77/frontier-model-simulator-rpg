import fs from 'node:fs';
import assert from 'node:assert/strict';

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const inventory=JSON.parse(fs.readFileSync('visual-qa/inventory.json','utf8'));
const matrix=JSON.parse(fs.readFileSync('visual-qa/responsive-matrix.json','utf8'));
const baseline=JSON.parse(fs.readFileSync('visual-qa/screenshot-baseline.json','utf8'));
const policy=JSON.parse(fs.readFileSync('release-gate-policy.json','utf8'));
const harness=fs.readFileSync('tests/screenshot-regression.mjs','utf8');
const workflow=fs.readFileSync('.github/workflows/browser-qa.yml','utf8');
const autoSpecials=inventory.specialCaptures.filter(x=>!x.manual);
const expected=(inventory.screens.length+autoSpecials.length)*matrix.viewports.length;

assert.equal(baseline.item,'13.14','baseline must belong to Item 13.14');
assert.equal(baseline.inventoryVersion,inventory.version,'baseline inventory version drifted');
assert.equal(baseline.responsiveMatrixVersion,matrix.version,'baseline responsive matrix version drifted');
assert.equal(baseline.expectedCaptureCount,expected,`baseline expectedCaptureCount must be ${expected}`);
assert(['bootstrap-pending','active'].includes(baseline.status),'baseline status must be bootstrap-pending or active');
assert.equal(matrix.viewports.length,5,'Item 13.14 expects the five canonical responsive modes');
assert.equal(inventory.screens.length,38,'Item 13.14 route baseline should cover the Item 13.1 38-screen inventory');
assert.equal(autoSpecials.length,13,'Item 13.14 should cover every non-manual Item 13.1 special capture');

for(const needle of ['page.screenshot','sha256','responsive-matrix.json','inventory.json','deviceScaleFactor:1','timezoneId:\'UTC\'','--update','candidate-baseline.json'])assert(harness.includes(needle),`screenshot harness missing deterministic contract: ${needle}`);
assert(harness.includes('matrix.viewports'),'harness must consume the shared viewport matrix');
assert((harness.match(/frontierCompanyDashboardSync/g)||[]).length>=3,'screenshot harness must synchronously converge Company dashboard + locked-state ownership before capture');
assert(harness.includes('window.frontierCompanyDashboardSync?.();\n    window.frontierLockedStateSync?.();\n    window.frontierCompanyDashboardSync?.();\n    window.frontierLockedStateSync?.();'),'Company screenshot synchronization order must remain dashboard → locked → dashboard → locked');

assert.equal(pkg.scripts['test:screenshots'],'node tests/screenshot-regression.mjs','test:screenshots script missing');
assert.equal(pkg.scripts['visual:screenshot-baseline'],'node tests/screenshot-regression.mjs --update','baseline update script missing');
assert.equal(pkg.scripts['test:screenshots-static'],'node tests/screenshot-regression-static.mjs','screenshot static script missing');
assert(pkg.scripts['test:static'].includes('screenshot-regression-static.mjs'),'test:static must include screenshot regression static validation');
const screenshotGate=(policy.gates||[]).find(g=>g.id==='screenshot-regression');
assert(screenshotGate,'Item 13.16 screenshot release gate missing');
assert.equal(screenshotGate.script,'test:screenshots','Item 13.16 must execute test:screenshots');
assert.equal(screenshotGate.severity,'blocker','screenshot regression must remain a release blocker');
assert.equal(pkg.scripts['test:rc'],'node tests/release-gate.mjs','test:rc must route through Item 13.16');
assert(workflow.includes('npm run test:rc'),'browser QA workflow must execute the canonical release gate');
assert(workflow.includes('artifacts/screenshot-regression'),'browser QA workflow must upload screenshot regression artifacts');

const captures=baseline.captures||{};
if(baseline.status==='bootstrap-pending')assert.equal(Object.keys(captures).length,0,'bootstrap-pending baseline should not contain partial hashes');
if(baseline.status==='active'){
  assert.equal(Object.keys(captures).length,expected,`active baseline must contain ${expected} captures`);
  for(const viewport of matrix.viewports){
    for(const screen of inventory.screens){const key=`${viewport.id}/route-${screen.id}`;assert(captures[key],`active baseline missing ${key}`)}
    for(const item of autoSpecials){const key=`${viewport.id}/${item.id}`;assert(captures[key],`active baseline missing ${key}`)}
  }
  for(const [key,row] of Object.entries(captures)){
    assert(/^[a-f0-9]{64}$/.test(row.sha256||''),`${key}: invalid SHA-256`);
    assert(Number(row.width)>0&&Number(row.height)>0,`${key}: invalid PNG dimensions`);
  }
}

console.log(`Screenshot regression static contract passed: ${inventory.screens.length} routes + ${autoSpecials.length} special captures × ${matrix.viewports.length} viewports = ${expected} screenshots`);
