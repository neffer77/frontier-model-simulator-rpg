import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const policy=JSON.parse(fs.readFileSync('release-gate-policy.json','utf8'));
const outRoot=path.resolve(process.env.RELEASE_GATE_DIR||'artifacts/release-gate');
const serverUrl=process.env.RELEASE_GATE_URL||'http://127.0.0.1:4173/';
const externalServer=Boolean(process.env.RELEASE_GATE_URL);
const maxBuffer=64*1024*1024;

fs.rmSync(outRoot,{recursive:true,force:true});
fs.mkdirSync(path.join(outRoot,'logs'),{recursive:true});

const report={
  version:1,
  item:'13.16',
  policyVersion:policy.version,
  generatedAt:new Date().toISOString(),
  serverUrl,
  externalServer,
  gates:[],
  blockers:[],
  advisories:[],
  evidence:{},
  releaseDecision:'pending'
};

const blocker=(type,details={})=>report.blockers.push({type,...details});
const advisory=(type,details={})=>report.advisories.push({type,...details});
const safeReadJson=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return null}};
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);

function runCommandGate(gate,env={}){
  const started=Date.now();
  if(gate.evidence)fs.rmSync(path.dirname(path.resolve(gate.evidence)),{recursive:true,force:true});
  if(gate.id==='production-build')fs.rmSync(path.resolve('_site'),{recursive:true,force:true});
  console.log(`\n=== ${gate.severity.toUpperCase()} :: ${gate.label} (${gate.script}) ===`);
  const result=spawnSync('npm',['run','--silent',gate.script],{
    cwd:process.cwd(),
    env:{...process.env,...env},
    encoding:'utf8',
    maxBuffer
  });
  const stdout=result.stdout||'';const stderr=result.stderr||'';
  if(stdout)process.stdout.write(stdout);if(stderr)process.stderr.write(stderr);
  const exitCode=Number.isInteger(result.status)?result.status:1;
  const row={id:gate.id,label:gate.label,script:gate.script,severity:gate.severity,phase:gate.phase,status:exitCode===0?'pass':'fail',exitCode,durationMs:Date.now()-started,evidence:gate.evidence||null,error:result.error?String(result.error):null};
  report.gates.push(row);
  fs.writeFileSync(path.join(outRoot,'logs',`${slug(gate.id)}.log`),`${stdout}${stderr}`);
  if(exitCode!==0){
    const details={gate:gate.id,script:gate.script,exitCode,error:row.error};
    gate.severity==='blocker'?blocker('gate-command-failed',details):advisory('advisory-command-failed',details);
  }
  if(gate.evidence&&!fs.existsSync(gate.evidence)){
    const details={gate:gate.id,path:gate.evidence};
    gate.severity==='blocker'?blocker('required-evidence-missing',details):advisory('advisory-evidence-missing',details);
  }
  return row;
}

function recordBlockedGate(gate,reason){
  const row={id:gate.id,label:gate.label,script:gate.script,severity:gate.severity,phase:gate.phase,status:'blocked',exitCode:null,durationMs:0,evidence:gate.evidence||null,reason};
  report.gates.push(row);
  const details={gate:gate.id,reason};
  gate.severity==='blocker'?blocker('gate-not-executed',details):advisory('advisory-not-executed',details);
}

async function waitForServer(url,server,timeoutMs=15000){
  const deadline=Date.now()+timeoutMs;
  while(Date.now()<deadline){
    if(server&&server.exitCode!==null)return false;
    try{const response=await fetch(url,{cache:'no-store'});if(response.ok)return true}catch{}
    await new Promise(r=>setTimeout(r,250));
  }
  return false;
}

