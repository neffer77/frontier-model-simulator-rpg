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

const gates=policy.gates||[];
const ids=gates.map(g=>g.id);
assert.equal(new Set(ids).size,ids.length,'release gate IDs must be unique');
for(const gate of gates){
  assert(['blocker','advisory'].includes(gate.severity),`${gate.id}: invalid severity ${gate.severity}`);
  assert(['preflight','build','browser'].includes(gate.phase),`${gate.id}: invalid phase ${gate.phase}`);
  assert(pkg.scripts[gate.script],`${gate.id}: references missing npm script ${gate.script}`);
}
assert.equal(gates.filter(g=>g.phase==='build').length,1,'release gate must have exactly one production build gate');

const gateById=new Map(gates.map(g=>[g.id,g]));
const blockerIds=['static-contracts','production-build','runtime-identity','command-event-bus','browser-smoke','balance-pacing','technical-realism','replayability','browser-firewall','shared-surfaces','progressive-disclosure','shared-controls','company-dashboard','page-visual-sweep','empty-states','locked-states','overlay-system','accessibility','responsive','npc-advice-workstation','route-crawl','release-candidate','screenshot-regression'];
for(const id of blockerIds){const gate=gateById.get(id);assert(gate,`missing release blocker gate ${id}`);assert.equal(gate.severity,'blocker',`${id} must remain a blocker`);}
const visual=gateById.get('visual-inventory');assert(visual,'visual inventory advisory gate missing');assert.equal(visual.severity,'advisory','visual inventory must remain advisory evidence');
assert.equal(visual.evidence,'artifacts/visual-inventory/report.json','visual inventory evidence path drifted');
assert.equal(gateById.get('route-crawl').evidence,'artifacts/route-crawl/report.json','route crawl evidence path drifted');
assert.equal(gateById.get('screenshot-regression').evidence,'artifacts/screenshot-regression/report.json','screenshot regression evidence path drifted');
assert.equal(gateById.get('npc-advice-workstation').script,'test:npc-advice','NPC advice gate must run the exact workstation-return flow');
assert.equal(gateById.get('runtime-identity').script,'test:identity','FrontierOS runtime identity must remain release blocking');
assert.equal(gateById.get('runtime-identity').evidence,'artifacts/state-identity/report.json','runtime identity evidence path drifted');
assert.equal(gateById.get('command-event-bus').script,'test:command-bus','FrontierOS command event bus must remain release blocking');
assert.equal(gateById.get('command-event-bus').evidence,'artifacts/command-event-bus/report.json','command event bus evidence path drifted');

for(const marker of ['releaseDecision','gate-command-failed','required-evidence-missing','screenshot-baseline-inactive','screenshot-report-invalid','route-report-invalid','visual-inventory-report-invalid','route-crawl-failures','route-crawl-warnings','manual-check','spawnSync','python3','_site','githubSha'])assert(runner.includes(marker),`release gate runner missing ${marker}`);
assert(runner.includes("phase==='preflight'")&&runner.includes("phase==='build'")&&runner.includes("phase==='browser'"),'release gate must preserve preflight/build/browser phases');
assert(runner.includes('finally')&&runner.includes('writeReport()'),'release gate must write its decision even when a gate throws');
assert(runner.includes("path.join(outRoot,'REPORT.md')"),'release gate must emit a human-readable decision report');
assert(runner.includes("summary.item!=='13.14'")&&runner.includes("summary.item!=='13.15'"),'semantic evidence must validate the screenshot/route report contracts');

assert.equal(pkg.scripts['test:release-gate'],'node tests/release-gate.mjs','test:release-gate must invoke the canonical orchestrator');
assert.equal(pkg.scripts['test:rc'],'node tests/release-gate.mjs','test:rc must resolve to the canonical Item 13.16 orchestrator');
assert(pkg.scripts['test:static'].includes('tests/release-gate-static.mjs'),'release gate static contract must be in test:static');

assert(workflow.includes('npm run test:rc'),'browser QA must execute the canonical release gate');
assert(!/\n\s*run:\s*npm run test:static\s*\n/.test(workflow),'workflow must not fail early on a standalone static step before the evidence orchestrator');
for(const artifact of ['artifacts/release-gate','artifacts/state-identity','artifacts/command-event-bus','artifacts/route-crawl','artifacts/screenshot-regression','artifacts/visual-inventory'])assert(workflow.includes(artifact),`workflow must preserve ${artifact}`);
assert(workflow.includes('if: always()'),'release evidence uploads must survive failed gates');
assert(workflow.includes('Publish Item 13.16 release decision'),'workflow must surface the release decision without requiring artifact download');
assert(workflow.includes('artifacts/release-gate/REPORT.md'),'workflow summary must publish the canonical Markdown report');
assert(workflow.includes('GITHUB_STEP_SUMMARY'),'workflow must write the release decision to the GitHub Actions job summary');
assert(/push:\s*\n\s*branches:\s*\n\s*- main/.test(workflow),'canonical release gate must rerun on pushes to main');

console.log(JSON.stringify({releaseGateStatic:'pass',blockers:blockerIds.length,advisoryGates:gates.filter(g=>g.severity==='advisory').length,routeVisits:190,screenshotCaptures:255,baselineStatus:baseline.status},null,2));
