import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {chromium} from 'playwright';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const inventory=JSON.parse(fs.readFileSync('visual-qa/inventory.json','utf8'));
const matrix=JSON.parse(fs.readFileSync('visual-qa/responsive-matrix.json','utf8'));
const packageJson=JSON.parse(fs.readFileSync('package.json','utf8'));
const baselinePath=path.resolve('visual-qa/screenshot-baseline.json');
const outRoot=path.resolve(process.env.SCREENSHOT_REGRESSION_DIR||'artifacts/screenshot-regression');
const updateMode=process.argv.includes('--update')||process.env.SCREENSHOT_UPDATE==='1';
const baseline=fs.existsSync(baselinePath)?JSON.parse(fs.readFileSync(baselinePath,'utf8')):{status:'bootstrap-pending',captures:{}};
const autoSpecials=inventory.specialCaptures.filter(x=>!x.manual);
const expectedPerViewport=inventory.screens.length+autoSpecials.length;
const expectedCaptureCount=expectedPerViewport*matrix.viewports.length;

fs.rmSync(outRoot,{recursive:true,force:true});
fs.mkdirSync(outRoot,{recursive:true});

const report={version:1,item:'13.14',generatedAt:new Date().toISOString(),sourceUrl:url,updateMode,inventoryVersion:inventory.version,responsiveMatrixVersion:matrix.version,baselineStatus:baseline.status||'missing',expectedCaptureCount,captures:[],mismatches:[],missingBaseline:[],extraBaseline:[],missingCaptures:[],pageErrors:[],manualExclusions:inventory.specialCaptures.filter(x=>x.manual).map(x=>x.id)};
const candidate={
  version:1,item:'13.14',status:'active',description:'Deterministic SHA-256 baselines for Item 13.14 full-page Playwright screenshots.',inventoryVersion:inventory.version,responsiveMatrixVersion:matrix.version,playwrightVersion:packageJson.devDependencies?.playwright||null,expectedCaptureCount,generatedAt:new Date().toISOString(),
  capturePolicy:{
    routes:'Every visual-qa/inventory.json screen in graduated empty state',
    specials:'Every non-manual visual-qa/inventory.json special capture',
    screenshot:'Full-page PNG, deviceScaleFactor 1, animations disabled, caret hidden',
    deterministicRuntime:'UTC timezone, en-US locale, dark color scheme, reduced motion, fixed Date/build identity, seeded Math.random, deterministic randomUUID, and transient-overlay cleanup',
    comparison:'Exact SHA-256 plus PNG dimensions under the pinned Playwright/Chromium toolchain'
  },captures:{}
};

