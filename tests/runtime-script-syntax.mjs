import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

const root=process.cwd();
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script\s+[^>]*src="([^"]+)"[^>]*><\/script>/g)]
  .map(match=>match[1].split(/[?#]/)[0].replace(/^\.\//,''))
  .filter(src=>!/^(https?:|data:)/.test(src));

assert(scripts.length>0,'index.html must load local runtime scripts');
const failures=[];
for(const script of [...new Set(scripts)]){
  const file=path.join(root,script);
  if(!fs.existsSync(file)){
    failures.push(`${script}: missing runtime script`);
    continue;
  }
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0){
    const detail=(result.stderr||result.stdout||'syntax check failed').trim();
    failures.push(`${script}: ${detail}`);
  }
}

assert.equal(failures.length,0,`Runtime script syntax failures:\n${failures.join('\n\n')}`);
console.log(JSON.stringify({runtimeScriptSyntax:'pass',scriptsChecked:new Set(scripts).size},null,2));