function evaluateSemanticEvidence(){
  const semantics=policy.semanticEvidence||{};
  const screenshotPolicy=semantics.screenshotRegression||{};
  const baselineFile=screenshotPolicy.baselineFile||'visual-qa/screenshot-baseline.json';
  const baseline=safeReadJson(baselineFile);
  report.evidence.screenshotBaseline=baseline?{status:baseline.status||null,expectedCaptureCount:baseline.expectedCaptureCount||0,captureCount:Object.keys(baseline.captures||{}).length}:null;
  if(!baseline)blocker('screenshot-baseline-missing',{path:baselineFile});
  else {
    if(baseline.status!==screenshotPolicy.requiredBaselineStatus)blocker('screenshot-baseline-inactive',{required:screenshotPolicy.requiredBaselineStatus,actual:baseline.status||null,path:baselineFile});
    if(Number(baseline.expectedCaptureCount)!==Number(screenshotPolicy.expectedCaptureCount))blocker('screenshot-baseline-count-contract',{expected:screenshotPolicy.expectedCaptureCount,actual:baseline.expectedCaptureCount});
    if(baseline.status===screenshotPolicy.requiredBaselineStatus&&Object.keys(baseline.captures||{}).length!==Number(screenshotPolicy.expectedCaptureCount))blocker('screenshot-baseline-incomplete',{expected:screenshotPolicy.expectedCaptureCount,actual:Object.keys(baseline.captures||{}).length});
  }

  const screenshot=safeReadJson('artifacts/screenshot-regression/report.json');
  if(screenshot){
    const summary={baselineStatus:screenshot.baselineStatus||null,expectedCaptureCount:screenshot.expectedCaptureCount||0,producedCaptures:(screenshot.captures||[]).length,mismatches:(screenshot.mismatches||[]).length,missingBaseline:(screenshot.missingBaseline||[]).length,extraBaseline:(screenshot.extraBaseline||[]).length,missingCaptures:(screenshot.missingCaptures||[]).length,pageErrors:(screenshot.pageErrors||[]).length};
    report.evidence.screenshotRegression=summary;
    if(summary.expectedCaptureCount!==Number(screenshotPolicy.expectedCaptureCount)||summary.producedCaptures!==Number(screenshotPolicy.expectedCaptureCount))blocker('screenshot-capture-count',{expected:screenshotPolicy.expectedCaptureCount,reportedExpected:summary.expectedCaptureCount,produced:summary.producedCaptures});
    for(const field of screenshotPolicy.blockOn||[]){const count=Array.isArray(screenshot[field])?screenshot[field].length:Number(screenshot[field]||0);if(count>0)blocker('screenshot-regression-evidence',{field,count});}
  }

  const routePolicy=semantics.routeCrawl||{};
  const routes=safeReadJson('artifacts/route-crawl/report.json');
  if(routes){
    const summary={expectedVisits:routes.expectedVisits||0,actualVisits:(routes.visits||[]).length,failures:(routes.failures||[]).length,warnings:(routes.warnings||[]).length,orphanRuntimePages:(routes.orphanRuntimePages||[]).length};
    report.evidence.routeCrawl=summary;
    if(Number(summary.expectedVisits)!==Number(routePolicy.expectedVisits)||summary.actualVisits!==Number(routePolicy.expectedVisits))blocker('route-crawl-visit-count',{expected:routePolicy.expectedVisits,reportedExpected:summary.expectedVisits,actual:summary.actualVisits});
    if(routePolicy.blockOnFailures&&summary.failures>0)blocker('route-crawl-failures',{count:summary.failures});
    if(routePolicy.warningsAreAdvisory&&summary.warnings>0)advisory('route-crawl-warnings',{count:summary.warnings});
  }

  const visual=safeReadJson('artifacts/visual-inventory/report.json');
  if(visual){
    const captures=Object.values(visual.devices||{}).flatMap(device=>device.captures||[]);
    const brightSurfaceSuspects=captures.reduce((n,capture)=>n+(capture.brightSurfaces||[]).length,0);
    const unresolvedScreens=(visual.unresolvedScreens||[]).length;
    report.evidence.visualInventory={captures:captures.length,unresolvedScreens,brightSurfaceSuspects};
    if(semantics.visualInventory?.unresolvedScreensAreAdvisory&&unresolvedScreens)advisory('visual-inventory-unresolved',{count:unresolvedScreens});
    if(semantics.visualInventory?.brightSurfaceSuspectsAreAdvisory&&brightSurfaceSuspects)advisory('visual-inventory-bright-surface-suspects',{count:brightSurfaceSuspects});
  }

  for(const item of policy.manualChecks||[])if(item.severity==='advisory')advisory('manual-check',{id:item.id,description:item.description});
}

