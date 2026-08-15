import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(file,'utf8');
const html=read('index.html');
const css=read('locked-state-system.css');
const js=read('locked-state-system.js');
const campaign=read('early-game-progression.js');
const responsive=read('responsive-gameplay-shell.js');
const scriptable=read('Frontier Model Simulator.js');
const sw=read('sw.js');
const inventory=JSON.parse(read('visual-qa/inventory.json'));

for(const selector of ['.fl-campaign-locked','.fl-lock-meta','.fl-lock-explainer','.fl-lock-prereq','.fl-lock-progress','.fl-lock-actions','.fl-unavailable-now','.fl-unavailable-meta'])assert(css.includes(selector),`missing locked-state selector ${selector}`);
for(const token of ['--fl-warning','--fl-warning-border','--fl-warning-bg','--fl-disabled-bg','--fl-disabled-border','--fl-disabled-text','--fl-text-primary','--fl-text-secondary','--fl-shadow-panel'])assert(css.includes(`var(${token})`),`locked-state system should consume ${token}`);

for(const contract of ['frontierLockedStateSync','frontierLockedStateOpen','frontierLockedStateClose','frontierLockedStateRegistry','MutationObserver','flLockTarget','flUnavailableTitleOwned','campaignUnlockPlan'])assert(js.includes(contract),`locked-state runtime missing ${contract}`);
for(const campaignContract of ['STAGE_ORDER','campaignUnlockPlan','campaignUnlockRegistry','targetStage','unlockPlan','STAGES[stage].unlocks.includes','STAGES[stage].core.includes'])assert(campaign.includes(campaignContract),`campaign unlock source-of-truth missing ${campaignContract}`);
assert(campaign.includes("campaignLockedSystem=target"),'campaign lock handler must accept stable target identifiers');
assert(campaign.includes("frontierLockedStateOpen"),'campaign lock handler must delegate to Item 13.10 explainer when present');
assert(responsive.includes('data-campaign-target'),'responsive navigation must expose stable campaign lock targets');
assert(responsive.includes("campaignLockedSystem('${name}')")&&responsive.includes("campaignLockedSystem('${fn}')"),'responsive lock actions must pass stable target identifiers');

const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const scripts=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
assert(styles.includes('locked-state-system.css'),'browser build must retain Item 13.10 stylesheet');
assert(scripts.includes('locked-state-system.js'),'browser build must retain Item 13.10 runtime');
assert(styles.indexOf('locked-state-system.css')>styles.indexOf('empty-state-system.css'),'13.10 CSS must layer after 13.9');
assert(scripts.indexOf('locked-state-system.js')>scripts.indexOf('empty-state-system.js'),'13.10 runtime must layer after 13.9');
for(const file of ['locked-state-system.css','locked-state-system.js']){
  assert(scriptable.includes(`"${file}"`),`Scriptable must include ${file}`);
  assert(sw.includes(`'./${file}'`),`service worker must cache ${file}`);
}
const cacheVersion=Number(sw.match(/frontier-lab-v(\d+)/)?.[1]||0);assert(cacheVersion>=19,`Item 13.10 requires cache v19+, found v${cacheVersion}`);

const lockedScreens=inventory.screens.filter(x=>x.requiredStates.includes('locked'));
assert(lockedScreens.length>=20,`expected broad locked-state inventory coverage, found ${lockedScreens.length}`);
for(const id of ['company-home','hiring','data-evals','tech-debt','operations','reliability','release-governance','roadmap','capital','governance','workforce','portfolio','programs','strategy','investment','competition','ecosystem','policy','communications'])assert(lockedScreens.some(x=>x.id===id),`Item 13.1 locked-state inventory missing ${id}`);
assert(inventory.specialCaptures.some(x=>x.id==='more-locked'&&x.requiredStates.includes('locked')),'More-sheet locked capture must remain in the visual inventory');

console.log(JSON.stringify({lockedStateStatic:'pass',lockedScreens:lockedScreens.length,minimumCache:'frontier-lab-v19',currentCache:`frontier-lab-v${cacheVersion}`},null,2));
