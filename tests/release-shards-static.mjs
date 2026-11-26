import fs from 'node:fs';
import assert from 'node:assert/strict';
import {plan,shards,checkPlan,collectParts} from './release-shard-plan.mjs';
const policy=JSON.parse(fs.readFileSync('release-gate-policy.json','utf8'));
checkPlan(policy);
assert.equal(policy.gates.length,46);
assert.equal(policy.gates.filter(g=>g.severity==='blocker').length,45);
const identity={policyHash:'policy',githubSha:'sha',runId:'run',buildHash:'build'};
const parts=Object.entries(plan).map(([partition,ids])=>({partition,item:'13.16',policyVersion:policy.version,policyHash:identity.policyHash,environment:{githubSha:identity.githubSha},runId:identity.runId,buildHash:identity.buildHash,gates:ids.map(id=>{const g=policy.gates.find(g=>g.id===id);return {...g,uiMode:g.uiMode||'default',evidence:g.evidence||null,status:'pass',exitCode:0,timedOut:false}})}));
assert.equal(collectParts(policy,parts,identity).errors.length,0);
for(const mutate of [
 p=>p.pop(),p=>p.push(p[0]),p=>p[1].gates.pop(),p=>p[1].gates.push(p[1].gates[0]),p=>p[1].environment.githubSha='old',
 p=>p[1].policyHash='old',p=>p[1].runId='old',p=>p[1].buildHash='different',p=>p[1].gates[0].status='fail',
 p=>p[1].gates[0].timeoutMs=1,p=>p[1].gates[0].uiMode='legacy',p=>p[1].gates[0].exitCode=1
]){
 const copy=structuredClone(parts);mutate(copy);assert(collectParts(policy,copy,identity).errors.length>0,'Invalid partition must block release');
}
for(const file of ['.github/workflows/browser-qa.yml','.github/workflows/pages.yml']){
 const y=fs.readFileSync(file,'utf8');
 assert(y.includes('shard: ['+shards.join(', ')+']'),'Workflow matrix must match complete policy plan');
 assert(y.includes('fail-fast: false'));
 assert(y.includes('needs: [release-prepare, release-shards]'));
 assert(y.includes('RELEASE_GATE_PART: aggregate')&&y.includes('RELEASE_SHARDS_RESULT:'));
 assert(y.includes('name: release-tested-site')&&y.includes('run: tar -xzf release-site.tar.gz'));
 assert(y.includes('npm run test:signoff'));
}
const pages=fs.readFileSync('.github/workflows/pages.yml','utf8');
assert.match(pages,/build:\s+needs: release-candidate/);
console.log('Parallel release partition coverage and fail-closed aggregation contracts passed');
