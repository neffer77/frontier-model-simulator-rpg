import fs from 'node:fs';
import assert from 'node:assert/strict';

const runtime=fs.readFileSync('debug-bundle.js','utf8');
const css=fs.readFileSync('debug-bundle.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const policy=JSON.parse(fs.readFileSync('release-gate-policy.json','utf8'));
const workflow=fs.readFileSync('.github/workflows/browser-qa.yml','utf8');

for(const marker of ['frontierCreateDebugBundle','frontierDebugBundleSummary','frontierDownloadDebugBundle','frontierCopyDebugSummary','frontierOpenDiagnostics','frontierCloseDiagnostics','frontierDebugSanitize',"item:'P5.0.3'",'bundleId','actionTrail','reproduction','serviceWorker','cacheStorage','performanceSnapshot','storageSnapshot','domContext','[REDACTED]',"diagnostics.open","diagnostics.bundle","runtime.debug-bundle.ready"])assert(runtime.includes(marker),`debug runtime missing contract ${marker}`);
assert(runtime.includes('location.origin')&&runtime.includes('location.pathname'),'debug URL must intentionally exclude query/hash');
assert(!runtime.includes('document.cookie'),'debug bundle must never read cookies');
assert(!runtime.includes('location.search'),'debug bundle must never record URL query strings');
assert(!runtime.includes('location.hash'),'debug bundle must never record URL fragments');
assert(runtime.includes('result.localStorage.keys.push'),'storage diagnostics must collect key metadata');
assert(!runtime.includes('result.localStorage.values'),'storage diagnostics must not export arbitrary values');
assert(runtime.includes('MAX_EVENTS=240'),'bundle must cap embedded event history');
assert(runtime.includes('MAX_ARRAY=120')&&runtime.includes('MAX_KEYS=160'),'bundle must bound recursive evidence size');
assert(runtime.includes('aria-modal')&&runtime.includes("role','dialog"),'diagnostics inspector must expose dialog semantics');
assert(runtime.includes("event.key==='Escape'"),'diagnostics inspector must support Escape dismissal');
assert(runtime.includes("event.metaKey||event.ctrlKey")&&runtime.includes("event.shiftKey"),'diagnostics keyboard shortcut contract missing');

assert(css.includes('.frontier-debug-panel')&&css.includes('@media(max-width:700px)'),'diagnostics CSS must cover desktop and phone');
const adapters=html.indexOf('command-adapters.js'),debug=html.indexOf('debug-bundle.js');assert(adapters>=0&&debug>adapters,'debug bundle must load after command adapters');
assert(html.includes('debug-bundle.css'),'debug diagnostics stylesheet missing from runtime');
const cache=sw.match(/CACHE='frontier-lab-v(\d+)'/);assert(cache&&Number(cache[1])>=30,`P5.0.3 requires PWA cache v30+; found v${cache?.[1]||'missing'}`);
for(const asset of ['./debug-bundle.js','./debug-bundle.css'])assert(sw.includes(asset),`PWA missing ${asset}`);

assert.equal(pkg.scripts['test:debug-bundle'],'node tests/debug-bundle.mjs','debug bundle browser script missing');
assert.equal(pkg.scripts['test:debug-bundle-static'],'node tests/debug-bundle-static.mjs','debug bundle static script missing');
assert(pkg.scripts['test:static'].includes('tests/debug-bundle-static.mjs'),'debug static contract must be cumulative');
assert(pkg.scripts['test:qa'].includes('tests/debug-bundle.mjs'),'debug browser regression must be cumulative');
const gate=policy.gates.find(g=>g.id==='debug-bundle');assert(gate,'release policy missing debug-bundle gate');assert.equal(gate.severity,'blocker');assert.equal(gate.script,'test:debug-bundle');assert.equal(gate.evidence,'artifacts/debug-bundle/report.json');
for(const marker of ['artifacts/debug-bundle','P5.0.3 Debug Bundle + Diagnostics','retention-days: 30'])assert(workflow.includes(marker),`browser QA missing debug evidence contract ${marker}`);
console.log(JSON.stringify({debugBundleStatic:'pass',schemaVersion:1,pwaCache:`frontier-lab-v${cache[1]}`,releaseBlocker:true},null,2));
