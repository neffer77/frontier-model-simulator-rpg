import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const outRoot=path.resolve(process.env.RELEASE_SIGNOFF_DIR||'artifacts/release-signoff');
fs.rmSync(outRoot,{recursive:true,force:true});
fs.mkdirSync(outRoot,{recursive:true});

const readJson=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return null}};
const sha256File=file=>fs.existsSync(file)?crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'):null;
const gitSha=()=>{
  if(process.env.GITHUB_SHA)return process.env.GITHUB_SHA;
  const result=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});
  return result.status===0?String(result.stdout||'').trim()||null:null;
};

const gatePath='artifacts/release-gate/report.json';
const policyPath='release-gate-policy.json';
const baselinePath='visual-qa/screenshot-baseline.json';
const buildInfoPath='_site/build-info.json';
const gate=readJson(gatePath);
const policy=readJson(policyPath);
const baseline=readJson(baselinePath);
const buildInfo=readJson(buildInfoPath);
const issues=[];
const warnings=[];
const fail=(type,details={})=>issues.push({type,...details});
const warn=(type,details={})=>warnings.push({type,...details});

if(!gate)fail('release-gate-report-missing',{path:gatePath});
else {
  if(gate.item!=='13.16')fail('wrong-release-gate-item',{actual:gate.item});
  if(gate.releaseDecision!=='pass')fail('release-gate-not-pass',{decision:gate.releaseDecision,blockers:(gate.blockers||[]).length});
  if((gate.blockers||[]).length)fail('release-gate-blockers-present',{count:gate.blockers.length});
  const blockerGates=(policy?.gates||[]).filter(x=>x.severity==='blocker');
  const execution=new Map((gate.gates||[]).map(x=>[x.id,x]));
  for(const expected of blockerGates){
    const actual=execution.get(expected.id);
    if(!actual)fail('blocker-gate-missing',{gate:expected.id});
    else if(actual.status!=='pass')fail('blocker-gate-not-pass',{gate:expected.id,status:actual.status,exitCode:actual.exitCode});
  }
  for(const advisory of gate.advisories||[])warn('release-gate-advisory',{advisory});
}

if(!policy)fail('release-policy-missing',{path:policyPath});
else if(policy.item!=='13.16')fail('release-policy-item-drift',{actual:policy.item});

if(!baseline)fail('screenshot-baseline-missing',{path:baselinePath});
else {
  const required=policy?.semanticEvidence?.screenshotRegression?.expectedCaptureCount||255;
  const count=Object.keys(baseline.captures||{}).length;
  if(baseline.status!=='active')fail('screenshot-baseline-inactive',{status:baseline.status||null});
  if(Number(baseline.expectedCaptureCount)!==Number(required)||count!==Number(required))fail('screenshot-baseline-incomplete',{expected:required,reported:baseline.expectedCaptureCount,actual:count});
  if(baseline.promotion?.item!=='13.17'||baseline.promotion?.reviewed!==true)warn('baseline-promotion-provenance-missing',{promotion:baseline.promotion||null});
}

const routeEvidence=gate?.evidence?.routeCrawl||null;
if(routeEvidence){
  const expected=policy?.semanticEvidence?.routeCrawl?.expectedVisits||190;
  if(Number(routeEvidence.actualVisits)!==Number(expected)||Number(routeEvidence.failures)!==0)fail('route-evidence-not-clean',{expected,actual:routeEvidence.actualVisits,failures:routeEvidence.failures});
}else if(gate)fail('route-evidence-missing');

const screenshotEvidence=gate?.evidence?.screenshotRegression||null;
if(screenshotEvidence){
  const expected=policy?.semanticEvidence?.screenshotRegression?.expectedCaptureCount||255;
  if(Number(screenshotEvidence.producedCaptures)!==Number(expected))fail('screenshot-evidence-count',{expected,actual:screenshotEvidence.producedCaptures});
  for(const field of ['mismatches','missingBaseline','extraBaseline','missingCaptures','pageErrors'])if(Number(screenshotEvidence[field]||0)!==0)fail('screenshot-evidence-not-clean',{field,count:screenshotEvidence[field]});
}else if(gate)fail('screenshot-evidence-missing');

if(!buildInfo)fail('production-build-info-missing',{path:buildInfoPath});

const receipt={
  version:1,
  item:'13.17',
  generatedAt:new Date().toISOString(),
  decision:issues.length?'block':'ready',
  gitSha:gitSha(),
  github:{
    runId:process.env.GITHUB_RUN_ID||null,
    runNumber:process.env.GITHUB_RUN_NUMBER||null,
    ref:process.env.GITHUB_REF||null,
    actor:process.env.GITHUB_ACTOR||null
  },
  fingerprints:{
    releaseGateReportSha256:sha256File(gatePath),
    releasePolicySha256:sha256File(policyPath),
    screenshotBaselineSha256:sha256File(baselinePath),
    buildInfoSha256:sha256File(buildInfoPath)
  },
  releaseGate:gate?{decision:gate.releaseDecision,policyVersion:gate.policyVersion,blockers:(gate.blockers||[]).length,advisories:(gate.advisories||[]).length}:null,
  screenshotBaseline:baseline?{status:baseline.status,expectedCaptureCount:baseline.expectedCaptureCount,captureCount:Object.keys(baseline.captures||{}).length,promotion:baseline.promotion||null}:null,
  buildInfo,
  issues,
  warnings
};

fs.writeFileSync(path.join(outRoot,'signoff.json'),JSON.stringify(receipt,null,2)+'\n');
const md=[
  '# Item 13.17 release sign-off',
  '',
  `- Decision: **${receipt.decision.toUpperCase()}**`,
  `- Blocking issues: **${issues.length}**`,
  `- Warnings/advisories: **${warnings.length}**`,
  `- Git SHA: \`${receipt.gitSha||'unknown'}\``,
  '',
  '## Fingerprints','',
  `- Release gate: \`${receipt.fingerprints.releaseGateReportSha256||'missing'}\``,
  `- Release policy: \`${receipt.fingerprints.releasePolicySha256||'missing'}\``,
  `- Screenshot baseline: \`${receipt.fingerprints.screenshotBaselineSha256||'missing'}\``,
  `- Build info: \`${receipt.fingerprints.buildInfoSha256||'missing'}\``,
  '',
  '## Blocking issues',''
];
if(issues.length)for(const issue of issues)md.push(`- **${issue.type}** — \`${JSON.stringify(issue)}\``);else md.push('- None.');
md.push('','## Warnings / advisories','');
if(warnings.length)for(const warning of warnings)md.push(`- **${warning.type}** — \`${JSON.stringify(warning)}\``);else md.push('- None.');
fs.writeFileSync(path.join(outRoot,'REPORT.md'),md.join('\n')+'\n');

console.log(JSON.stringify({releaseSignoff:receipt.decision,issues:issues.length,warnings:warnings.length,report:path.join(outRoot,'REPORT.md')},null,2));
if(receipt.decision!=='ready')process.exit(1);
