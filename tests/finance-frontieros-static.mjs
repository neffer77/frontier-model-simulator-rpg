import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(file,'utf8');
const runtime=read('finance-frontieros.js');
const bridge=read('finance-dom-bridge.js');
const command=read('finance-command.js');
const catalog=read('finance-catalog.js');
const registry=read('frontier-app-registry.js');
const html=read('index.html');
const sw=read('sw.js');
const launcher=read('Frontier Model Simulator.js');
const pkg=JSON.parse(read('package.json'));
const policy=JSON.parse(read('release-gate-policy.json'));
const workflow=read('.github/workflows/browser-qa.yml');

for(const marker of [
  'frontierFinanceOpen',
  'frontierFinanceSetView',
  'frontierFinanceSelectInitiative',
  'frontierFinanceSnapshot',
  'frontierFinanceUiAction',
  'finance.opened',
  'finance.rendered',
  'runway',
  'financing',
  'deals',
  'committee',
  'history'
]){
  assert(runtime.includes(marker),`Finance runtime missing ${marker}`);
}

for(const marker of [
  'frontierFinancingOptions',
  'frontierStrategicDeals',
  'frontierFinanceScenarios',
  'frontierInitiativeTemplates',
  'frontierFinanceDispatch',
  'frontierFinanceLastAction',
  'finance.action.dispatched',
  'finance.action.failed'
]){
  assert(catalog.includes(marker),`Finance catalog/action bridge missing ${marker}`);
}

for(const marker of [
  'frontierFinanceUiAction',
  'finance.initiative.proposed',
  'finance.committee.debated',
  'finance.gate.decided',
  'finance.scenario.changed',
  'finance.dom-bridge.ready'
]){
  assert(bridge.includes(marker),`Finance DOM bridge missing ${marker}`);
}

assert(command.includes("frontierRegisterCommand('finance.open'"),'native finance command missing');
assert(registry.includes("id:'finance'")&&registry.includes("command:'finance.open'"),'Finance registry ownership must be native');
assert(!registry.includes("id:'finance',label:'Finance',shortLabel:'CFO',icon:'$',category:'company',route:'os/finance',aliases:['cfo','funding','runway'],status:'ready',legacy:"),'Finance must not retain legacy ownership');

for(const asset of [
  'finance-frontieros.css',
  'finance-catalog.js',
  'finance-frontieros.js',
  'finance-dom-bridge.js',
  'finance-command.js'
]){
  assert(html.includes(asset),`browser delivery missing ${asset}`);
  assert(sw.includes(`./${asset}`),`PWA delivery missing ${asset}`);
  assert(launcher.includes(asset),`Scriptable delivery missing ${asset}`);
}

const cache=sw.match(/CACHE='frontier-lab-v(\d+)'/);
assert(cache&&Number(cache[1])>=46,`P5.2.10 requires PWA cache v46+; got ${cache?.[1]}`);
assert.equal(pkg.scripts['test:finance-os'],'node tests/finance-frontieros.mjs');
assert.equal(pkg.scripts['test:finance-os-static'],'node tests/finance-frontieros-static.mjs');
assert(pkg.scripts['test:static'].includes('finance-frontieros-static.mjs'));
assert(pkg.scripts['test:qa'].includes('finance-frontieros.mjs'));

const gate=policy.gates.find(item=>item.id==='frontieros-finance');
assert(gate,'release policy missing Finance gate');
assert.equal(gate.script,'test:finance-os');
assert.equal(gate.severity,'blocker');
assert.equal(gate.timeoutMs,90000);
assert.equal(gate.evidence,'artifacts/finance-frontieros/report.json');
assert(workflow.includes('P5.2.10 Finance evidence'));
assert(workflow.includes('artifacts/finance-frontieros'));

console.log(JSON.stringify({
  financeStatic:'pass',
  policyVersion:policy.version,
  cache:`v${cache[1]}`,
  actionBoundary:'frontierFinanceDispatch',
  deliveryAssets:5
},null,2));