function writeReport(){
  report.releaseDecision=report.blockers.length?'block':'pass';
  fs.writeFileSync(path.join(outRoot,'report.json'),JSON.stringify(report,null,2)+'\n');
  const lines=[
    '# Item 13.16 release gate',
    '',
    `- Decision: **${report.releaseDecision.toUpperCase()}**`,
    `- Blockers: **${report.blockers.length}**`,
    `- Advisories: **${report.advisories.length}**`,
    `- Policy version: **${report.policyVersion}**`,
    '',
    '## Gate execution',
    '',
    '| Gate | Severity | Status | Exit | Duration |',
    '| --- | --- | --- | ---: | ---: |'
  ];
  for(const gate of report.gates)lines.push(`| ${gate.label} | ${gate.severity} | ${gate.status} | ${gate.exitCode??'—'} | ${gate.durationMs} ms |`);
  lines.push('','## Blockers','');if(report.blockers.length)for(const x of report.blockers)lines.push(`- **${x.type}** — \`${JSON.stringify(x)}\``);else lines.push('- None.');
  lines.push('','## Advisories','');if(report.advisories.length)for(const x of report.advisories)lines.push(`- **${x.type}** — \`${JSON.stringify(x)}\``);else lines.push('- None.');
  lines.push('','## Evidence summary','', '```json',JSON.stringify(report.evidence,null,2),'```','');
  fs.writeFileSync(path.join(outRoot,'REPORT.md'),lines.join('\n')+'\n');
}

let server=null;let serverLogFd=null;let serverReady=externalServer;
try{
  const preflight=policy.gates.filter(g=>g.phase==='preflight');
  for(const gate of preflight)runCommandGate(gate);

  const buildGates=policy.gates.filter(g=>g.phase==='build');
  let buildPassed=true;
  for(const gate of buildGates){const row=runCommandGate(gate);if(gate.severity==='blocker'&&row.status!=='pass')buildPassed=false;}

  if(buildPassed){
    if(externalServer)serverReady=await waitForServer(serverUrl,null,10000);
    else {
      serverLogFd=fs.openSync(path.join(outRoot,'server.log'),'a');
      server=spawn('python3',['-m','http.server','4173','--directory','_site'],{cwd:process.cwd(),stdio:['ignore',serverLogFd,serverLogFd]});
      serverReady=await waitForServer(serverUrl,server,15000);
    }
  }
  if(!serverReady)blocker('release-server-unavailable',{url:serverUrl,buildPassed});

  const browserGates=policy.gates.filter(g=>g.phase==='browser');
  for(const gate of browserGates){
    if(!serverReady){recordBlockedGate(gate,'production release server unavailable');continue;}
    runCommandGate(gate,{TEST_URL:serverUrl});
  }

  evaluateSemanticEvidence();
}catch(error){
  blocker('release-gate-runner-error',{error:String(error?.stack||error)});
}finally{
  if(server&&server.exitCode===null)server.kill('SIGTERM');
  if(serverLogFd!==null)try{fs.closeSync(serverLogFd)}catch{}
  writeReport();
}

console.log(JSON.stringify({releaseGate:report.releaseDecision,blockers:report.blockers.length,advisories:report.advisories.length,report:path.join(outRoot,'REPORT.md')},null,2));
if(report.releaseDecision!=='pass')process.exit(1);
