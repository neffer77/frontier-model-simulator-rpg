import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(file,'utf8');
const policy=JSON.parse(read('release-gate-policy.json'));
const pkg=JSON.parse(read('package.json'));
const inventory=JSON.parse(read('visual-qa/inventory.json'));
const matrix=JSON.parse(read('visual-qa/responsive-matrix.json'));
const baseline=JSON.parse(read('visual-qa/screenshot-baseline.json'));
const runner=read('tests/release-gate.mjs');
const workflow=read('.github/workflows/browser-qa.yml');

assert.equal(policy.version,1,'release gate policy version must be 1');
assert.equal(policy.item,'13.16','release gate policy must belong to Item 13.16');
assert.equal(inventory.screens.length,38,'release gate expects the canonical 38-screen inventory');
assert.equal(matrix.viewports.length,5,'release gate expects the canonical five responsive viewports');
assert.equal(inventory.screens.length*matrix.viewports.length,190,'route crawl release contract must remain 190 visits');
assert.equal(policy.semanticEvidence?.routeCrawl?.expectedVisits,190,'release gate route semantic policy drifted');
assert.equal(policy.semanticEvidence?.screenshotRegression?.expectedCaptureCount,255,'release gate screenshot semantic policy drifted');
assert(['active','bootstrap-pending'].includes(baseline.status),'screenshot baseline must use an understood lifecycle status');

const gateById=new Map((policy.gates||[]).map(g=>[g.id,g]));
const blockerIds=['static-contracts','production-build','browser-smoke','balance-pacing','technical-realism','replayability','browser-firewall','shared-surfaces','progressive-disclosure','shared-controls','company-dashboard','page-visual-sweep','empty-states','locked-states','overlay-system','accessibility','responsive','route-crawl','release-candidate','screenshot-regression'];
for(const id of blockerIds){const gate=gateById.get(id);assert(gate,`missing release blocker gate ${id}`);assert.equal(gate.severity,'blocker',`${id} must remain a blocker`);assert(pkg.scripts[gate.script],`${id} references missing npm script ${gate.script}`);}
const visual=gateById.get('visual-inventory');assert(visual,'visual inventory advisory gate missing');assert.equal(visual.severity,'advisory','visual inventory must remain advisory evidence');
assert.equal(visual.evidence,'artifacts/visual-inventory/report.json','visual inventory evidence path drifted');
assert.equal(gateById.get('route-crawl').evidence,'artifacts/route-crawl/report.json','route crawl evidence path drifted');
assert.equal(gateById.get('screenshot-regression').evidence,'artifacts/screenshot-regression/report.json','screenshot regression evidence path drifted');

for(const marker of ['releaseDecision','gate-command-failed','required-evidence-missing','screenshot-baseline-inactive','route-crawl-failures','route-crawl-warnings','manual-check','spawnSync','python3','_site'])assert(runner.includes(marker),`release gate runner missing ${marker}`);
assert(runner.includes("phase==='preflight'")&&runner.includes("phase==='build'")&&runner.includes("phase==='browser'"),'release gate must preserve preflight/build/browser phases');
assert(runner.includes('finally')&&runner.includes('writeReport()'),'release gate must write its decision even when a gate throws');

assert.equal(pkg.scripts['test:release-gate'],'node tests/release-gate.mjs','test:release-gate must invoke the canonical orchestrator');
assert.equal(pkg.scripts['test:rc'],'node tests/release-gate.mjs','test:rc must resolve to the canonical Item 13.16 orchestrator');
assert(pkg.scripts['test:static'].includes('tests/release-gate-static.mjs'),'release gate static contract must be in test:static');

assert(workflow.includes('npm run test:rc'),'browser QA must execute the canonical release gate');
assert(!/\n\s*run:\s*npm run test:static\s*\n/.test(workflow),'workflow must not fail early on a standalone static step before the evidence orchestrator');
for(const artifact of ['artifacts/release-gate','artifacts/route-crawl','artifacts/screenshot-regression','artifacts/visual-inventory'])assert(workflow.includes(artifact),`workflow must preserve ${artifact}`);
assert(workflow.includes('if: always()'),'release evidence uploads must survive failed gates');

console.log(JSON.stringify({releaseGateStatic:'pass',blockers:blockerIds.length,advisoryGates:(policy.gates||[]).filter(g=>g.severity==='advisory').length,routeVisits:190,screenshotCaptures:255,baselineStatus:baseline.status},null,2));
