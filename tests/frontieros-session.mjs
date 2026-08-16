import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const base=process.env.TEST_URL||'http://127.0.0.1:4173/';
const out=path.resolve('artifacts/frontieros-session');
const PHASE_TIMEOUT_MS=Number(process.env.OS_SESSION_PHASE_TIMEOUT_MS||12000);
const TEST_TIMEOUT_MS=Number(process.env.OS_SESSION_TEST_TIMEOUT_MS||90000);
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});

const startedAt=Date.now();
const progress={version:2,item:'P5.1.4',startedAt:new Date().toISOString(),phase:'bootstrap',phaseStartedAt:null,completed:[],status:'running'};
const errors=[];
let browser=null,activePage=null,phone=null,desktop=null,traceStarted=false;
const writeProgress=()=>fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify({...progress,elapsedMs:Date.now()-startedAt},null,2)+'\n');
function timeoutError(label,ms){const e=new Error(`P5.1.4 phase timeout: ${label} exceeded ${ms}ms`);e.code='PHASE_TIMEOUT';e.phase=label;e.timeoutMs=ms;return e}
async function bounded(promise,label,ms=PHASE_TIMEOUT_MS){let timer;try{return await Promise.race([Promise.resolve(promise),new Promise((_,reject)=>{timer=setTimeout(()=>reject(timeoutError(label,ms)),ms)})])}finally{clearTimeout(timer)}}
async function phase(label,fn,ms=PHASE_TIMEOUT_MS){
  const phaseStart=Date.now();progress.phase=label;progress.phaseStartedAt=new Date().toISOString();writeProgress();console.log(`[P5.1.4] START ${label}`);
  try{const result=await bounded(fn(),label,ms);progress.completed.push({phase:label,status:'pass',durationMs:Date.now()-phaseStart});console.log(`[P5.1.4] PASS ${label} ${Date.now()-phaseStart}ms`);writeProgress();return result}
  catch(error){progress.completed.push({phase:label,status:'fail',durationMs:Date.now()-phaseStart,error:String(error?.message||error)});writeProgress();throw error}
}
async function safeEval(page,fn,fallback=null,ms=2500){if(!page)return fallback;try{return await bounded(page.evaluate(fn),'failure-diagnostic-evaluate',ms)}catch{return fallback}}
async function captureFailure(error){
  progress.status='fail';progress.error=String(error?.stack||error);writeProgress();
  const page=activePage;
  const diagnostics={version:2,item:'P5.1.4',status:'fail',failedPhase:progress.phase,error:String(error?.stack||error),elapsedMs:Date.now()-startedAt,session:await safeEval(page,()=>window.frontierOsSessionSnapshot?.()),mobile:await safeEval(page,()=>window.frontierMobileShellSnapshot?.()),desktop:await safeEval(page,()=>window.frontierDesktopShellSnapshot?.()),events:await safeEval(page,()=>window.frontierEventJournal?.({type:'os.*',limit:80}),[]),url:page?.url?.()||null,pageErrors:errors};
  fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify(diagnostics,null,2)+'\n');
  fs.writeFileSync(path.join(out,'REPORT.md'),`# P5.1.4 Navigation, Notifications & Session\n\n- Status: **FAIL**\n- Failed phase: **${progress.phase}**\n- Elapsed: **${diagnostics.elapsedMs} ms**\n- Error: \`${String(error?.message||error).replace(/`/g,"'")}\`\n- Failure diagnostics: \`failure.json\`\n- Progress checkpoints: \`progress.json\`\n`);
  if(page)try{await bounded(page.screenshot({path:path.join(out,'failure.png'),fullPage:true}),'failure-screenshot',3000)}catch{}
  if(phone&&traceStarted)try{await bounded(phone.tracing.stop({path:path.join(out,'phone-trace.zip')}),'failure-trace-stop',5000)}catch{}
}

const globalWatchdog=setTimeout(()=>{console.error(`[P5.1.4] GLOBAL TIMEOUT ${TEST_TIMEOUT_MS}ms at ${progress.phase}`);progress.status='timeout';progress.error=`global timeout ${TEST_TIMEOUT_MS}ms`;writeProgress();process.exitCode=1;try{browser?.close()}catch{}},TEST_TIMEOUT_MS);

