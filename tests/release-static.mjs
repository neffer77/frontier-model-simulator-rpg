import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const bytes=p=>fs.statSync(path.join(root,p)).size;
const budgets=JSON.parse(read('release-budgets.json'));
const html=read('index.html');
const localRef=r=>!/^(https?:|data:|#|mailto:)/.test(r);
const clean=r=>r.split(/[?#]/)[0].replace(/^\.\//,'');
const refs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(localRef);
const runtime=[...new Set(refs.map(clean))];
const scripts=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>clean(m[1]));
const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>clean(m[1]));

assert(runtime.length>0,'index.html should reference local runtime assets');
assert(runtime.length<=budgets.runtime.maxRuntimeAssets,`runtime asset count ${runtime.length} exceeds budget ${budgets.runtime.maxRuntimeAssets}`);
for(const ref of refs)assert(!ref.startsWith('/'),`GitHub Pages asset must be repo-relative, not root-relative: ${ref}`);
for(const file of runtime)assert(exists(file),`index.html references missing local asset: ${file}`);
assert.equal(new Set(scripts).size,scripts.length,'index.html contains duplicate script tags');
assert.equal(new Set(styles).size,styles.length,'index.html contains duplicate stylesheet tags');

const jsBytes=scripts.reduce((n,f)=>n+bytes(f),0);
const cssBytes=styles.reduce((n,f)=>n+bytes(f),0);
assert(jsBytes<=budgets.runtime.maxJavaScriptBytes,`JavaScript ${jsBytes}B exceeds ${budgets.runtime.maxJavaScriptBytes}B release budget`);
assert(cssBytes<=budgets.runtime.maxCssBytes,`CSS ${cssBytes}B exceeds ${budgets.runtime.maxCssBytes}B release budget`);
for(const file of [...scripts,...styles])assert(bytes(file)<=budgets.runtime.maxSingleRuntimeAssetBytes,`${file} is ${bytes(file)}B; split it before exceeding ${budgets.runtime.maxSingleRuntimeAssetBytes}B`);

// Every browser/runtime/test script must parse. The Scriptable launcher intentionally uses
// top-level await, so validate it with module grammar by checking a temporary .mjs copy.
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=path.join(dir,e.name);if(e.name==='node_modules'||e.name==='_site'||e.name==='.git')return[];return e.isDirectory()?walk(p):[p]})}
const launcherPath=path.join(root,'Frontier Model Simulator.js');
for(const file of walk(root).filter(f=>/\.(?:js|mjs)$/.test(f)&&f!==launcherPath)){
  execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
}
const launcherCheck=path.join(os.tmpdir(),'frontier-scriptable-release-check.mjs');
fs.copyFileSync(launcherPath,launcherCheck);
try{execFileSync(process.execPath,['--check',launcherCheck],{stdio:'pipe'})}finally{fs.rmSync(launcherCheck,{force:true})}

// PWA cache must contain every index-loaded asset or an installed app can work online but fail after refresh offline.
const sw=read('sw.js');
const cached=new Set([...sw.matchAll(/["']\.\/([^"']+)["']/g)].map(m=>clean(m[1])));
for(const file of runtime)assert(cached.has(file),`service worker CORE is missing index asset: ${file}`);
assert(/const CACHE=['"]frontier-lab-v\d+['"]/.test(sw),'service worker cache must have an explicit version');
assert(sw.includes('self.skipWaiting()'),'service worker should activate an installed release promptly');
assert(sw.includes('self.clients.claim()'),'service worker should claim pages after activation');

const manifest=JSON.parse(read('manifest.webmanifest'));
assert.equal(manifest.start_url,'./','PWA start_url must remain GitHub-Pages-subpath safe');
assert.equal(manifest.scope,'./','PWA scope must remain GitHub-Pages-subpath safe');
assert.equal(manifest.display,'standalone','release PWA should launch standalone');
assert(Array.isArray(manifest.icons)&&manifest.icons.length>0,'PWA manifest needs at least one icon');
for(const icon of manifest.icons)assert(exists(clean(icon.src)),`manifest icon missing: ${icon.src}`);

// Scriptable must be an exact asset mirror of index.html and fetch merged releases from main.
const launcher=read('Frontier Model Simulator.js');
function launcherList(name){const m=launcher.match(new RegExp(`const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`));assert(m,`Scriptable launcher missing ${name}`);return [...m[1].matchAll(/"([^"]+)"/g)].map(x=>x[1])}
assert.deepEqual(launcherList('STYLE_FILES'),styles,'Scriptable STYLE_FILES must exactly match index stylesheet order');
assert.deepEqual(launcherList('SCRIPT_FILES'),scripts,'Scriptable SCRIPT_FILES must exactly match index script order');
assert(/const BRANCH = "main";/.test(launcher),'Scriptable release launcher must fetch from main');

const pkg=JSON.parse(read('package.json'));
assert.equal(pkg.devDependencies?.playwright,'1.54.2','Playwright must be exactly pinned for reproducible RC browser tests');
assert(pkg.scripts?.['build:site'],'package.json must expose build:site');
assert(pkg.scripts?.['test:release'],'package.json must expose test:release');
assert(pkg.scripts?.['test:static'],'package.json must expose test:static');
assert(pkg.scripts?.['test:rc'],'package.json must expose test:rc');

console.log(JSON.stringify({
  releaseStatic:'pass',runtimeAssets:runtime.length,scripts:scripts.length,styles:styles.length,
  javascriptBytes:jsBytes,cssBytes,budgetVersion:budgets.version
},null,2));
