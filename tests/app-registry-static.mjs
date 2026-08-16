import fs from 'node:fs';
import assert from 'node:assert/strict';

const registry=fs.readFileSync('frontier-app-registry.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const policy=JSON.parse(fs.readFileSync('release-gate-policy.json','utf8'));
const workflow=fs.readFileSync('.github/workflows/browser-qa.yml','utf8');

for(const marker of ['frontierAppRegistry','frontierApps','frontierApp','frontierResolveApp','frontierLaunchApp','frontierParseDeepLink','frontierOpenDeepLink','os.app-registry.ready','os.app.launch.started','os.app.launch.completed','os.app.launch.blocked','os.app.launch.failed'])assert(registry.includes(marker),`app registry missing ${marker}`);
for(const id of ['mail','pager','training','evals','model-lab','terminal','data','team','projects','company','finance','knowledge','artifacts','settings'])assert(registry.includes(`id:'${id}'`),`canonical app missing: ${id}`);
assert(registry.includes("status:'planned'"),'registry must support planned apps');
assert(registry.includes("launchState:app.status==='planned'?'planned':unlock.unlocked?'ready':'locked'"),'registry must expose ready/locked/planned launch states');
assert(registry.includes("frontieros://" )||registry.includes("frontieros:\\/\\/"),'FrontierOS URI contract missing');

const adaptersPos=html.indexOf('command-adapters.js');
const debugPos=html.indexOf('debug-bundle.js');
const registryPos=html.indexOf('frontier-app-registry.js');
assert(adaptersPos>=0&&debugPos>adaptersPos&&registryPos>debugPos,'app registry must load after commands + diagnostics are available');
assert(sw.includes("CACHE='frontier-lab-v31'"),'P5.1.1 must advance PWA cache to v31');
assert(sw.includes('./frontier-app-registry.js'),'PWA must cache the app registry');
assert.equal(pkg.scripts['test:app-registry'],'node tests/app-registry.mjs','app registry browser script missing');
assert.equal(pkg.scripts['test:app-registry-static'],'node tests/app-registry-static.mjs','app registry static script missing');
assert(pkg.scripts['test:static'].includes('tests/app-registry-static.mjs'),'app registry static test must be cumulative');
assert(pkg.scripts['test:qa'].includes('tests/app-registry.mjs'),'app registry browser test must be cumulative');

const gate=policy.gates.find(g=>g.id==='frontieros-app-registry');
assert(gate,'release policy missing FrontierOS app registry gate');
assert.equal(gate.severity,'blocker','app registry must be release blocking');
assert.equal(gate.script,'test:app-registry','app registry gate must invoke canonical browser test');
assert.equal(gate.evidence,'artifacts/app-registry/report.json','app registry evidence path drifted');
assert(workflow.includes('artifacts/app-registry'),'browser QA must retain app registry evidence');
assert(workflow.includes('P5.1.1 FrontierOS App Registry'),'browser QA must publish app registry summary');

console.log(JSON.stringify({appRegistryStatic:'pass',schemaVersion:1,apps:14,releaseBlocker:true},null,2));