try{
  browser=await phase('launch-browser',()=>chromium.launch({headless:true}),15000);
  phone=await phase('create-phone-context',()=>browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}));
  await phase('start-phone-trace',async()=>{await phone.tracing.start({screenshots:true,snapshots:true,sources:true});traceStarted=true});
  const p=activePage=await phase('create-phone-page',()=>phone.newPage());p.setDefaultTimeout(8000);p.setDefaultNavigationTimeout(12000);p.on('pageerror',e=>errors.push(String(e?.stack||e)));
  await phase('phone-bootstrap',async()=>{await p.goto(`${base}${base.includes('?')?'&':'?'}frontieros=1`,{waitUntil:'domcontentloaded'});await p.evaluate(()=>{localStorage.clear();sessionStorage.clear()});await p.reload({waitUntil:'domcontentloaded'});await p.locator('.frontieros-phone-shell').waitFor({state:'visible'})},15000);
  await phase('phone-open-training',async()=>{const r=await bounded(p.evaluate(()=>frontierOsNavigate('training')),'evaluate:navigate-training',10000);assert.equal(r?.ok,true,`Training launch failed: ${JSON.stringify(r)}`);await p.locator('.frontieros-mobile-appbar').waitFor({state:'visible'})});
  await phase('phone-open-model-lab',async()=>{const r=await bounded(p.evaluate(()=>frontierOsNavigate('model-lab')),'evaluate:navigate-model-lab',10000);assert.equal(r?.ok,true,`Model Lab launch failed: ${JSON.stringify(r)}`)});
  let snap=await phase('phone-history-assertions',async()=>{const s=await p.evaluate(()=>frontierOsSessionSnapshot());assert.equal(s.history.length,2,'navigation history should contain exactly two app transitions');assert.equal(s.current.appId,'model-lab');assert.equal(s.canBack,true);assert.equal(s.recents[0].appId,'model-lab');return s});
  await phase('phone-back-forward',async()=>{let r=await bounded(p.evaluate(()=>frontierOsBack()),'evaluate:back',10000);assert.equal(r?.ok,true,`Back failed: ${JSON.stringify(r)}`);let s=await p.evaluate(()=>frontierOsSessionSnapshot());assert.equal(s.current.appId,'training','Back did not restore Run Monitor');assert.equal(s.history.length,2,'Back must not mutate history length');assert.equal(s.canForward,true,'Back must preserve forward stack');r=await bounded(p.evaluate(()=>frontierOsForward()),'evaluate:forward',10000);assert.equal(r?.ok,true,`Forward failed: ${JSON.stringify(r)}`);s=await p.evaluate(()=>frontierOsSessionSnapshot());assert.equal(s.current.appId,'model-lab','Forward did not restore Model Lab');assert.equal(s.history.length,2,'Forward must not mutate history length')});
  const note=await phase('phone-create-notification',async()=>{const n=await p.evaluate(()=>frontierOsNotify({title:'Run 1842 halted',body:'NaN detected. Open Run Monitor.',deepLink:'frontieros://training/run-1842',severity:'warn',source:'qa'}));assert(n.id,'notification id missing');assert.equal((await p.evaluate(()=>frontierOsSessionSnapshot())).unread,1);return n});
  await phase('phone-notification-center',async()=>{await p.evaluate(()=>frontierOsOpenNotificationCenter());await p.locator('.frontieros-notification-center').waitFor({state:'visible'});assert(await p.getByText('Run 1842 halted').isVisible(),'notification center did not render alert');await p.screenshot({path:path.join(out,'phone-notification-center.png'),fullPage:true})});
  await phase('phone-open-notification-deeplink',async()=>{await p.locator(`[data-note-open="${note.id}"]`).click();await p.waitForTimeout(100);snap=await p.evaluate(()=>frontierOsSessionSnapshot());assert.equal(snap.current.appId,'training','notification deep link did not open Run Monitor');assert.equal(snap.current.detail,'run-1842','deep-link detail was not preserved in history');assert.equal(snap.unread,0,'opening notification did not mark it read')});
  const beforeReload=await p.evaluate(()=>frontierOsSessionSnapshot());
  const restoredData=await phase('phone-reload-session-restore',async()=>{await p.reload({waitUntil:'domcontentloaded'});await p.locator('.frontieros-mobile-appbar').waitFor({state:'visible',timeout:8000});const restored=await p.evaluate(()=>frontierOsSessionSnapshot());const mobileRestored=await p.evaluate(()=>frontierMobileShellSnapshot());assert.equal(restored.current.appId,beforeReload.current.appId,'session current app metadata did not survive reload');assert.equal(mobileRestored.currentApp,'training','reload did not visually restore Run Monitor');assert.equal(restored.history.length,beforeReload.history.length,'history did not survive reload');assert(restored.recents.some(x=>x.appId==='training'),'recent apps did not survive reload');assert.equal(restored.notifications.length,beforeReload.notifications.length,'notification state did not survive reload');return{restored,mobileRestored}},15000);
  const {restored,mobileRestored}=restoredData;
  await phase('phone-restored-evidence',async()=>{await p.evaluate(()=>frontierOsOpenNotificationCenter());await p.screenshot({path:path.join(out,'phone-restored-session.png'),fullPage:true});await p.evaluate(()=>frontierOsCloseNotificationCenter());const events=await p.evaluate(()=>frontierEventJournal({type:'os.*',limit:250}));assert(events.some(e=>e.type==='os.session.restored'),'session restore event missing');assert(events.some(e=>e.type==='os.session.current-restored'&&e.data.appId==='training'),'current-app restore event missing');assert(events.some(e=>e.type==='os.navigation.changed'),'navigation event missing');assert(events.some(e=>e.type==='os.notification.opened'),'notification-open event missing')});
  await phase('close-phone',async()=>{await phone.tracing.stop({path:path.join(out,'phone-trace.zip')});traceStarted=false;await phone.close();phone=null},10000);

  desktop=await phase('create-desktop-context',()=>browser.newContext({viewport:{width:1440,height:1000}}));
  const d=activePage=await phase('create-desktop-page',()=>desktop.newPage());d.setDefaultTimeout(8000);d.setDefaultNavigationTimeout(12000);d.on('pageerror',e=>errors.push(String(e?.stack||e)));
  await phase('desktop-bootstrap',async()=>{await d.goto(`${base}${base.includes('?')?'&':'?'}frontieros=desktop`,{waitUntil:'domcontentloaded'});await d.evaluate(()=>{localStorage.clear();sessionStorage.clear();localStorage.setItem('frontieros.desktop','1')});await d.reload({waitUntil:'domcontentloaded'});await d.locator('.frontieros-desktop').waitFor({state:'visible'})},15000);
  const ds=await phase('desktop-navigation',async()=>{let r=await bounded(d.evaluate(()=>frontierOsNavigate('training')),'desktop:navigate-training',10000);assert.equal(r?.ok,true,`Desktop Training launch failed: ${JSON.stringify(r)}`);r=await bounded(d.evaluate(()=>frontierOsNavigate('model-lab')),'desktop:navigate-model-lab',10000);assert.equal(r?.ok,true,`Desktop Model Lab launch failed: ${JSON.stringify(r)}`);const s=await d.evaluate(()=>frontierOsSessionSnapshot());assert.equal(s.current.appId,'model-lab');assert(s.recents.some(x=>x.appId==='training')&&s.recents.some(x=>x.appId==='model-lab'),'desktop recents missing launched apps');return s});
  await phase('desktop-notification-center',async()=>{await d.evaluate(()=>frontierOsNotify({title:'Eval finished',body:'Benchmark complete.',appId:'evals'}));await d.evaluate(()=>frontierOsOpenNotificationCenter());await d.locator('.frontieros-notification-center').waitFor({state:'visible'});await d.screenshot({path:path.join(out,'desktop-notification-center.png'),fullPage:true});assert.equal(await d.locator('.frontieros-tray [data-os-notifications]').count(),1,'desktop notification control missing')});
  await phase('cleanup',async()=>{await desktop.close();desktop=null;await browser.close();browser=null},10000);
  assert.equal(errors.length,0,`runtime page errors: ${errors.join(' | ')}`);
  const report={version:2,item:'P5.1.4',status:'pass',generatedAt:new Date().toISOString(),durationMs:Date.now()-startedAt,phoneHistory:restored.history.length,phoneRecents:restored.recents.length,phoneNotifications:restored.notifications.length,restoredApp:mobileRestored.currentApp,desktopCurrent:ds.current.appId,pageErrors:errors.length,phases:progress.completed,evidence:['phone-notification-center.png','phone-restored-session.png','desktop-notification-center.png','phone-trace.zip','progress.json']};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(out,'REPORT.md'),`# P5.1.4 Navigation, Notifications & Session\n\n- Status: **PASS**\n- Duration: **${report.durationMs} ms**\n- Instrumented phases: **${report.phases.length}**\n- Phone back/forward history: **PASS**\n- Forward-stack preservation: **PASS**\n- Notification deep link: **PASS**\n- Notification read state: **PASS**\n- Reload app restoration: **${report.restoredApp}**\n- Recent apps: **PASS**\n- Desktop shell-aware navigation: **PASS**\n- Runtime page errors: **0**\n- Playwright trace: **captured**\n- Progress checkpoints: **captured**\n`);progress.status='pass';progress.phase='complete';writeProgress();console.log('P5.1.4 FrontierOS session regression passed');
}catch(error){
  await captureFailure(error);process.exitCode=1;
}finally{
  clearTimeout(globalWatchdog);
  if(phone)try{await bounded(phone.close(),'finally-close-phone',3000)}catch{}
  if(desktop)try{await bounded(desktop.close(),'finally-close-desktop',3000)}catch{}
  if(browser)try{await bounded(browser.close(),'finally-close-browser',5000)}catch{}
}
