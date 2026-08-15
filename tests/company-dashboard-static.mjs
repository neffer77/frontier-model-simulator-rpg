import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(file,'utf8');
const html=read('index.html');
const css=read('company-dashboard.css');
const js=read('company-dashboard.js');
const scriptable=read('Frontier Model Simulator.js');
const sw=read('sw.js');
const inventory=JSON.parse(read('visual-qa/inventory.json'));

for(const selector of ['.company-system-hub','.company-system-hub-head','.company-system-groups','.company-system-group','.company-system-launch-grid','.company-system-hub .fl-launch']){
  assert(css.includes(selector),`missing Company/Home dashboard selector ${selector}`);
}
for(const token of ['--fl-gradient-panel','--fl-surface-1','--fl-border-default','--fl-border-subtle','--fl-text-primary','--fl-text-muted','--fl-disabled-bg','--fl-shadow-panel']){
  assert(css.includes(`var(${token})`),`Company/Home dashboard should consume theme token ${token}`);
}
for(const group of ['Model & Engineering','Operations & Releases','Execution & People','Leadership & Capital','External Environment','Other Lab Systems']){
  assert(js.includes(group),`dashboard group missing: ${group}`);
}
for(const signal of ['dataeval','tech debt','architecture','model famil','maintenance','operations','reliability','release governance','roadmap','workforce','critical path','governance','investment committee','competitive','ecosystem','policy','communications']){
  assert(js.includes(signal),`dashboard classifier missing signal: ${signal}`);
}
for(const contract of ['frontierCompanyDashboardSync','MutationObserver','dataset.flCompanyDashboard','dashboardSignature','isLauncher','groupFor','orderFor']){
  assert(js.includes(contract),`Company/Home runtime contract missing ${contract}`);
}

const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const scripts=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
assert(styles.includes('company-dashboard.css'),'browser build must load company-dashboard.css');
assert(styles.indexOf('company-dashboard.css')>styles.indexOf('shared-control-system.css'),'dashboard composition should layer after the shared control system');
assert.equal(scripts.at(-1),'company-dashboard.js','Company/Home organizer should run last after render adapters');
for(const file of ['company-dashboard.css','company-dashboard.js']){
  assert(scriptable.includes(`"${file}"`),`Scriptable must include ${file}`);
  assert(sw.includes(`'./${file}'`),`service worker must cache ${file}`);
}
assert(sw.includes("frontier-lab-v16"),'Item 13.7 should advance the offline cache to v16');

const vis001=inventory.knownDefects.find(x=>x.id==='VIS-001');
assert(vis001,'VIS-001 historical regression fixture must remain in the inventory');
assert.equal(vis001.screen,'company-home','VIS-001 must stay tied to Company/Home');
assert(/dark simulator surface system/i.test(vis001.expected),'VIS-001 must continue to define the no-bright-surface expectation');
assert(html.includes('company-dashboard.js')&&read('package.json').includes('tests/company-dashboard.mjs'),'VIS-001 must be guarded by the Company/Home runtime and browser regression');

console.log(JSON.stringify({companyDashboardStatic:'pass',groups:6,cache:'frontier-lab-v16',vis001:'guarded'},null,2));
