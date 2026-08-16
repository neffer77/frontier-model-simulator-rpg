import fs from 'node:fs';
import assert from 'node:assert/strict';

const identity=fs.readFileSync('state-identity.js','utf8');
const build=fs.readFileSync('frontier-build.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const buildSite=fs.readFileSync('scripts/build-site.mjs','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const policy=JSON.parse(fs.readFileSync('release-gate-policy.json','utf8'));
const pages=fs.readFileSync('.github/workflows/pages.yml','utf8');
const browserQa=fs.readFileSync('.github/workflows/browser-qa.yml','utf8');
const browserTest=fs.readFileSync('tests/state-identity.mjs','utf8');

for(const marker of [
  "SAVE_KEY='frontier-lab-v3'",
  'stateRevision',
  'sessionId',
  'lastMutationAt',
  'lastMutation',
  'frontierDiagnostics',
  'frontierDiagnosticsText',
  'frontierStateEnvelope',
  'frontierSessionIdentity',
  'frontierDeviceMode',
  "'phone-portrait'",
  "'phone-landscape'",
  "'tablet'",
  "'desktop'",
  "'wide-desktop'",
  'frontier:state-saved'
])assert(identity.includes(marker),`identity runtime missing contract ${marker}`);

assert(identity.includes('Math.max(candidateRevision,priorRevision)+1'),'state revisions must monotonically advance from persisted history');
assert(identity.includes("candidate._frontier={"),'identity metadata must decorate the saved state envelope');
assert(!identity.includes('localStorage.clear()'),'identity runtime must never destroy saves');
assert(build.includes("buildId:'local'"),'source build fallback must identify local development');

const buildPos=html.indexOf('frontier-build.js');
const identityPos=html.indexOf('state-identity.js');
const simulatorPos=html.indexOf('frontier-lab.js');
assert(buildPos>=0&&identityPos>buildPos&&simulatorPos>identityPos,'build + identity runtime must load before simulator state initializes');

assert(buildSite.includes('frontier-build.js'),'production build must emit runtime build identity');
assert(buildSite.includes('GITHUB_SHA'),'production build identity must consume the GitHub commit SHA');
assert(buildSite.includes('buildId'),'production build identity must expose a short build ID');
assert(sw.includes('./frontier-build.js'),'PWA must cache runtime build identity');
assert(sw.includes('./state-identity.js'),'PWA must cache state identity runtime');

assert.equal(pkg.scripts['test:identity'],'node tests/state-identity.mjs','identity browser script missing');
assert.equal(pkg.scripts['test:identity-static'],'node tests/state-identity-static.mjs','identity static script missing');
assert(pkg.scripts['test:static'].includes('state-identity-static.mjs'),'identity static contract must be cumulative');
assert(pkg.scripts['test:qa'].includes('state-identity.mjs'),'identity browser regression must be cumulative');

const gate=policy.gates.find(x=>x.id==='runtime-identity');
assert(gate,'release policy missing runtime-identity gate');
assert.equal(gate.severity,'blocker','runtime identity must be release blocking');
assert.equal(gate.script,'test:identity','runtime identity gate must invoke test:identity');

for(const marker of ['_site/frontier-build.js','_site/state-identity.js','runtime identity verified'])assert(pages.includes(marker),`Pages deployment missing identity verification: ${marker}`);
for(const marker of ['artifacts/state-identity','state-identity-${{ github.event.pull_request.number || github.run_number }}','Publish P5.0.1 runtime identity evidence'])assert(browserQa.includes(marker),`browser QA missing identity evidence contract: ${marker}`);
for(const marker of ['artifacts/state-identity','report.json','REPORT.md','legacy-save-migrated','phone-landscape','wide-desktop'])assert(browserTest.includes(marker),`identity browser test missing evidence case: ${marker}`);

console.log(JSON.stringify({stateIdentityStatic:'pass',identitySchema:1,releaseBlocker:true,evidenceArtifact:true,liveDeployVerification:true},null,2));