const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);
const sha256=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
function pngDimensions(buffer){const signature='89504e470d0a1a0a';if(buffer.length<24||buffer.subarray(0,8).toString('hex')!==signature)throw new Error('Screenshot buffer is not a PNG');return {width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20)}}
async function settle(page,ms=80){await page.waitForTimeout(ms);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
async function sync(page){await page.evaluate(()=>{window.frontierPageSweepSync?.();window.frontierResponsiveSync?.();window.frontierAccessibilitySync?.();window.frontierOverlaySync?.()});await settle(page,25)}
async function clearTransientOverlays(page){
  for(let i=0;i<20;i++){
    const top=await page.evaluate(()=>window.frontierOverlayTop?.()?.type||null);
    if(!top||top==='incident')break;
    if(!['story','milestone','modal','priority','more'].includes(top))break;
    await page.keyboard.press('Escape');await settle(page,35);await sync(page);
  }
}
async function goHome(page){await page.evaluate(()=>{if(typeof window.gameplayGoHome==='function')window.gameplayGoHome();else{state.view='company';save();render()}});await settle(page,70);await clearTransientOverlays(page);await sync(page)}
async function graduate(page){await page.evaluate(()=>{state.campaign||={version:1};state.campaign.graduated=true;state.campaign.companyPriority=state.campaign.companyPriority||'research';state.campaign.modelReviewed=true;save();render()});await settle(page,90);await clearTransientOverlays(page);await sync(page)}
async function availableEntrypoint(page,names){return page.evaluate(xs=>xs.find(name=>typeof window[name]==='function'&&window[name].length===0)||null,names)}
async function invoke(page,name){return page.evaluate(fn=>{try{if(typeof window[fn]!=='function')return {ok:false,error:'missing'};window[fn]();return {ok:true}}catch(error){return {ok:false,error:String(error?.stack||error)}}},name)}
async function seedRepresentativeModel(page){await page.evaluate(()=>{
  state.cashM=Math.max(Number(state.cashM||0),20);state.compute=Math.max(Number(state.compute||0),120000);state.research=Math.max(Number(state.research||0),8);state.reputation=Math.max(Number(state.reputation||0),12);
  if(!(state.models||[]).length){const p=typeof trainingPhysics==='function'?trainingPhysics(MODEL_TIERS[0]):{gpuHours:213,steps:45777};state.models=[{id:'visual-qa-model-1',name:'VISUAL-1',tier:'350M Dense',paramsB:.35,tokensB:12,steps:p.steps,score:61,day:state.day||1,architecture:{type:'Dense Transformer',parametersB:.35,activeParametersB:.35,contextLength:8192,precision:'BF16 mixed'},training:{status:'completed',startedDay:1,completedDay:state.day||1,config:{precision:'bf16'},history:[]},checkpoints:[],evals:[],experiments:[],postTraining:[],launches:[],incidents:[],costs:{trainingM:.2,simulatedH100h:p.gpuHours},capabilities:{},weaknesses:[],technicalDebt:[]}]}
  save();render();
});await settle(page,110);await clearTransientOverlays(page);await sync(page)}
async function seedIncident(page){await page.evaluate(()=>{const t=MODEL_TIERS.find(x=>x.id==='350m')||MODEL_TIERS[0];state.story||={};state.story.seen=[...(state.story.seen||[]).filter(x=>x!=='firstIncident'),'firstIncident'];state.story.active=null;state.activeRun={name:'VISUAL-INCIDENT',tier:t.id,progress:35,phase:'pretraining',physics:trainingPhysics(t),startedDay:state.day||1,loss:2.73,incident:'nan'};state.selectedIncident='nan';state.incidentTab='metrics';save();render()});await settle(page,100);await clearTransientOverlays(page);await sync(page)}
async function clearIncident(page){await page.evaluate(()=>{state.activeRun=null;state.selectedIncident=null;save();render()});await settle(page,70);await clearTransientOverlays(page);await sync(page)}
async function normalizeForCapture(page){await sync(page);await page.evaluate(()=>{window.scrollTo(0,0);const active=document.activeElement;if(active&&typeof active.blur==='function')active.blur()});await settle(page,40)}

function special(id){const item=autoSpecials.find(x=>x.id===id);if(!item)throw new Error(`Missing special capture definition: ${id}`);return item}
function expectedKey(viewportId,captureId){return `${viewportId}/${captureId}`}
function recordProblem(kind,row){report[kind].push(row)}
async function capture(page,viewport,id,label,stateClasses,extra={}){
  await normalizeForCapture(page);
  const buffer=await page.screenshot({fullPage:true,type:'png',animations:'disabled',caret:'hide'});
  const digest=sha256(buffer);const dims=pngDimensions(buffer);const key=expectedKey(viewport.id,id);
  const entry={sha256:digest,width:dims.width,height:dims.height,bytes:buffer.length,label,stateClasses,kind:extra.kind||'special',screenId:extra.screenId||null};candidate.captures[key]=entry;
  const expected=baseline.captures?.[key]||null;let status='match';
  if(!expected){status='missing-baseline';recordProblem('missingBaseline',{key,actual:entry})}
  else if(expected.sha256!==digest||Number(expected.width)!==dims.width||Number(expected.height)!==dims.height){status='mismatch';recordProblem('mismatches',{key,expected:{sha256:expected.sha256,width:expected.width,height:expected.height},actual:{sha256:digest,width:dims.width,height:dims.height,bytes:buffer.length}})}
  const row={key,viewport:viewport.id,id,label,status,...dims,bytes:buffer.length,sha256:digest,...extra};report.captures.push(row);
  if(updateMode||status!=='match'){const dir=path.join(outRoot,status==='match'?'current':'changed',viewport.id);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,`${slug(id)}.png`),buffer)}
  return row;
}

