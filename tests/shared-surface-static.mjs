import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(file,'utf8');
const html=read('index.html');
const css=read('shared-surface-system.css');
const js=read('shared-surface-system.js');
const scriptable=read('Frontier Model Simulator.js');
const sw=read('sw.js');

for(const primitive of ['.fl-panel','.fl-card','.fl-kpi-grid','.fl-kpi','.fl-launch','.fl-row','.fl-actions','.fl-empty','.fl-badge','.fl-section-head']){
  assert(css.includes(primitive),`missing shared surface primitive ${primitive}`);
}
for(const token of ['--fl-gradient-panel','--fl-surface-2','--fl-border-default','--fl-text-primary','--fl-text-muted','--fl-shadow-soft','--fl-focus-ring']){
  assert(css.includes(`var(${token})`),`shared surfaces should consume theme token ${token}`);
}

const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const scripts=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
assert(styles.includes('shared-surface-system.css'),'browser build must load shared-surface-system.css');
assert(styles.indexOf('shared-surface-system.css')>styles.indexOf('browser-default-firewall.css'),'shared surface system should layer after the browser-default firewall');
assert.equal(scripts.at(-1),'shared-surface-system.js','shared surface compatibility adapter should run after all feature render layers');

for(const file of ['shared-surface-system.css','shared-surface-system.js']){
  assert(scriptable.includes(`"${file}"`),`Scriptable must include ${file}`);
  assert(sw.includes(`'./${file}'`),`service worker must cache ${file}`);
}
assert(sw.includes("frontier-lab-v13"),'Item 13.4 should advance the offline cache version');

for(const pattern of ["endsWith('-launch')","endsWith('-card')","endsWith('-row')","endsWith('-actions')","includes('empty')"]){
  assert(js.includes(pattern),`compatibility adapter missing structural rule ${pattern}`);
}
for(const exclusion of ['story-scene-card','feel-milestone-card','realism-card','replay-card','founder-card']){
  assert(js.includes(exclusion),`specialized card exclusion missing: ${exclusion}`);
}
assert(js.includes('MutationObserver'),'legacy adapter must decorate surfaces added by later renders');
assert(js.includes('window.frontierSurfaceDecorate'),'surface decorator should be callable by QA and future integrations');

console.log(JSON.stringify({sharedSurfaceStatic:'pass',primitives:10,cache:'frontier-lab-v13'},null,2));
