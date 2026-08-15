import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(file,'utf8');
const html=read('index.html');
const css=read('overlay-system.css');
const js=read('overlay-system.js');
const scriptable=read('Frontier Model Simulator.js');
const sw=read('sw.js');
const inventory=JSON.parse(read('visual-qa/inventory.json'));

for(const selector of ['.fl-overlay-host','.fl-overlay-backdrop','.fl-overlay-panel','.fl-overlay-suspended','body.fl-overlay-open','.story-overlay.fl-overlay-host','.feel-milestone.fl-overlay-host','.modal-back.fl-overlay-host','.incident-back.fl-overlay-host','.gameplay-more-sheet.fl-overlay-host','.campaign-priority.fl-overlay-host'])assert(css.includes(selector),`missing overlay selector ${selector}`);
for(const token of ['--fl-overlay-strong','--fl-text-primary','--fl-text-secondary','--fl-border-strong','--fl-border-focus','--fl-shadow-modal','--fl-gradient-elevated','--fl-gradient-sheet','--fl-danger-border','--fl-warning-border'])assert(css.includes(`var(${token})`),`overlay system should consume ${token}`);
assert(css.includes('overflow:hidden')&&css.includes('overscroll-behavior:none'),'active overlay must lock document scrolling');
assert(css.includes('visibility:hidden!important')&&css.includes('pointer-events:none!important'),'suspended overlays must not remain interactive or visible');

const expected=[['more',10,true],['priority',20,true],['incident',30,false],['milestone',40,true],['story',50,true],['modal',60,true]];
for(const [id,priority] of expected){
  assert(js.includes(`id:'${id}'`),`overlay registry missing ${id}`);
  assert(js.includes(`priority:${priority}`),`overlay registry missing priority ${priority} for ${id}`);
}
assert(js.includes("{id:'incident'")&&js.includes('dismissible:false'),'incident must remain non-dismissible');
for(const contract of [
  'frontierOverlaySync','frontierOverlayDismissTop','frontierOverlayTop','frontierOverlayRegistry','MutationObserver','aria-modal','aria-hidden',
  "setAttribute('role','dialog')",'restoreFocus','trapTab',"event.key==='Escape'","event.key==='Tab'",'host.inert=true','fl-overlay-suspended','fl-overlay-open',
  "new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']})"
])assert(js.includes(contract),`overlay runtime missing ${contract}`);
assert(js.includes("cs.visibility==='hidden'&&!el.classList.contains('fl-overlay-suspended')"),'manager-owned suspension must remain logically active so lower overlays can resume');
assert(js.indexOf("id:'story'")<js.indexOf("id:'modal'"),'technical explainer must have higher overlay priority than story');
assert(js.indexOf("id:'incident'")<js.indexOf("id:'milestone'")&&js.indexOf("id:'milestone'")<js.indexOf("id:'story'"),'incident → milestone → story stacking contract drifted');

const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const scripts=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
assert.equal(styles.at(-1),'overlay-system.css','13.11 stylesheet should load last');
assert.equal(scripts.at(-1),'overlay-system.js','13.11 runtime should run last');
assert(styles.indexOf('overlay-system.css')>styles.indexOf('locked-state-system.css'),'13.11 CSS must layer after 13.10');
assert(scripts.indexOf('overlay-system.js')>scripts.indexOf('locked-state-system.js'),'13.11 runtime must layer after 13.10');
for(const file of ['overlay-system.css','overlay-system.js']){
  assert(scriptable.includes(`"${file}"`),`Scriptable must include ${file}`);
  assert(sw.includes(`'./${file}'`),`service worker must cache ${file}`);
}
assert(sw.includes("frontier-lab-v20"),'Item 13.11 should advance offline cache to v20');

for(const id of ['story-intro','training-incident','technical-explainer','milestone','company-priority','more-locked','more-unlocked'])assert(inventory.specialCaptures.some(x=>x.id===id),`Item 13.1 overlay inventory missing ${id}`);

console.log(JSON.stringify({overlayStatic:'pass',overlays:expected.length,stack:expected.map(x=>x[0]),cache:'frontier-lab-v20'},null,2));
