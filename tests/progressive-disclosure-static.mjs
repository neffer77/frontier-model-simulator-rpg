import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(file,'utf8');
const html=read('index.html');
const css=read('progressive-disclosure.css');
const js=read('progressive-disclosure.js');
const appExperience=read('app-experience.css');
const scriptable=read('Frontier Model Simulator.js');
const sw=read('sw.js');

for(const selector of ['.pd-toggle','.pd-toggle-copy','.pd-toggle-meta','.pd-collapsed','.pd-enhanced[data-pd-state="empty"]','.pd-enhanced[data-pd-state="locked"]'])assert(css.includes(selector),`missing progressive-disclosure selector ${selector}`);
for(const token of ['--fl-border-default','--fl-surface-4','--fl-surface-2','--fl-text-primary','--fl-text-muted','--fl-warning-border','--fl-focus-ring'])assert(css.includes(`var(${token})`),`progressive disclosure should consume theme token ${token}`);
assert(css.includes('.pd-collapsed>:not(.pd-toggle){display:none!important}'),'collapsed state must hide all section content except the disclosure row');
assert(css.includes('padding:0!important'),'collapsed sections must not retain page-local padding that creates blank bars');
assert(!appExperience.includes('.pd-'),'app-experience.css must not retain a second progressive-disclosure style source');
for(const contract of ['frontier-disclosure:v2:','MutationObserver','frontierDisclosureSync','frontierDisclosureReset','aria-expanded','dataset.pdState','classHint(section)','slug(title)','media.addEventListener'])assert(js.includes(contract),`runtime disclosure contract missing ${contract}`);
assert(!js.includes('`${i}:${titleFor(section,i)}`'),'disclosure memory must not depend on raw section index');
assert(js.includes("status==='locked'")&&js.includes("status==='empty'"),'locked and empty states need explicit behavior');
assert(js.includes('cleanup(app)'),'desktop/non-dense layouts must actively remove disclosure chrome');

const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
assert(styles.includes('progressive-disclosure.css'),'browser build must load progressive-disclosure.css');
assert(styles.indexOf('progressive-disclosure.css')>styles.indexOf('shared-surface-system.css'),'disclosure cleanup should layer after shared surfaces');
assert(scriptable.includes('"progressive-disclosure.css"'),'Scriptable must include progressive-disclosure.css');
assert(sw.includes("'./progressive-disclosure.css'"),'PWA cache must include progressive-disclosure.css');
assert(/frontier-lab-v\d+/.test(sw),'service worker cache must remain versioned after Item 13.5');
console.log(JSON.stringify({progressiveDisclosureStatic:'pass'},null,2));