const browser=await chromium.launch({headless:true});
for(const viewport of matrix.viewports){
  const ctx=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},isMobile:viewport.isMobile,hasTouch:viewport.hasTouch,deviceScaleFactor:1,locale:'en-US',timezoneId:'UTC',colorScheme:'dark',reducedMotion:'reduce'});
  await ctx.addInitScript(()=>{
    const fixed=Date.UTC(2026,7,15,19,14,0);const RealDate=Date;
    globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return fixed}static parse(value){return RealDate.parse(value)}static UTC(...args){return RealDate.UTC(...args)}};
    let seed=0x1314c0de;Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
    let uuidCounter=0;try{Object.defineProperty(globalThis.crypto,'randomUUID',{configurable:true,value:()=>`1314c0de-0000-4000-8000-${(++uuidCounter).toString(16).padStart(12,'0')}`})}catch{}
    let visualBuild=Object.freeze({schemaVersion:1,buildId:'1314c0de0000',gitSha:'1314c0de0000'.repeat(3)+'1314',builtAt:'2026-08-15T19:14:00.000Z',ref:'visual-qa'});
    try{Object.defineProperty(globalThis,'__FRONTIER_BUILD__',{configurable:true,get(){return visualBuild},set(value){visualBuild=Object.freeze({...value,buildId:'1314c0de0000',gitSha:'1314c0de0000'.repeat(3)+'1314',builtAt:'2026-08-15T19:14:00.000Z',ref:'visual-qa'})}})}catch{}
  });
  const page=await ctx.newPage();const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e?.stack||e)));
  await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});
  await page.addStyleTag({content:'*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}html{scroll-behavior:auto!important}'});
  await settle(page,100);await sync(page);

  const founder=special('founder');await capture(page,viewport,'founder',founder.label,founder.requiredStates);
  const founderButton=page.getByRole('button',{name:/found the lab/i});if(!(await founderButton.count()))throw new Error(`${viewport.id}: founder CTA missing`);await founderButton.click();await settle(page,100);await sync(page);
  const story=special('story-intro');if(await page.locator('.story-overlay').count())await capture(page,viewport,'story-intro',story.label,story.requiredStates);else recordProblem('missingCaptures',{key:expectedKey(viewport.id,'story-intro'),reason:'story overlay not present'});
  await clearTransientOverlays(page);await goHome(page);
  const companyEarly=special('company-early');await capture(page,viewport,'company-early',companyEarly.label,companyEarly.requiredStates);

  const hasMenu=await page.evaluate(()=>typeof window.gameplayToggleMenu==='function');
  if(hasMenu){await page.evaluate(()=>window.gameplayToggleMenu());await settle(page,50);await sync(page);const moreLocked=special('more-locked');await capture(page,viewport,'more-locked',moreLocked.label,moreLocked.requiredStates);await page.evaluate(()=>window.gameplayCloseMenu?.());await settle(page,35);await clearTransientOverlays(page)}
  else recordProblem('missingCaptures',{key:expectedKey(viewport.id,'more-locked'),reason:'gameplayToggleMenu unavailable'});

  await page.evaluate(()=>window.gameplayGoTrain?.());await settle(page,180);await clearTransientOverlays(page);await sync(page);const trainingEmpty=special('training-empty');await capture(page,viewport,'training-empty',trainingEmpty.label,trainingEmpty.requiredStates);
  await goHome(page);await graduate(page);
  if(hasMenu){await page.evaluate(()=>window.gameplayToggleMenu());await settle(page,50);await sync(page);const moreUnlocked=special('more-unlocked');await capture(page,viewport,'more-unlocked',moreUnlocked.label,moreUnlocked.requiredStates);await page.evaluate(()=>window.gameplayCloseMenu?.());await settle(page,35);await clearTransientOverlays(page)}
  else recordProblem('missingCaptures',{key:expectedKey(viewport.id,'more-unlocked'),reason:'gameplayToggleMenu unavailable'});

  for(const screen of inventory.screens){
    await goHome(page);const entry=await availableEntrypoint(page,screen.entrypoints||[]);
    if(!entry){recordProblem('missingCaptures',{key:expectedKey(viewport.id,`route-${screen.id}`),reason:`No zero-argument entrypoint from ${(screen.entrypoints||[]).join(', ')}`});continue}
    const before=pageErrors.length;const result=await invoke(page,entry);if(!result.ok){recordProblem('missingCaptures',{key:expectedKey(viewport.id,`route-${screen.id}`),reason:`${entry} threw ${result.error}`});continue}
    await settle(page,90);await clearTransientOverlays(page);await sync(page);
    await capture(page,viewport,`route-${screen.id}`,screen.label,['unlocked','empty'],{kind:'route',screenId:screen.id,category:screen.category,entrypoint:entry});
    for(const error of pageErrors.slice(before))recordProblem('pageErrors',{viewport:viewport.id,screenId:screen.id,error});
  }

  await goHome(page);await seedRepresentativeModel(page);const companyPopulated=special('company-populated');await capture(page,viewport,'company-populated',companyPopulated.label,companyPopulated.requiredStates);
  await goHome(page);await seedIncident(page);const incident=special('training-incident');await capture(page,viewport,'training-incident',incident.label,incident.requiredStates);await clearIncident(page);await goHome(page);

  await clearTransientOverlays(page);
  if(await page.evaluate(()=>typeof window.showExplain==='function')){await page.evaluate(()=>showExplain('FLOPS'));await settle(page,60);await sync(page);const explainer=special('technical-explainer');await capture(page,viewport,'technical-explainer',explainer.label,explainer.requiredStates);await page.keyboard.press('Escape');await settle(page,35);await sync(page)}
  else recordProblem('missingCaptures',{key:expectedKey(viewport.id,'technical-explainer'),reason:'showExplain unavailable'});

  await clearTransientOverlays(page);
  if(await page.evaluate(()=>typeof window.gameFeelMilestone==='function')){await page.evaluate(()=>window.gameFeelMilestone('VISUAL QA','Representative milestone surface for the Item 13 screenshot baseline.'));await settle(page,60);await sync(page);const milestone=special('milestone');await capture(page,viewport,'milestone',milestone.label,milestone.requiredStates);await page.keyboard.press('Escape');await settle(page,35);await sync(page)}
  else recordProblem('missingCaptures',{key:expectedKey(viewport.id,'milestone'),reason:'gameFeelMilestone unavailable'});

  await clearTransientOverlays(page);
  if(await page.evaluate(()=>typeof window.campaignOpenPriority==='function')){await page.evaluate(()=>window.campaignOpenPriority());await settle(page,60);await sync(page);const priority=special('company-priority');await capture(page,viewport,'company-priority',priority.label,priority.requiredStates);await page.keyboard.press('Escape');await settle(page,35);await sync(page)}
  else recordProblem('missingCaptures',{key:expectedKey(viewport.id,'company-priority'),reason:'campaignOpenPriority unavailable'});

  await clearTransientOverlays(page);
  if(await page.evaluate(()=>typeof window.realismOpen==='function')){await page.evaluate(()=>window.realismOpen());await settle(page,80);await clearTransientOverlays(page);await sync(page);const realism=special('realism-audit');await capture(page,viewport,'realism-audit',realism.label,realism.requiredStates)}
  else recordProblem('missingCaptures',{key:expectedKey(viewport.id,'realism-audit'),reason:'realismOpen unavailable'});

  await goHome(page);
  if(await page.evaluate(()=>typeof window.replayOpen==='function')){await page.evaluate(()=>window.replayOpen());await settle(page,80);await clearTransientOverlays(page);await sync(page);const archive=special('run-archive');await capture(page,viewport,'run-archive',archive.label,archive.requiredStates)}
  else recordProblem('missingCaptures',{key:expectedKey(viewport.id,'run-archive'),reason:'replayOpen unavailable'});

  for(const error of pageErrors)if(!report.pageErrors.some(x=>x.viewport===viewport.id&&x.error===error))recordProblem('pageErrors',{viewport:viewport.id,error});
  await ctx.close();
}
await browser.close();

