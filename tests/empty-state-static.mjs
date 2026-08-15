import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(file,'utf8');
const html=read('index.html');
const css=read('empty-state-system.css');
const js=read('empty-state-system.js');
const scriptable=read('Frontier Model Simulator.js');
const sw=read('sw.js');
const inventory=JSON.parse(read('visual-qa/inventory.json'));

for(const selector of ['.fl-zero-state','.fl-zero-icon','.fl-zero-kicker','.fl-zero-next','.fl-zero-actions','.fl-zero-primary'])assert(css.includes(selector),`missing empty-state primitive ${selector}`);
for(const token of ['--fl-surface-2','--fl-surface-inset','--fl-border-default','--fl-text-primary','--fl-text-secondary','--fl-text-muted','--fl-shadow-soft'])assert(css.includes(`var(${token})`),`empty-state system should consume ${token}`);

const keys=['model-lab.no-models','portfolio.no-projects','critical-path.no-active-projects','operations.no-incidents','hiring.no-employees','governance.no-votes','programs.no-trains','postmortems.none'];
for(const key of keys)assert(js.includes(`key:'${key}'`),`missing zero-data rule ${key}`);
for(const contract of ['frontierEmptyStateSync','frontierEmptyStateRegistry','MutationObserver','dataset.flZeroHiddenFor','addEventListener(\'click\'','restoreNative','hideNative'])assert(js.includes(contract),`empty-state runtime missing ${contract}`);

const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const scripts=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
assert(styles.includes('empty-state-system.css'),'browser build must load empty-state-system.css');
assert(styles.indexOf('empty-state-system.css')>styles.indexOf('page-visual-sweep.css'),'13.9 CSS must layer after 13.8 page sweep');
assert(scripts.includes('empty-state-system.js'),'browser build must retain empty-state-system.js');
assert(scripts.indexOf('empty-state-system.js')>scripts.indexOf('page-visual-sweep.js'),'13.9 runtime must remain after the 13.8 page sweep');
for(const file of ['empty-state-system.css','empty-state-system.js']){
  assert(scriptable.includes(`"${file}"`),`Scriptable must include ${file}`);
  assert(sw.includes(`'./${file}'`),`service worker must cache ${file}`);
}
assert(/frontier-lab-v\d+/.test(sw),'service-worker cache must remain versioned after Item 13.9');

for(const id of ['model-lab','hiring','operations','governance','portfolio','critical-path','programs','postmortems']){
  const screen=inventory.screens.find(x=>x.id===id);assert(screen,`inventory screen missing ${id}`);assert(screen.requiredStates.includes('empty'),`${id} must retain Item 13.1 empty-state coverage`);
}
console.log(JSON.stringify({emptyStateStatic:'pass',rules:keys.length,cumulative:true},null,2));
