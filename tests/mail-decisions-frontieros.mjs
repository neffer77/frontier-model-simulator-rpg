import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const base=process.env.TEST_URL||'http://127.0.0.1:4173/';
const out=path.resolve('artifacts/mail-decisions');
fs.mkdirSync(out,{recursive:true});
const report={version:1,item:'P5.3.2',status:'running',generatedAt:null,surfaces:{},pageErrors:[],evidence:[]};
const matrix=JSON.parse(fs.readFileSync('visual-qa/responsive-matrix.json','utf8')).viewports;
const write=(file,value)=>fs.writeFileSync(path.join(out,file),JSON.stringify(value,null,2)+'\n');
let browser;

async function checkpoint(page,name){
  const file=name+'.png';await page.screenshot({path:path.join(out,file),fullPage:true});report.evidence.push(file);
}
async function current(page){
  return page.evaluate(()=>{
    const mail=frontierMailSnapshot(),thread=mail.threads.find(t=>t.id===mail.threadId);
    const request=thread?.decisionRequest?fundingMailStatus(thread.decisionRequest.id).request:null;
    return {thread,request,cash:state.cash,gate:state.investmentCommittee.gates[request?.initiativeId]||{stage:0,spentM:0,evidence:0},decisions:state.investmentCommittee.decisions.filter(d=>d.id===request?.initiativeId)};
  });
}
async function waitStatus(page,status){await page.locator('[data-fm-decision-status="'+status+'"]').waitFor({state:'visible'});}
async function requestViaUi(page){
  const opened=await page.evaluate(()=>frontierOsNavigate('finance',{detail:'runway',source:'mail-decisions-qa'}));
  assert.equal(opened.ok,true,'Finance launch failed');
  await page.locator('[data-frontieros-native-app="finance"]').waitFor({state:'visible'});
  await page.locator('[data-fin-view="committee"]').click();
  await page.locator('[data-fin-propose="research"]').click();
  const id=await page.evaluate(()=>state.portfolioStrategy.initiatives.at(-1).id);
  const requestButton=page.locator('[data-fin-mail-request="'+id+'"]');
  assert((await requestButton.boundingBox()).height>=44,'Finance request touch target too short');
  await requestButton.click();
  await page.locator('[data-frontieros-native-app="mail"]').waitFor({state:'visible'});
  await waitStatus(page,'pending');
  const snap=await current(page);
  assert.equal(snap.request.initiativeId,id,'Request linked the wrong initiative');
  assert.equal(snap.thread.decisionRequest.type,'finance.funding-gate');
  assert.equal(snap.thread.messageCount,1);
  assert.equal(snap.request.revision,0);
  return snap;
}
async function assertLayout(page,label){
  const layout=await page.locator('.fm-decision').evaluate(root=>({
    viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
    controls:[...root.querySelectorAll('button,select')].map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,height:r.height}})
  }));
  assert(layout.documentWidth<=layout.viewport+1,label+': document overflow '+JSON.stringify(layout));
  assert.equal(layout.controls.length,4,label+': missing decision controls');
  assert(layout.controls.every(r=>r.height>=44&&r.left>=-1&&r.right<=layout.viewport+1),label+': unreachable decision controls '+JSON.stringify(layout));
  return layout;
}
async function run(surface,full){
  const label=surface.id;
  const context=await browser.newContext({viewport:{width:surface.width,height:surface.height},isMobile:surface.isMobile,hasTouch:surface.hasTouch});
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  const page=await context.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',error=>report.pageErrors.push(label+': '+String(error.stack||error)));
  try{
    const url=new URL(base);url.searchParams.set('frontieros',surface.isMobile?'1':'desktop');
    await page.goto(url.href,{waitUntil:'networkidle'});
    await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof window.frontierFinanceRequestFunding==='function'&&typeof window.frontierOsSessionSnapshot==='function'&&typeof window.frontierMailSnapshot==='function');
    await page.evaluate(()=>{state.started=true;state.day=8;state.cash=30000000;state.cashM=30;state.activeRun=null;state.selectedIncident=null;ensureInvestmentCommittee();save()});
    const before=await requestViaUi(page),layout=await assertLayout(page,label);
    await checkpoint(page,label+'-pending');
    if(!full){
      await page.getByRole('button',{name:'Reject request',exact:true}).click();
      await waitStatus(page,'rejected');
      assert.equal((await current(page)).cash,before.cash,label+': rejection spent cash');
      report.surfaces[label]={viewport:{width:surface.width,height:surface.height},layout,realClickReject:true};return;
    }

    // Delegation is explicit assignment, not an automatic funding decision.
    const delegateId=before.thread.decision.delegates.find(d=>d.id==='maya')?.id||before.thread.decision.delegates[0]?.id;
    assert(delegateId,label+': no canonical committee reviewers');
    await page.getByLabel('Committee reviewer',{exact:true}).selectOption(delegateId);
    await page.getByRole('button',{name:'Delegate review',exact:true}).click();
    await waitStatus(page,'delegated');
    const delegated=await current(page);
    assert.equal(delegated.cash,before.cash);assert.deepEqual(delegated.gate,before.gate);
    assert.equal(delegated.request.delegateId,delegateId);assert.equal(delegated.request.revision,1);
    assert.equal(delegated.thread.messageCount,2);assert.equal(delegated.request.audit.length,2);
    const retryDelegate=await page.evaluate(p=>frontierDispatchCommand('mail.decision.respond',p),{threadId:before.thread.id,action:'delegate',delegateId,expectedRevision:0});
    assert.equal(retryDelegate.status,'reused');assert.deepEqual(await current(page),delegated);
    await checkpoint(page,label+'-delegated');

    await page.getByRole('button',{name:'Open Finance',exact:true}).click();
    await page.locator('[data-frontieros-native-app="finance"]').waitFor({state:'visible'});
    const finance=await page.evaluate(()=>frontierFinanceSnapshot());
    assert.equal(finance.initiativeId,before.request.initiativeId);assert.equal(finance.returnThreadId,before.thread.id);
    await checkpoint(page,label+'-linked-finance');
    await page.getByRole('button',{name:'← Back to request',exact:true}).click();
    await waitStatus(page,'delegated');assert.equal((await current(page)).thread.id,before.thread.id);

    await page.getByRole('button',{name:'Approve $0.60M',exact:true}).click();
    await waitStatus(page,'approved');
    const approved=await current(page);
    assert.equal(approved.cash,before.cash-600000,label+': approval must spend exactly one tranche');
    assert.equal(approved.gate.stage,before.gate.stage+1);assert.equal(approved.decisions.length,before.decisions.length+1);
    assert.equal(approved.decisions.at(-1).requestId,before.request.id);assert.equal(approved.request.revision,2);
    assert.equal(approved.request.audit.length,3);assert.equal(approved.thread.messageCount,3);
    for(const action of ['approve','reject','delegate'])assert(await page.locator('[data-fm-decision="'+action+'"]').isDisabled());
    assert(await page.locator('[data-fm-decision-result]').evaluate(el=>el===document.activeElement),'Decision feedback lost keyboard focus');
    const retryApproval=await page.evaluate(p=>frontierDispatchCommand('mail.decision.respond',p),{threadId:before.thread.id,action:'approve',expectedRevision:1});
    assert.equal(retryApproval.status,'reused');assert.deepEqual(await current(page),approved);
    await checkpoint(page,label+'-approved');

    const bundle=await page.evaluate(()=>frontierCreateDebugBundle({reason:'mail-decisions-qa'}));
    assert.equal(bundle.state.investmentCommittee.mailRequests.find(r=>r.id===before.request.id).audit.length,3);
    assert.equal(bundle.applicationState.mail.current.threads.find(t=>t.id===before.thread.id).decisionRequest.id,before.request.id);
    assert(bundle.reproduction.applicationState.mail.start,'Replay mailbox start snapshot missing');
    const events=await page.evaluate(()=>frontierEventJournal({limit:600}));
    for(const type of ['command.started','command.completed','finance.funding.requested','finance.funding.responded','mail.decision.link.opened'])assert(events.some(e=>e.type===type),label+': telemetry missing '+type);
    write(label+'-evidence.json',{events,bundle});report.evidence.push(label+'-evidence.json');

    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(id=>window.frontierMailSnapshot?.().threadId===id,before.thread.id);
    await waitStatus(page,'approved');
    const restored=await current(page);
    assert.equal(restored.cash,approved.cash);assert.deepEqual(restored.request,approved.request);
    assert.equal(restored.thread.messageCount,3);assert.equal(restored.gate.stage,1);
    assert.equal(await page.getByRole('button',{name:'Approve $0.60M',exact:true}).isDisabled(),true);

    const rejectBefore=await requestViaUi(page);
    await page.getByRole('button',{name:'Reject request',exact:true}).click();await waitStatus(page,'rejected');
    const rejected=await current(page);
    assert.equal(rejected.cash,rejectBefore.cash);assert.deepEqual(rejected.gate,rejectBefore.gate);assert.equal(rejected.decisions.length,0);
    assert.equal(rejected.request.audit.at(-1).action,'reject');assert.equal(rejected.thread.messageCount,2);
    await checkpoint(page,label+'-rejected');

    const stale=await requestViaUi(page);
    await page.evaluate(()=>{state.cash=0;save();frontierMailOpenThread(frontierMailSnapshot().threadId)});
    assert(await page.getByRole('button',{name:'Approve $0.60M',exact:true}).isDisabled());
    assert(!await page.getByRole('button',{name:'Reject request',exact:true}).isDisabled());
    assert(await page.getByText('Insufficient portfolio cash to approve.',{exact:false}).isVisible());
    await page.evaluate(id=>{state.portfolioStrategy.initiatives=state.portfolioStrategy.initiatives.filter(i=>i.id!==id);save();frontierMailOpenThread(frontierMailSnapshot().threadId)},stale.request.initiativeId);
    assert(await page.getByRole('button',{name:'Initiative unavailable',exact:true}).isDisabled());
    for(const action of ['approve','reject','delegate'])assert(await page.locator('[data-fm-decision="'+action+'"]').isDisabled());
    await checkpoint(page,label+'-unavailable');
    report.surfaces[label]={layout,threadId:before.thread.id,requestId:before.request.id,approve:true,reject:true,delegate:true,exactlyOnce:true,linkedReturn:true,reload:true,insufficientCash:true,missingEntity:true,telemetry:true,debugBundle:true};
  }catch(error){
    report.surfaces[label]={status:'fail',error:String(error.stack||error)};
    await checkpoint(page,label+'-failure').catch(()=>{});
    fs.writeFileSync(path.join(out,label+'-failure.html'),await page.content().catch(()=>''));
    write(label+'-failure.json',await page.evaluate(()=>({state:typeof state==='undefined'?null:state,mail:window.frontierMailExport?.(),events:window.frontierEventJournal?.({limit:600})})).catch(()=>({unavailable:true})));
    throw error;
  }finally{
    const trace=label+'-trace.zip';await context.tracing.stop({path:path.join(out,trace)});report.evidence.push(trace);await context.close();
  }
}

try{
  browser=await chromium.launch({headless:true});
  for(const id of ['phone-portrait','desktop','phone-landscape','tablet','wide'])await run(matrix.find(v=>v.id===id),['phone-portrait','desktop'].includes(id));
  assert.equal(report.pageErrors.length,0,'Runtime errors: '+report.pageErrors.join(' | '));report.status='pass';
}catch(error){report.status='fail';report.error=String(error.stack||error);throw error}
finally{
  await browser?.close();report.generatedAt=new Date().toISOString();write('report.json',report);
  fs.writeFileSync(path.join(out,'REPORT.md'),'# P5.3.2 Mail decisions\n\n- Status: **'+report.status.toUpperCase()+'**\n- Surfaces: '+Object.keys(report.surfaces).join(', ')+'\n- Runtime errors: '+report.pageErrors.length+'\n- See report.json for assertions; per-surface screenshots, traces and event/state evidence accompany the report.\n- Physical iPhone sign-off remains manual.\n'+(report.error?'\nFailure: '+report.error+'\n':''));
}
console.log('P5.3.2 typed Mail decisions passed on five viewports');
