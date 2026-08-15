import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(file,'utf8');
const html=read('index.html');
const css=read('shared-control-system.css');
const js=read('shared-control-system.js');
const scriptable=read('Frontier Model Simulator.js');
const sw=read('sw.js');

for(const cls of ['.fl-btn','.fl-btn-primary','.fl-btn-secondary','.fl-btn-ghost','.fl-btn-danger','.fl-btn-icon','.fl-btn-nav','.fl-btn-locked','.fl-control-field','.fl-control-group'])assert(css.includes(cls),`missing shared control primitive ${cls}`);
for(const token of ['--fl-gradient-action','--fl-surface-4','--fl-surface-hover','--fl-border-default','--fl-border-focus','--fl-text-primary','--fl-text-secondary','--fl-danger-border','--fl-disabled-bg','--fl-focus-ring'])assert(css.includes(`var(${token})`),`shared controls should consume theme token ${token}`);
for(const contract of ['frontierControlDecorate','MutationObserver','dataset.flControl','isDestructive','isIcon','isNav','isPrimary','isGhost','isLaunch','isCardChoice'])assert(js.includes(contract),`shared control adapter missing ${contract}`);
for(const exclusion of ['.tier','.tech-node','.decision button','.pd-toggle','.gameplay-system-grid button'])assert(js.includes(exclusion),`specialized control exclusion missing ${exclusion}`);
assert(js.includes("classList.contains('lab-disclosure-toggle')"),'legacy lab-disclosure toggle should join ghost control styling');
assert(js.includes("classList.contains('story-actions')"),'story action layout container must remain specialized');
assert(css.includes('gameplay-bottom-nav button.fl-btn.fl-btn-nav'),'bottom navigation layout must be preserved');
assert(css.includes('lab-disclosure>button.fl-btn.fl-btn-ghost'),'lab-disclosure controls need shared full-width treatment');

const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const scripts=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
assert(styles.includes('shared-control-system.css'),'browser build must load shared-control-system.css');
assert(scripts.includes('shared-control-system.js'),'browser build must load shared-control-system.js');
assert(styles.indexOf('shared-control-system.css')>styles.indexOf('progressive-disclosure.css'),'shared control hierarchy should layer after progressive disclosure');
assert(scripts.indexOf('shared-control-system.js')>scripts.indexOf('shared-surface-system.js'),'shared control adapter should run after shared surface adapter');
for(const file of ['shared-control-system.css','shared-control-system.js']){
  assert(scriptable.includes(`"${file}"`),`Scriptable must include ${file}`);
  assert(sw.includes(`'./${file}'`),`service worker must cache ${file}`);
}
assert(/frontier-lab-v\d+/.test(sw),'service worker cache must remain versioned after Item 13.6');
console.log(JSON.stringify({sharedControlStatic:'pass',variants:7},null,2));