const expectedKeys=[];for(const viewport of matrix.viewports){for(const screen of inventory.screens)expectedKeys.push(expectedKey(viewport.id,`route-${screen.id}`));for(const item of autoSpecials)expectedKeys.push(expectedKey(viewport.id,item.id))}
for(const key of expectedKeys)if(!candidate.captures[key]&&!report.missingCaptures.some(x=>x.key===key))recordProblem('missingCaptures',{key,reason:'capture was not produced'});
const baselineKeys=new Set(Object.keys(baseline.captures||{}));const expectedKeySet=new Set(expectedKeys);for(const key of baselineKeys)if(!expectedKeySet.has(key))recordProblem('extraBaseline',{key});
fs.writeFileSync(path.join(outRoot,'candidate-baseline.json'),JSON.stringify(candidate,null,2)+'\n');fs.writeFileSync(path.join(outRoot,'report.json'),JSON.stringify(report,null,2)+'\n');
const lines=['# Screenshot regression report','',`- Baseline status: **${report.baselineStatus}**`,`- Expected captures: **${expectedCaptureCount}**`,`- Produced captures: **${report.captures.length}**`,`- Mismatches: **${report.mismatches.length}**`,`- Missing baseline entries: **${report.missingBaseline.length}**`,`- Missing captures: **${report.missingCaptures.length}**`,`- Runtime page errors: **${report.pageErrors.length}**`,'','| Viewport | Capture | Status | Size | SHA-256 |','| --- | --- | --- | --- | --- |'];for(const row of report.captures)lines.push(`| ${row.viewport} | ${row.id} | ${row.status} | ${row.width}×${row.height} | \`${row.sha256.slice(0,16)}…\` |`);fs.writeFileSync(path.join(outRoot,'REPORT.md'),lines.join('\n')+'\n');
if(updateMode){fs.writeFileSync(baselinePath,JSON.stringify(candidate,null,2)+'\n');console.log(`Updated screenshot baseline with ${Object.keys(candidate.captures).length}/${expectedCaptureCount} captures`)}
const incomplete=report.missingCaptures.length||report.pageErrors.length||report.captures.length!==expectedCaptureCount;
const baselineInactive=baseline.status!=='active'&&!updateMode;const regressions=report.mismatches.length||report.missingBaseline.length||report.extraBaseline.length;
if(incomplete){console.error(`Screenshot capture incomplete: ${report.captures.length}/${expectedCaptureCount}; missing=${report.missingCaptures.length}; pageErrors=${report.pageErrors.length}`);process.exit(1)}
if(baselineInactive){console.error(`Screenshot baseline is ${baseline.status||'missing'}. Review artifacts/screenshot-regression/current or changed, then run npm run visual:screenshot-baseline to activate it.`);process.exit(1)}
if(regressions&&!updateMode){console.error(`Screenshot regression failed: mismatches=${report.mismatches.length}, missingBaseline=${report.missingBaseline.length}, extraBaseline=${report.extraBaseline.length}`);process.exit(1)}
console.log(`Screenshot regression passed for ${inventory.screens.length} routes + ${autoSpecials.length} automated special captures across ${matrix.viewports.length} canonical viewports (${expectedCaptureCount} screenshots)`);
