import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const inventory=JSON.parse(fs.readFileSync('visual-qa/inventory.json','utf8'));
const matrix=JSON.parse(fs.readFileSync('visual-qa/responsive-matrix.json','utf8'));
const policy=JSON.parse(fs.readFileSync('release-gate-policy.json','utf8'));
const promotion=fs.readFileSync('scripts/promote-screenshot-baseline.mjs','utf8');
const signoff=fs.readFileSync('tests/release-signoff.mjs','utf8');
const workflow=fs.readFileSync('.github/workflows/browser-qa.yml','utf8');
const autoSpecials=inventory.specialCaptures.filter(x=>!x.manual);
const expected=(inventory.screens.length+autoSpecials.length)*matrix.viewports.length;

assert.equal(expected,255,'Item 13.17 baseline promotion must retain the canonical 255 screenshot contract');
assert.equal(policy.semanticEvidence?.routeCrawl?.expectedVisits,190,'Item 13.17 signoff must inherit the canonical 190 route contract');
assert.equal(policy.semanticEvidence?.screenshotRegression?.expectedCaptureCount,255,'Item 13.17 signoff must inherit the canonical 255 screenshot policy');

for(const marker of [
  '--reviewed',
  'SCREENSHOT_BASELINE_REVIEWED',
  'candidate-baseline.json',
  'candidateSha256',
  "candidate.status==='active'",
  'expectedKeys',
  '/^[a-f0-9]{64}$/',
  "promotion:{",
  "item:'13.17'",
  'reviewed:true'
])assert(promotion.includes(marker),`baseline promotion missing safety contract: ${marker}`);
assert(promotion.includes('process.exit(2)'),'promotion must fail closed when review/candidate prerequisites are absent');
assert(promotion.includes('actualKeys.length===expectedCount'),'promotion must reject partial candidate baselines');
assert(!promotion.includes("SCREENSHOT_BASELINE_REVIEWED!=='0'"),'review acknowledgement must never default to approved');

for(const marker of [
  'artifacts/release-gate/report.json',
  'release-gate-policy.json',
  'visual-qa/screenshot-baseline.json',
  '_site/build-info.json',
  "gate.releaseDecision!=='pass'",
  "baseline.status!=='active'",
  'route-evidence-not-clean',
  'screenshot-evidence-not-clean',
  'releaseGateReportSha256',
  'releasePolicySha256',
  'screenshotBaselineSha256',
  'buildInfoSha256',
  "item:'13.17'"
])assert(signoff.includes(marker),`release signoff missing evidence contract: ${marker}`);
assert(signoff.includes("decision:issues.length?'block':'ready'"),'signoff must fail closed when any blocking issue exists');
assert(signoff.includes("if(receipt.decision!=='ready')process.exit(1)"),'blocked signoff must return non-zero');

assert.equal(pkg.scripts['visual:promote-screenshot-baseline'],'node scripts/promote-screenshot-baseline.mjs','reviewed baseline promotion script missing');
assert.equal(pkg.scripts['test:signoff'],'node tests/release-signoff.mjs','release signoff script missing');
assert.equal(pkg.scripts['test:signoff-static'],'node tests/release-signoff-static.mjs','release signoff static script missing');
assert(pkg.scripts['test:static'].includes('release-signoff-static.mjs'),'Item 13.17 static contract must be part of test:static');

assert(workflow.includes('npm run test:signoff'),'browser QA workflow must generate Item 13.17 signoff');
assert(workflow.includes('if: always()'),'signoff/evidence publication must survive a blocked 13.16 gate');
assert(workflow.includes('artifacts/release-signoff'),'workflow must upload Item 13.17 signoff artifact');
assert(workflow.includes('Item 13.17 release sign-off'),'workflow must publish the Item 13.17 decision');

// Behavioral contract: a complete reviewed candidate validates, review omission fails,
// and removing one canonical capture fails. Dry-run guarantees this test never mutates
// the committed baseline.
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'frontier-13-17-'));
try{
  const captures={};
  for(const viewport of matrix.viewports){
    for(const screen of inventory.screens)captures[`${viewport.id}/route-${screen.id}`]={sha256:'a'.repeat(64),width:viewport.width,height:viewport.height,bytes:1234,label:screen.label};
    for(const special of autoSpecials)captures[`${viewport.id}/${special.id}`]={sha256:'b'.repeat(64),width:viewport.width,height:viewport.height,bytes:1234,label:special.label};
  }
  const candidate={
    version:1,item:'13.14',status:'active',inventoryVersion:inventory.version,responsiveMatrixVersion:matrix.version,
    playwrightVersion:pkg.devDependencies?.playwright,expectedCaptureCount:expected,generatedAt:'2026-08-15T00:00:00.000Z',capturePolicy:{},captures
  };
  const full=path.join(tmp,'candidate.json');fs.writeFileSync(full,JSON.stringify(candidate));
  const ok=spawnSync(process.execPath,['scripts/promote-screenshot-baseline.mjs',full,'--reviewed','--dry-run'],{encoding:'utf8'});
  assert.equal(ok.status,0,`complete reviewed candidate should validate: ${ok.stderr||ok.stdout}`);

  const unreviewed=spawnSync(process.execPath,['scripts/promote-screenshot-baseline.mjs',full,'--dry-run'],{encoding:'utf8'});
  assert.notEqual(unreviewed.status,0,'promotion must reject a candidate without explicit review acknowledgement');

  const partial=structuredClone(candidate);delete partial.captures[Object.keys(partial.captures)[0]];
  const partialPath=path.join(tmp,'partial.json');fs.writeFileSync(partialPath,JSON.stringify(partial));
  const rejected=spawnSync(process.execPath,['scripts/promote-screenshot-baseline.mjs',partialPath,'--reviewed','--dry-run'],{encoding:'utf8'});
  assert.notEqual(rejected.status,0,'promotion must reject a partial 254-capture candidate');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}

console.log(JSON.stringify({releaseSignoffStatic:'pass',screenshots:expected,routes:190,promotionBehavior:'pass'},null,2));
