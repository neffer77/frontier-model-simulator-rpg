import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const out=path.join(root,'_site');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const clean=r=>r.split(/[?#]/)[0].replace(/^\.\//,'');
const refs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map(m=>m[1])
  .filter(r=>!/^(https?:|data:|#|mailto:)/.test(r))
  .map(clean);
const files=[...new Set(['index.html','sw.js',...refs])];

fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
for(const file of files){
  const src=path.join(root,file),dst=path.join(out,file);
  if(!fs.existsSync(src))throw new Error(`Release asset missing: ${file}`);
  fs.mkdirSync(path.dirname(dst),{recursive:true});
  fs.copyFileSync(src,dst);
}
fs.writeFileSync(path.join(out,'.nojekyll'),'');
fs.writeFileSync(path.join(out,'build-info.json'),JSON.stringify({
  version:(process.env.GITHUB_SHA||'local').slice(0,12),
  builtAt:new Date().toISOString(),
  ref:process.env.GITHUB_REF_NAME||'local',
  runtimeFiles:files.length
},null,2)+'\n');

const forbidden=['package.json','tests','docs','.github','node_modules','release-budgets.json','scripts'];
for(const name of forbidden){if(fs.existsSync(path.join(out,name)))throw new Error(`Repo-only path leaked into release artifact: ${name}`)}
const total=files.reduce((n,f)=>n+fs.statSync(path.join(out,f)).size,0);
console.log(`Built minimal _site: ${files.length} runtime files, ${total} bytes`);
