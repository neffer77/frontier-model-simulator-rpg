import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const out=path.resolve('artifacts/mail-evidence');fs.mkdirSync(out,{recursive:true});
const report={version:1,item:'P5.3.4',status:'running',surfaces:{},pageErrors:[],evidence:[]};
const write=(file,data)=>fs.writeFileSync(path.join(out,file),JSON.stringify(data,null,2)+'\n');
const matrix=JSON.parse(fs.readFileSync('visual-qa/responsive-matrix.json','utf8')).viewports;
let browser;
async function snapshot(page){return page.evaluate(()=>{
  const mail=frontierMailExport(),thread=mail.threads.find(t=>t.id===frontierMailSnapshot().threadId),request=fundingMailRequest(thread.decisionRequest.id);
  return {thread,request,cash:state.cash,portfolio:state.portfolioStrategy,npcs:state.npcEmployees,gates:state.investmentCommittee.gates,decisions:state.investmentCommittee.decisions,artifactLab:state.artifactLab};
})}
async function shot(page,name){await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});report.evidence.push(name+'.png')}
async function layout(page,locator){
  await locator.scrollIntoViewIfNeeded();const box=await locator.boundingBox();assert(box.height>=44,'Target below 44px: '+JSON.stringify({text:await locator.textContent(),box}));assert(box.x>=0);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.equal(await page.locator('.gameplay-bottom-nav:visible').count(),0);
  const bounds=await locator.evaluate(el=>({right:el.getBoundingClientRect().right,edge:el.closest('.frontieros-window-body')?.getBoundingClientRect().right||innerWidth}));
  assert(bounds.right<=bounds.edge+1,'Control escapes its surface');
}
async function run(v){
  const name=v.id,full=['phone-portrait','desktop'].includes(name);
  const context=await browser.newContext({viewport:{width:v.width,height:v.height},isMobile:v.isMobile,hasTouch:v.hasTouch});
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});const page=await context.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',error=>report.pageErrors.push(name+': '+String(error.stack||error)));
  try{
    const url=new URL(process.env.TEST_URL||'http://127.0.0.1:4173/');url.searchParams.set('frontieros',v.isMobile?'1':'desktop');
    await page.goto(url.href,{waitUntil:'networkidle'});await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()});await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.frontierFinanceRequestFunding&&window.frontierMailSnapshot&&window.fundingEvidenceSnapshot);
    await page.evaluate(()=>{state.started=true;state.day=8;state.cash=30000000;state.cashM=30;state.activeRun=null;state.selectedIncident=null;ensureInvestmentCommittee();save()});
    assert.equal((await page.evaluate(()=>frontierOsNavigate('finance',{detail:'runway'}))).ok,true);
    await page.locator('[data-fin-view="committee"]').click();await page.locator('[data-fin-propose="research"]').click();
    const initiativeId=await page.evaluate(()=>state.portfolioStrategy.initiatives.at(-1).id);
    await page.locator('[data-fin-mail-request="'+initiativeId+'"]').click();await page.locator('[data-fm-decision-status="pending"]').waitFor({state:'visible'});
    if(full){await page.getByLabel('Committee reviewer',{exact:true}).selectOption('priya');await page.getByRole('button',{name:'Delegate review',exact:true}).click();await page.locator('[data-fm-decision-status="delegated"]').waitFor({state:'visible'})}
    const before=await snapshot(page),attach=page.getByRole('button',{name:'Attach evidence',exact:true});
    await layout(page,attach);await shot(page,name+'-before');await attach.click();
    await page.getByRole('button',{name:'Open snapshot',exact:true}).waitFor({state:'visible'});
    const after=await snapshot(page),entry=after.request.audit.at(-1),record=entry.evidence;
    assert.equal(entry.action,'attach-evidence');assert.equal(after.request.status,before.request.status);assert.equal(after.request.revision,before.request.revision+1);
    for(const key of ['cash','portfolio','npcs','gates','decisions','artifactLab'])assert.deepEqual(after[key],before[key],name+': capture changed '+key);
    assert.equal(after.thread.id,before.thread.id);assert.equal(after.thread.attachments.length,1);assert.equal(after.thread.attachments[0].id,record.id);
    assert.equal(after.thread.messages.length,before.thread.messages.length+1);
    assert(await page.locator('[data-fm-decision="attach-evidence"]').isDisabled());assert(!await page.locator('[data-fm-decision="approve"]').isDisabled());
    const retry={threadId:after.thread.id,action:'attach-evidence',expectedRevision:before.request.revision};
    assert.equal((await page.evaluate(p=>frontierDispatchCommand('mail.decision.respond',p),retry)).status,'reused');assert.deepEqual(await snapshot(page),after);
    const open=page.getByRole('button',{name:'Open snapshot',exact:true});await layout(page,open);await shot(page,name+'-attached');await open.click();
    await page.locator('[data-a-evidence-status="available"]').waitFor({state:'visible'});
    const viewer=await page.evaluate(()=>frontierArtifactsSnapshot());assert.deepEqual(viewer.evidence,record);assert.equal(viewer.returnThreadId,after.thread.id);
    assert.deepEqual(await snapshot(page),after,'Artifacts read changed owner state');
    const initialEvents=await page.evaluate(()=>frontierEventJournal({limit:600}));
    assert(initialEvents.some(e=>e.type==='finance.funding.evidence.recorded'));
    assert(initialEvents.some(e=>e.type==='mail.evidence.opened'));
    const text=await page.locator('[data-a-evidence-record]').textContent();
    assert(text.includes(record.initiative.name));assert(text.includes('READ ONLY'));assert(text.includes('Scenario assumptions'));
    const back=page.getByRole('button',{name:'← Back to request',exact:true});await layout(page,back);await shot(page,name+'-snapshot');
    if(full){
      await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-a-evidence-status="available"]').waitFor({state:'visible'});
      assert.deepEqual((await page.evaluate(()=>frontierArtifactsSnapshot())).evidence,record);
      assert.equal(await page.locator('[data-a-evidence-record]').textContent(),text);
    }
    await back.click();await page.getByRole('button',{name:'Open snapshot',exact:true}).waitFor({state:'visible'});
    assert.equal((await snapshot(page)).thread.id,after.thread.id);
    assert.equal((await page.evaluate(()=>frontierOsSessionSnapshot())).current.detail,'thread/'+after.thread.id);
    await page.getByRole('button',{name:full?'Approve $0.60M':'Reject request',exact:true}).click();
    await page.locator('[data-fm-decision-status="'+(full?'approved':'rejected')+'"]').waitFor({state:'visible'});
    const decided=await snapshot(page);assert.equal(decided.cash,after.cash-(full?600000:0));assert.equal(decided.request.audit.filter(a=>a.action==='attach-evidence').length,1);
    if(full)await page.evaluate(id=>{state.portfolioStrategy.initiatives=state.portfolioStrategy.initiatives.filter(i=>i.id!==id);state.investmentCommittee.scenarios={bull:.8,base:.1,bear:.1};save()},initiativeId);
    await open.click();await page.locator('[data-a-evidence-status="available"]').waitFor({state:'visible'});
    assert.deepEqual((await page.evaluate(()=>frontierArtifactsSnapshot())).evidence,record);
    assert.equal(await page.locator('[data-a-evidence-record]').textContent(),text,'Historical viewer changed with live inputs');
    if(full){await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-a-evidence-status="available"]').waitFor({state:'visible'});assert.equal(await page.locator('[data-a-evidence-record]').textContent(),text)}
    await shot(page,name+'-historical');
    const bundle=await page.evaluate(()=>frontierCreateDebugBundle({reason:'mail-evidence-qa'}));
    assert.equal(bundle.state.investmentCommittee.mailRequests.find(r=>r.id===record.requestId).audit.find(a=>a.action==='attach-evidence').evidence.id,record.id);
    assert.deepEqual(bundle.applicationState.financeEvidence.records.find(e=>e.id===record.id),record);
    assert.deepEqual(bundle.reproduction.applicationState.financeEvidence.records.find(e=>e.id===record.id),record);
    const events=[...initialEvents,...await page.evaluate(()=>frontierEventJournal({limit:600}))];
    assert(events.some(e=>e.type==='artifacts.evidence.rendered'));assert(events.some(e=>e.type==='mail.evidence.opened'));
    write(name+'-evidence.json',{before,after,record,viewer,events,bundle});report.evidence.push(name+'-evidence.json');
    if(full){
      // Simulate loss of the owner record. The viewer must not replace it with live data.
      await page.evaluate(id=>{const r=fundingMailRequest(id);r.audit=r.audit.filter(a=>a.action!=='attach-evidence');save()},record.requestId);
      await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-a-evidence-status="unavailable"]').waitFor({state:'visible'});
      assert.equal((await page.evaluate(()=>frontierArtifactsSnapshot())).evidence,null);await shot(page,name+'-missing-record');
      await back.click();assert(await page.locator('[data-fm-open-evidence]').isDisabled());assert.equal((await snapshot(page)).thread.id,after.thread.id);
    }
    report.surfaces[name]={status:'pass',threadId:after.thread.id,evidenceId:record.id,sha256:createHash('sha256').update(JSON.stringify(record)).digest('hex'),unchangedMoneyAndStatus:true,originalRecordAfterDecision:true,retry:true,reloadAndDeletedEntity:full,missingRecord:full};
  }catch(error){
    report.surfaces[name]={status:'fail',error:String(error.stack||error)};await shot(page,name+'-failure').catch(()=>{});
    fs.writeFileSync(path.join(out,name+'-failure.html'),await page.content().catch(()=>''));
    write(name+'-failure.json',await page.evaluate(()=>({state,mail:window.frontierMailExport?.(),events:window.frontierEventJournal?.({limit:600})})).catch(()=>({unavailable:true})));throw error;
  }finally{await context.tracing.stop({path:path.join(out,name+'-trace.zip')});report.evidence.push(name+'-trace.zip');await context.close()}
}
try{browser=await chromium.launch({headless:true});for(const v of matrix)await run(v);assert.equal(report.pageErrors.length,0,report.pageErrors.join(' | '));report.status='pass'}
catch(error){report.status='fail';report.error=String(error.stack||error);throw error}
finally{await browser?.close();report.generatedAt=new Date().toISOString();write('report.json',report);fs.writeFileSync(path.join(out,'REPORT.md'),'# P5.3.4 Mail evidence\n\nStatus: **'+report.status.toUpperCase()+'**\n\nFive canonical viewports, actual capture/open/return/decision clicks, immutable history, retries, reloads and missing records. Evidence includes screenshots, traces and state/events on failure as well as success.\n\nRuntime errors: '+report.pageErrors.length+'. Physical iPhone verification remains manual.\n'+(report.error?'\n'+report.error+'\n':''))}
console.log('Mail evidence cross-device journeys passed');
