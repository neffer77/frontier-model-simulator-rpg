import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(file,'utf8');
const inventory=JSON.parse(read('visual-qa/inventory.json'));
const js=read('page-visual-sweep.js');
const css=read('page-visual-sweep.css');
const html=read('index.html');
const scriptable=read('Frontier Model Simulator.js');
const sw=read('sw.js');

const rows=[...js.matchAll(/\{id:'([^']+)',category:'([^']+)',entrypoints:\[([^\]]*)\]\}/g)].map(m=>({id:m[1],category:m[2],entrypoints:[...m[3].matchAll(/'([^']+)'/g)].map(x=>x[1])}));
assert.equal(rows.length,inventory.screens.length,`page sweep registry should cover all ${inventory.screens.length} inventory screens`);
const byId=new Map(rows.map(x=>[x.id,x]));
for(const screen of inventory.screens){
  const row=byId.get(screen.id);assert(row,`page sweep missing inventory screen ${screen.id}`);
  assert.equal(row.category,screen.category,`${screen.id}: category drift`);
  for(const entry of screen.entrypoints||[])assert(row.entrypoints.includes(entry),`${screen.id}: page sweep missing entrypoint ${entry}`);
}
for(const category of ['core','learning','engineering','company','external'])assert(rows.some(x=>x.category===category),`missing page category ${category}`);
for(const contract of ['frontierPageSweepSync','frontierPageSweepRegistry','frontierPageSweepSet','MutationObserver','BRIGHT_TAGS','repairBrightSurfaces','guardOverflow','flPageSweepWrapped','VIEW_IDS'])assert(js.includes(contract),`runtime page sweep missing ${contract}`);
for(const selector of ['#app[data-fl-page-id]','.fl-page-shell','.fl-page-head','.fl-page-grid','.fl-page-tabs','.fl-page-empty','.fl-page-bright-repair','.fl-page-overflow-guard'])assert(css.includes(selector),`page sweep CSS missing ${selector}`);
for(const token of ['--fl-text-primary','--fl-text-muted','--fl-surface-2','--fl-border-default','--fl-radius-lg','--fl-shadow-soft','--fl-accent-teal','--fl-accent-gold'])assert(css.includes(`var(${token})`),`page sweep should consume theme token ${token}`);

const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const scripts=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
assert.equal(styles.at(-1),'page-visual-sweep.css','page sweep stylesheet should load last');
assert.equal(scripts.at(-1),'page-visual-sweep.js','page sweep runtime should run last');
for(const file of ['page-visual-sweep.css','page-visual-sweep.js']){
  assert(scriptable.includes(`"${file}"`),`Scriptable must include ${file}`);
  assert(sw.includes(`'./${file}'`),`service worker must cache ${file}`);
}
assert(sw.includes("frontier-lab-v17"),'Item 13.8 should advance offline cache to v17');
console.log(JSON.stringify({pageSweepStatic:'pass',screens:rows.length,categories:[...new Set(rows.map(x=>x.category))],cache:'frontier-lab-v17'},null,2));
