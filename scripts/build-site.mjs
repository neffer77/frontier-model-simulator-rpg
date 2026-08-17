import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const out=path.join(root,'_site');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const clean=r=>r.split(/[?#]/)[0].replace(/^\.\//,'');
const refs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map(m=>m[1])
  .filter(r=>!/^(https?:|data:|#|mailto:)/.test(r))
  .map(clean);
const files=[...new Set(['index.html','sw.js',...refs])];
const runtimeScripts=[...new Set([...html.matchAll(/<script\s+[^>]*src="([^"]+)"[^>]*><\/script>/g)]
  .map(m=>clean(m[1]))
  .filter(r=>!/^(https?:|data:)/.test(r)))];

// Fail the production build before browser QA if any script referenced by index.html
// is missing or does not parse. This protects every focused FrontierOS workflow,
// not just the feature that introduced the bad script.
for(const script of runtimeScripts){
  const file=path.join(root,script);
  if(!fs.existsSync(file))throw new Error(`Runtime script missing: ${script}`);
  const checked=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(checked.status!==0){
    const detail=(checked.stderr||checked.stdout||'syntax check failed').trim();
    throw new Error(`Runtime script syntax failure: ${script}\n${detail}`);
  }
}

fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
for(const file of files){
  const src=path.join(root,file),dst=path.join(out,file);
  if(!fs.existsSync(src))throw new Error(`Release asset missing: ${file}`);
  fs.mkdirSync(path.dirname(dst),{recursive:true});
  fs.copyFileSync(src,dst);
}

const gitSha=process.env.GITHUB_SHA||null;
const builtAt=new Date().toISOString();
const ref=process.env.GITHUB_REF_NAME||'local';
const buildId=(gitSha||'local').slice(0,12);
const runtimeBuild={schemaVersion:1,buildId,gitSha,builtAt,ref};
fs.writeFileSync(path.join(out,'frontier-build.js'),`window.__FRONTIER_BUILD__=Object.freeze(${JSON.stringify(runtimeBuild)});\n`);

fs.writeFileSync(path.join(out,'.nojekyll'),'');
fs.writeFileSync(path.join(out,'build-info.json'),JSON.stringify({
  version:buildId,
  buildId,
  gitSha,
  builtAt,
  ref,
  runtimeFiles:files.length,
  runtimeScriptsChecked:runtimeScripts.length
},null,2)+'\n');

const forbidden=['package.json','tests','docs','.github','node_modules','release-budgets.json','scripts'];
for(const name of forbidden){if(fs.existsSync(path.join(out,name)))throw new Error(`Repo-only path leaked into release artifact: ${name}`)}
const total=files.reduce((n,f)=>n+fs.statSync(path.join(out,f)).size,0);
console.log(`Built minimal _site: ${files.length} runtime files, ${total} bytes, ${runtimeScripts.length} scripts syntax-checked, build ${buildId}`);
