import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=f=>fs.readFileSync(f,'utf8');
const runtime=read('company-frontieros.js'),adapter=read('company-adapter.js'),command=read('company-command.js'),registry=read('frontier-app-registry.js'),html=read('index.html'),sw=read('sw.js'),launcher=read('Frontier Model Simulator.js'),pkg=JSON.parse(read('package.json')),policy=JSON.parse(read('release-gate-policy.json')),workflow=read('.github/workflows/browser-qa.yml');
for(const marker of ['frontierCompanyOpen','frontierCompanySetView','frontierCompanySnapshot','frontierCompanyUiAction','company.opened','company.rendered','overview','board','governance','restructuring','leadership','history'])assert(runtime.includes(marker),`Company runtime missing ${marker}`);
for(const marker of ['frontierCompanyDispatch','frontierCompanyDomainSnapshot','frontierCompanyHydrateLegacyState','frontierCompanyReconcileLegacyState','company.action.dispatched','board-plan','governance-vote','macro-shock','executive-align'])assert(adapter.includes(marker),`Company adapter missing ${marker}`);
assert(command.includes("frontierRegisterCommand('company.open'"),'native Company command missing');
assert(registry.includes("id:'company'")&&registry.includes("command:'company.open'"),'Company registry ownership must be native');
assert(!registry.includes("id:'company',label:'Company',shortLabel:'Company',icon:'⌂',category:'company',route:'os/company',aliases:['home','dashboard'],status:'ready',command:'navigation.home.open'"),'Company must not retain legacy navigation ownership');
for(const asset of ['company-frontieros.css','company-adapter.js','company-frontieros.js','company-command.js']){assert(html.includes(asset),`browser delivery missing ${asset}`);assert(sw.includes(`./${asset}`),`PWA delivery missing ${asset}`);assert(launcher.includes(asset),`Scriptable delivery missing ${asset}`)}
const cache=sw.match(/CACHE='frontier-lab-v(\d+)'/);assert(cache&&Number(cache[1])>=47,`P5.2.11 requires PWA cache v47+; got ${cache?.[1]}`);
assert.equal(pkg.scripts['test:company-os'],'node tests/company-frontieros.mjs');
assert.equal(pkg.scripts['test:company-os-static'],'node tests/company-frontieros-static.mjs');
assert(pkg.scripts['test:static'].includes('company-frontieros-static.mjs'));
assert(pkg.scripts['test:qa'].includes('company-frontieros.mjs'));
assert.equal(policy.version,13,'P5.2.11 must advance release policy to v13');
const gate=policy.gates.find(g=>g.id==='frontieros-company');assert(gate,'release policy missing Company gate');assert.equal(gate.script,'test:company-os');assert.equal(gate.severity,'blocker');assert.equal(gate.timeoutMs,90000);assert.equal(gate.evidence,'artifacts/company-frontieros/report.json');
assert(workflow.includes('P5.2.11 Company evidence'));assert(workflow.includes('artifacts/company-frontieros'));
console.log(JSON.stringify({companyStatic:'pass',policyVersion:policy.version,cache:`v${cache[1]}`,views:6,actionBoundary:'frontierCompanyDispatch',deliveryAssets:4},null,2));
