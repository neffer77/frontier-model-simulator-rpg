import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(file,'utf8');
const html=read('index.html');
const theme=read('theme-tokens.css');
const css=read('accessibility-system.css');
const js=read('accessibility-system.js');
const scriptable=read('Frontier Model Simulator.js');
const sw=read('sw.js');

const parseVars=text=>Object.fromEntries([...text.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g)].map(m=>[m[1],m[2]]));
const vars={...parseVars(theme),...parseVars(css)};
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
const channel=c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
const luminance=hex=>{const [r,g,b]=rgb(hex).map(channel);return .2126*r+.7152*g+.0722*b};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b),hi=Math.max(x,y),lo=Math.min(x,y);return (hi+.05)/(lo+.05)};
const pair=(fg,bg,min=4.5)=>{assert(vars[fg],`missing ${fg}`);assert(vars[bg],`missing ${bg}`);const value=contrast(vars[fg],vars[bg]);assert(value>=min,`${fg} on ${bg} contrast ${value.toFixed(2)} < ${min}`);return value};

const ratios={
  primary:pair('--fl-text-primary','--fl-surface-2'),
  secondary:pair('--fl-text-secondary','--fl-surface-2'),
  muted:pair('--fl-text-muted','--fl-surface-2'),
  subtle:pair('--fl-text-subtle','--fl-surface-2'),
  disabled:pair('--fl-disabled-text','--fl-disabled-bg'),
  accent:pair('--fl-text-accent','--fl-surface-2'),
  warning:pair('--fl-warning','--fl-warning-surface'),
  danger:pair('--fl-danger','--fl-danger-surface'),
  success:pair('--fl-success','--fl-success-bg')
};

for(const selector of ['.fl-sr-only','.fl-skip-link',':focus-visible','[aria-disabled="true"]','[aria-selected="true"]','[aria-pressed="true"]'])assert(css.includes(selector),`missing accessibility CSS contract ${selector}`);
for(const contract of ['--fl-a11y-target:24px','--fl-a11y-target:44px','prefers-reduced-motion:reduce','prefers-contrast:more','forced-colors:active','text-size-adjust:100%','outline:3px solid var(--fl-border-focus)'])assert(css.includes(contract),`missing accessibility CSS behavior ${contract}`);
for(const legacy of ['.sub','.sim-note','.incident-tip','.tier small','.tech-node small','.knowledge em'])assert(css.includes(legacy),`legacy contrast bridge missing ${legacy}`);

for(const contract of ['frontierAccessibilitySync','frontierAccessibilityAudit','frontierA11yAnnounce','flAccessibilitySystem','fl-skip-link','fl-a11y-live','role\',\'progressbar','role\',\'tablist','aria-selected','aria-pressed','alertdialog','scope\',\'col','MutationObserver']){
  const needle=contract.replace(/\\'/g,"'");assert(js.includes(needle),`accessibility runtime missing ${needle}`);
}
assert(js.includes("skip.addEventListener('click'"),'skip link must explicitly move focus to the workspace');
assert(js.includes("['ArrowLeft','ArrowRight','Home','End']"),'incident tabs need arrow/Home/End keyboard navigation');

const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const scripts=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
assert.equal(styles.at(-1),'accessibility-system.css','13.12 accessibility stylesheet should load last');
assert.equal(scripts.at(-1),'accessibility-system.js','13.12 accessibility runtime should run last');
assert(styles.indexOf('accessibility-system.css')>styles.indexOf('overlay-system.css'),'13.12 CSS must layer after 13.11');
assert(scripts.indexOf('accessibility-system.js')>scripts.indexOf('overlay-system.js'),'13.12 runtime must layer after 13.11');
for(const file of ['accessibility-system.css','accessibility-system.js']){
  assert(scriptable.includes(`"${file}"`),`Scriptable must include ${file}`);
  assert(sw.includes(`'./${file}'`),`service worker must cache ${file}`);
}
assert(sw.includes("frontier-lab-v21"),'Item 13.12 should advance offline cache to v21');

console.log(JSON.stringify({accessibilityStatic:'pass',ratios:Object.fromEntries(Object.entries(ratios).map(([k,v])=>[k,Number(v.toFixed(2))])),cache:'frontier-lab-v21'},null,2));
