import fs from 'node:fs';
import assert from 'node:assert/strict';

const css=fs.readFileSync('browser-default-firewall.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const scriptable=fs.readFileSync('Frontier Model Simulator.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of ['--fl-surface-2','--fl-border-default','--fl-text-primary','--fl-disabled-bg','--fl-border-focus']){
  assert(css.includes(`var(${token})`),`firewall must consume ${token}`);
}
for(const selector of [':where(button)',':where(fieldset)',':where(details)',':where(input:-webkit-autofill']){
  assert(css.includes(selector),`firewall missing low-specificity fallback ${selector}`);
}
assert(css.includes('-webkit-appearance:none')&&css.includes('appearance:none'),'button native appearance reset missing');
assert(css.includes('input:not([type="checkbox"])'),'text-like input fallback missing');
assert(css.includes('accent-color:var(--fl-accent-cyan)'),'native checkbox/radio/range dark-theme accent missing');
assert(css.includes(':focus-visible'),'keyboard focus fallback missing');
assert(!css.includes('#app button'),'firewall must stay low-specificity rather than overriding page-specific button styles');

const themePos=html.indexOf('theme-tokens.css');
const firewallPos=html.indexOf('browser-default-firewall.css');
assert(themePos>=0&&firewallPos>themePos,'browser must load theme tokens before browser-default firewall');
assert(scriptable.includes('browser-default-firewall.css'),'Scriptable must include browser-default firewall');
assert(sw.includes("'./browser-default-firewall.css'"),'PWA cache must include browser-default firewall');
assert(/frontier-lab-v\d+/.test(sw),'service worker cache must remain versioned');

console.log('Browser-default firewall static contract passed');
