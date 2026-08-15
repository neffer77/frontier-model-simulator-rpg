import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(file,'utf8');
const html=read('index.html');
const css=read('responsive-visual-sweep.css');
const js=read('responsive-visual-sweep.js');
const scriptable=read('Frontier Model Simulator.js');
const sw=read('sw.js');
const pkg=JSON.parse(read('package.json'));
const inventory=JSON.parse(read('visual-qa/inventory.json'));
const matrix=JSON.parse(read('visual-qa/responsive-matrix.json'));

const modes=['phone-portrait','phone-landscape','tablet','desktop','wide'];
assert.equal(matrix.version,1,'responsive matrix version drifted');
assert.equal(matrix.item,'13.13','responsive matrix item drifted');
assert.deepEqual(matrix.viewports.map(x=>x.id),modes,'responsive matrix mode order drifted');
for(const mode of modes){assert(js.includes(`id:'${mode}'`),`responsive registry missing ${mode}`);assert(css.includes(`data-fl-responsive-mode="${mode}"`),`responsive CSS missing ${mode}`)}
for(const v of matrix.viewports){assert(js.includes(`width:${v.width},height:${v.height}`),`runtime registry does not match matrix for ${v.id}`);assert(v.expect.bottomNavColumns===5,`${v.id}: bottom nav contract must retain five destinations`)}
for(const contract of ['frontierResponsiveSync','frontierResponsiveMode','frontierResponsiveRegistry','frontierResponsiveAudit','flResponsiveSweep','flResponsiveMode','flResponsiveOrientation','visualViewport','orientationchange','ResizeObserver','MutationObserver','fl-responsive-table-wrap','fl-responsive-local-scroll','flResponsiveScrollable'])assert(js.includes(contract),`responsive runtime missing ${contract}`);
assert(js.includes("if(width<=600&&!landscape)return 'phone-portrait'"),'phone portrait classifier drifted');
assert(js.includes("if(landscape&&height<=600&&width<=1000)return 'phone-landscape'"),'phone landscape classifier drifted');
assert(js.includes("if(width<1100)return 'tablet'")&&js.includes("if(width<1600)return 'desktop'")&&js.includes("return 'wide'"),'tablet/desktop/wide classifier drifted');
assert(js.includes("wrap.removeAttribute('tabindex')"),'table wrappers must stop being keyboard regions when they no longer overflow');

for(const contract of ['100dvh','env(safe-area-inset-left)','env(safe-area-inset-right)','env(safe-area-inset-bottom)','overflow-x:auto','overscroll-behavior-inline:contain','--fl-responsive-gutter','--fl-responsive-nav-space','max-width:1680px','grid-template-columns:repeat(3,minmax(0,1fr))'])assert(css.includes(contract),`responsive CSS missing ${contract}`);
for(const selector of ['.fl-responsive-table-wrap','.fl-responsive-local-scroll','.gameplay-bottom-nav','.gameplay-more-sheet>section','.story-scene-art','.company-system-groups','.telemetry-grid','.resource-strip'])assert(css.includes(selector),`responsive CSS missing selector ${selector}`);
assert(css.includes('@media(max-height:600px) and (orientation:landscape) and (max-width:1000px)'),'landscape first-paint fallback missing');
assert(css.includes('@media(max-width:600px) and (orientation:portrait)'),'portrait first-paint fallback missing');

const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
const scripts=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
assert.equal(styles.at(-1),'responsive-visual-sweep.css','13.13 stylesheet should load last');
assert.equal(scripts.at(-1),'responsive-visual-sweep.js','13.13 runtime should run last');
assert(styles.indexOf('responsive-visual-sweep.css')>styles.indexOf('accessibility-system.css'),'13.13 CSS must layer after 13.12');
assert(scripts.indexOf('responsive-visual-sweep.js')>scripts.indexOf('accessibility-system.js'),'13.13 runtime must layer after 13.12');
for(const file of ['responsive-visual-sweep.css','responsive-visual-sweep.js']){
  assert(scriptable.includes(`"${file}"`),`Scriptable must include ${file}`);
  assert(sw.includes(`'./${file}'`),`service worker must cache ${file}`);
}
assert(sw.includes("frontier-lab-v22"),'Item 13.13 should advance offline cache to v22');
assert.equal(pkg.scripts['test:responsive'],'node tests/responsive-visual-sweep.mjs','responsive browser script missing');
assert.equal(pkg.scripts['test:responsive-static'],'node tests/responsive-visual-static.mjs','responsive static script missing');
assert(pkg.scripts['test:static'].includes('responsive-visual-static.mjs'),'responsive static regression missing from RC gate');
assert(pkg.scripts['test:qa'].includes('responsive-visual-sweep.mjs'),'responsive browser regression missing from RC gate');
assert(inventory.screens.length>=30,`expected broad page inventory, found ${inventory.screens.length}`);
assert(matrix.contracts.some(x=>/horizontal document overflow/i.test(x)),'responsive matrix must document page-overflow contract');
assert(matrix.contracts.some(x=>/tables scroll locally/i.test(x)),'responsive matrix must document table-local-scroll contract');

console.log(JSON.stringify({responsiveStatic:'pass',modes,inventoryScreens:inventory.screens.length,viewports:matrix.viewports.length,cache:'frontier-lab-v22'},null,2));
