import fs from 'node:fs';
import assert from 'node:assert/strict';

const inventory=JSON.parse(fs.readFileSync('visual-qa/inventory.json','utf8'));
const matrix=JSON.parse(fs.readFileSync('visual-qa/responsive-matrix.json','utf8'));
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const crawler=fs.readFileSync('tests/route-crawler.mjs','utf8');

assert.equal(inventory.screens.length,38,'Item 13 route crawler contract expects the canonical 38-screen inventory');
assert.equal(matrix.viewports.length,5,'Item 13 route crawler contract expects five canonical responsive viewports');
assert.equal(new Set(inventory.screens.map(x=>x.id)).size,inventory.screens.length,'screen ids must be unique');
assert.equal(new Set(matrix.viewports.map(x=>x.id)).size,matrix.viewports.length,'viewport ids must be unique');
for(const screen of inventory.screens){
  assert(screen.id&&screen.label&&screen.category,`screen metadata incomplete: ${JSON.stringify(screen)}`);
  assert(Array.isArray(screen.entrypoints)&&screen.entrypoints.length>0,`${screen.id}: route entrypoints missing`);
}
for(const viewport of matrix.viewports){assert(viewport.width>0&&viewport.height>0,`${viewport.id}: viewport dimensions invalid`)}

for(const marker of [
  "visual-qa/inventory.json",
  "visual-qa/responsive-matrix.json",
  "frontierPageSweepRegistry",
  "frontierResponsiveSync",
  "runtimePattern",
  "orphan-runtime-page",
  "unmapped-page-opener",
  "navigation-graph-orphans",
  "home-recovery",
  "crawl-incomplete",
  "artifacts/route-crawl"
])assert(crawler.includes(marker),`route crawler missing contract marker: ${marker}`);

assert(crawler.includes('inventory.screens.length*matrix.viewports.length'),'crawler must derive visit count from shared inventory × responsive matrix');
assert(crawler.includes("viewport.id==='desktop'"),'runtime *Open discovery should execute once on canonical desktop');
assert(crawler.includes('graphCoverage>=0.75'),'navigation graph must use a confidence threshold before hard-gating inferred UI edges');

assert.equal(pkg.scripts['test:routes'],'node tests/route-crawler.mjs','test:routes script missing or drifted');
assert.equal(pkg.scripts['test:routes-static'],'node tests/route-crawler-static.mjs','test:routes-static script missing or drifted');
assert(pkg.scripts['test:static'].includes('route-crawler-static.mjs'),'route crawler static contract must be in cumulative static gate');
assert(pkg.scripts['test:qa'].includes('route-crawler.mjs'),'route crawler must be in cumulative browser QA gate');

console.log(`Route crawler static contract passed for ${inventory.screens.length} screens × ${matrix.viewports.length} viewports = ${inventory.screens.length*matrix.viewports.length} route visits`);
