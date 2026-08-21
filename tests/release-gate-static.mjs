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

assert.equal(policy.version,13,'release gate policy version must be 13 after P5.2.11 Company');
assert.equal(policy.item,'13.16');
assert.equal(inventory.screens.length,38);
assert.equal(matrix.viewports.length,5);
assert.equal(inventory.screens.length*matrix.viewports.length,190);
assert.equal(policy.semanticEvidence?.routeCrawl?.expectedVisits,190);
assert.equal(policy.semanticEvidence?.screenshotRegression?.expectedCaptureCount,255);
assert(['active','bootstrap-pending'].includes(baseline.status));

const gates=policy.gates||[];
const ids=gates.map(g=>g.id);
assert.equal(new Set(ids).size,ids.length,'release gate ids must be unique');
for(const gate of gates){
  assert(['blocker','advisory'].includes(gate.severity),`${gate.id}: invalid severity`);
  assert(['preflight','build','browser'].includes(gate.phase),`${gate.id}: invalid phase`);
  assert(['legacy',undefined].includes(gate.uiMode),`${gate.id}: invalid uiMode`);
  assert(pkg.scripts[gate.script],`${gate.id}: missing npm script ${gate.script}`);
  assert(Number.isFinite(gate.timeoutMs)&&gate.timeoutMs>=30000,`${gate.id}: invalid timeout`);
}
assert.equal(gates.filter(g=>g.phase==='build').length,1,'release policy must contain exactly one build gate');

const gateById=new Map(gates.map(g=>[g.id,g]));
const blockerIds=[
  'static-contracts','production-build','runtime-identity','command-event-bus','debug-bundle',
  'frontieros-app-registry','frontieros-mobile-home','frontieros-desktop-shell','frontieros-session',
  'frontieros-pager','frontieros-run-monitor','frontieros-evalbench','frontieros-model-lab','frontieros-data-explorer',
  'frontieros-terminal','frontieros-mail','frontieros-people','frontieros-projects','frontieros-finance','frontieros-company',
  'browser-smoke','balance-pacing','technical-realism','replayability','browser-firewall','shared-surfaces',
  'progressive-disclosure','shared-controls','company-dashboard','page-visual-sweep','empty-states','locked-states',
  'overlay-system','accessibility','responsive','npc-advice-workstation','route-crawl','release-candidate','screenshot-regression'
];
for(const id of blockerIds){
  const gate=gateById.get(id);
  assert(gate,`missing release blocker gate ${id}`);
  assert.equal(gate.severity,'blocker',`${id}: must remain blocker`);
}

const legacyIds=['browser-smoke','browser-firewall','shared-surfaces','progressive-disclosure','shared-controls','company-dashboard','page-visual-sweep','empty-states','locked-states','overlay-system','accessibility','responsive','npc-advice-workstation','route-crawl','screenshot-regression','visual-inventory'];
for(const id of legacyIds)assert.equal(gateById.get(id)?.uiMode,'legacy',`${id}: legacy UI mode drifted`);

const nativeIds=['frontieros-mobile-home','frontieros-desktop-shell','frontieros-session','frontieros-pager','frontieros-run-monitor','frontieros-evalbench','frontieros-model-lab','frontieros-data-explorer','frontieros-terminal','frontieros-mail','frontieros-people','frontieros-projects','frontieros-finance','frontieros-company'];
for(const id of nativeIds)assert.equal(gateById.get(id)?.uiMode,undefined,`${id}: native gate must use default FrontierOS mode`);

const evidence={
  'frontieros-terminal':'artifacts/terminal-frontieros/report.json',
  'frontieros-mail':'artifacts/frontier-mail/report.json',
  'frontieros-people':'artifacts/people-frontieros/report.json',
  'frontieros-projects':'artifacts/projects-frontieros/report.json',
  'frontieros-finance':'artifacts/finance-frontieros/report.json',
  'frontieros-company':'artifacts/company-frontieros/report.json'
};
for(const [id,file] of Object.entries(evidence))assert.equal(gateById.get(id)?.evidence,file,`${id}: evidence path drifted`);
for(const id of ['frontieros-session','frontieros-evalbench','frontieros-model-lab','frontieros-data-explorer','frontieros-terminal','frontieros-mail','frontieros-people','frontieros-projects','frontieros-finance','frontieros-company'])assert.equal(gateById.get(id)?.timeoutMs,90000,`${id}: timeout drifted`);

for(const marker of ['releaseDecision','gate-command-failed','gate-command-timeout','ETIMEDOUT','timeoutMs','required-evidence-missing','screenshot-baseline-inactive','screenshot-report-invalid','route-report-invalid','visual-inventory-report-invalid','route-crawl-failures','route-crawl-warnings','manual-check','spawnSync','python3','_site','githubSha','gateTestUrl','frontieros','FRONTIER_QA_UI_MODE'])assert(runner.includes(marker),`release gate runner missing ${marker}`);

for(const [script,file] of [
  ['test:terminal-os','node tests/terminal-frontieros.mjs'],
  ['test:mail-os','node tests/frontier-mail-frontieros.mjs'],
  ['test:people-os','node tests/people-frontieros.mjs'],
  ['test:projects-os','node tests/projects-frontieros.mjs'],
  ['test:finance-os','node tests/finance-frontieros.mjs'],
  ['test:company-os','node tests/company-frontieros.mjs']
])assert.equal(pkg.scripts[script],file,`${script}: package script drifted`);

assert(pkg.scripts['test:static'].includes('tests/release-gate-static.mjs'));
assert(workflow.includes('npm run test:rc'),'cross-device workflow must run canonical release gate');
assert(workflow.includes('path: artifacts'),'cross-device workflow must retain aggregate release evidence');
for(const marker of ['artifacts/release-gate','artifacts/route-crawl','artifacts/screenshot-regression','artifacts/visual-inventory','artifacts/company-frontieros'])assert(workflow.includes(marker),`workflow missing evidence marker ${marker}`);

console.log(JSON.stringify({releaseGateStatic:'pass',policyVersion:policy.version,blockers:blockerIds.length,companyTimeoutMs:gateById.get('frontieros-company').timeoutMs,routeVisits:190,screenshotCaptures:255,baselineStatus:baseline.status},null,2));