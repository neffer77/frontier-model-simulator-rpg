import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const plan=Object.freeze({
  "prepare": [
    "static-contracts",
    "production-build"
  ],
  "native-core": [
    "runtime-identity",
    "command-event-bus",
    "debug-bundle",
    "frontieros-app-registry",
    "frontieros-mobile-home",
    "frontieros-desktop-shell",
    "frontieros-session",
    "frontieros-pager",
    "frontieros-run-monitor",
    "frontieros-evalbench",
    "frontieros-model-lab",
    "frontieros-data-explorer",
    "frontieros-terminal",
    "frontieros-mail",
    "frontieros-people",
    "frontieros-projects",
    "frontieros-finance",
    "frontieros-company",
    "frontieros-knowledge-engineering"
  ],
  "mail-journeys": [
    "frontieros-npc-mail-journey",
    "frontieros-mail-decisions",
    "frontieros-mail-followup",
    "frontieros-mail-evidence",
    "frontieros-mail-triage"
  ],
  "legacy-gameplay": [
    "browser-smoke",
    "balance-pacing",
    "technical-realism",
    "replayability",
    "npc-advice-workstation",
    "release-candidate"
  ],
  "legacy-ui": [
    "browser-firewall",
    "shared-surfaces",
    "progressive-disclosure",
    "shared-controls",
    "company-dashboard",
    "page-visual-sweep",
    "empty-states",
    "locked-states",
    "overlay-system",
    "accessibility"
  ],
  "responsive": [
    "responsive"
  ],
  "routes": [
    "route-crawl"
  ],
  "screenshots": [
    "screenshot-regression"
  ],
  "inventory": [
    "visual-inventory"
  ]
});
export const shards=Object.keys(plan).filter(key=>key!=='prepare');
export const sha256=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export function buildFingerprint(root='_site'){
  if(!fs.existsSync(root))return null;
  const hash=crypto.createHash('sha256');
  function visit(dir,prefix=''){
    for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
      const relative=prefix+entry.name, file=path.join(dir,entry.name);
      if(entry.isDirectory())visit(file,relative+'/');
      else if(entry.isFile())hash.update(JSON.stringify([relative,sha256(file)])+'\n');
      else throw Error('Unexpected build entry: '+relative);
    }
  }
  visit(root);return hash.digest('hex');
}
export function checkPlan(policy){
  const ids=Object.values(plan).flat(), expected=policy.gates.map(g=>g.id);
  if(ids.length!==expected.length||new Set(ids).size!==ids.length||expected.some(id=>!ids.includes(id)))throw Error('Release shard plan must cover every policy gate exactly once');
  for(const gate of policy.gates)if(plan.prepare.includes(gate.id)!==(gate.phase!=='browser'))throw Error('Release shard phase mismatch: '+gate.id);
}
export function collectParts(policy,parts,identity){
  checkPlan(policy);
  const errors=[], rows=new Map(), seen=new Set();
  const fail=(type,details={})=>errors.push({type,...details});
  for(const part of parts){
    const key=part?.partition;
    if(!Object.hasOwn(plan,key)||seen.has(key)){fail('invalid-or-duplicate-partition',{partition:key});continue}
    seen.add(key);
    if(part.item!=='13.16'||part.policyVersion!==policy.version||part.policyHash!==identity.policyHash||part.environment?.githubSha!==identity.githubSha||part.runId!==identity.runId||!identity.buildHash||part.buildHash!==identity.buildHash)fail('partition-identity-mismatch',{partition:key});
    for(const row of part.gates||[]){
      const gate=policy.gates.find(g=>g.id===row.id);
      if(!gate||!plan[key].includes(row.id)||rows.has(row.id)){fail('invalid-or-duplicate-gate',{partition:key,gate:row.id});continue}
      rows.set(row.id,row);
      if(row.script!==gate.script||row.phase!==gate.phase||row.severity!==gate.severity||row.uiMode!==(gate.uiMode||'default')||row.evidence!==(gate.evidence||null)|| (row.status!=='blocked'&&row.timeoutMs!==gate.timeoutMs))fail('gate-contract-mismatch',{gate:row.id});
      if(!['pass','fail','timeout','blocked'].includes(row.status)||(row.status==='pass'&&(row.exitCode!==0||row.timedOut)))fail('gate-result-invalid',{gate:row.id});
      if(gate.severity==='blocker'&&row.status!=='pass')fail('blocker-gate-not-pass',{gate:row.id,status:row.status});
    }
    for(const id of plan[key])if(!rows.has(id))fail('partition-gate-missing',{partition:key,gate:id});
  }
  for(const key of Object.keys(plan))if(!seen.has(key))fail('partition-missing',{partition:key});
  for(const gate of policy.gates)if(!rows.has(gate.id))fail('gate-missing',{gate:gate.id});
  return {errors,gates:policy.gates.map(g=>rows.get(g.id)).filter(Boolean)};
}
