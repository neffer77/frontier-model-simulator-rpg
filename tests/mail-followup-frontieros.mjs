import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve('artifacts/mail-followup');fs.mkdirSync(out,{recursive:true});
const report={version:1,item:'P5.3.3',status:'running',surfaces:{},pageErrors:[],evidence:[]};
const write=(file,data)=>fs.writeFileSync(path.join(out,file),JSON.stringify(data,null,2)+'\n');
const matrix=JSON.parse(fs.readFileSync('visual-qa/responsive-matrix.json','utf8')).viewports;
let browser;
async function snapshot(page){return page.evaluate(()=>{
  const mail=frontierMailExport(),thread=mail.threads.find(t=>t.id===frontierMailSnapshot().threadId),request=fundingMailStatus(thread.decisionRequest.id).request;
  return {thread,request,cash:state.cash,portfolio:state.portfolioStrategy,npcs:state.npcEmployees,gates:state.investmentCommittee.gates,decisions:state.investmentCommittee.decisions};
})}
async function shot(page,name){await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});report.evidence.push(name+'.png')}
async function run(v){
  const name=v.id,full=['phone-portrait','desktop'].includes(name);
  const context=await browser.newContext({viewport:{width:v.width,height:v.height},isMobile:v.isMobile,hasTouch:v.hasTouch});
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});const page=await context.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',error=>report.pageErrors.push(name+': '+String(error.stack||error)));
  try{
    const url=new URL(process.env.TEST_URL||'http://127.0.0.1:4173/');url.searchParams.set('frontieros',v.isMobile?'1':'desktop');
    await page.goto(url.href,{waitUntil:'networkidle'});await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()});await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.frontierFinanceRequestFunding&&window.frontierOsSessionSnapshot&&window.frontierMailSnapshot);
    await page.evaluate(()=>{state.started=true;state.day=8;state.cash=30000000;state.cashM=30;state.activeRun=null;state.selectedIncident=null;ensureInvestmentCommittee();save()});
    assert.equal((await page.evaluate(()=>frontierOsNavigate('finance',{detail:'runway'}))).ok,true);
    await page.locator('[data-fin-view="committee"]').click();await page.locator('[data-fin-propose="research"]').click();
    const initiativeId=await page.evaluate(()=>state.portfolioStrategy.initiatives.at(-1).id);
    await page.locator('[data-fin-mail-request="'+initiativeId+'"]').click();await page.locator('[data-fm-decision-status="pending"]').waitFor({state:'visible'});
    if(full){await page.getByLabel('Committee reviewer',{exact:true}).selectOption('priya');await page.getByRole('button',{name:'Delegate review',exact:true}).click();await page.locator('[data-fm-decision-status="delegated"]').waitFor({state:'visible'})}
    const before=await snapshot(page),button=page.getByRole('button',{name:'Ask follow-up',exact:true});
    await button.scrollIntoViewIfNeeded();const rect=await button.boundingBox();assert(rect.height>=44);assert(rect.x>=0&&rect.x+rect.width<=v.width+1);
    assert.equal(await page.locator('.gameplay-bottom-nav:visible').count(),0);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await shot(page,name+'-question');await button.click();
    await page.waitForFunction(()=>{const t=frontierMailExport().threads.find(t=>t.id===frontierMailSnapshot().threadId);return t.messages.some(m=>m.id.endsWith(':response'))});
    const after=await snapshot(page),entry=after.request.audit.at(-1);
    assert.equal(entry.action,'follow-up');assert.equal(entry.followUp.reviewerId,full?'priya':'maya');
    assert.equal(after.request.status,before.request.status);assert.equal(after.request.revision,before.request.revision+1);
    for(const key of ['cash','portfolio','npcs','gates','decisions'])assert.deepEqual(after[key],before[key],name+': follow-up changed '+key);
    assert.equal(after.thread.id,before.thread.id);assert.equal(after.thread.messages.length,before.thread.messages.length+2);
    assert.equal(after.thread.messages.at(-1).body,entry.followUp.response);assert.equal(after.thread.messages.at(-1).from,entry.followUp.reviewerName);
    assert(await page.locator('[data-fm-decision="follow-up"]').isDisabled());assert(!await page.locator('[data-fm-decision="approve"]').isDisabled());
    assert.equal(await page.locator('[data-fm-follow-up-status]').textContent(),'Explanation recorded below.');
    await page.getByText(entry.followUp.response,{exact:true}).scrollIntoViewIfNeeded();await shot(page,name+'-response');
    const payload={threadId:before.thread.id,action:'follow-up',expectedRevision:before.request.revision};
    assert.equal((await page.evaluate(p=>frontierDispatchCommand('mail.decision.respond',p),payload)).status,'reused');assert.deepEqual(await snapshot(page),after);
    const bundle=await page.evaluate(()=>frontierCreateDebugBundle({reason:'mail-followup-qa'}));
    assert.equal(bundle.state.investmentCommittee.mailRequests.find(r=>r.id===after.request.id).audit.at(-1).followUp.response,entry.followUp.response);
    assert.equal(bundle.applicationState.mail.current.threads.find(t=>t.id===after.thread.id).messages.at(-1).body,entry.followUp.response);
    const events=await page.evaluate(()=>frontierEventJournal({limit:600}));assert(events.some(e=>e.type==='finance.funding.follow-up.recorded'&&e.data.reviewerId===entry.followUp.reviewerId));
    write(name+'-evidence.json',{before,after,events,bundle});report.evidence.push(name+'-evidence.json');
    if(full){
      await page.getByRole('button',{name:'Open Finance',exact:true}).click();await page.getByRole('button',{name:'← Back to request',exact:true}).click();
      assert.equal((await snapshot(page)).thread.id,after.thread.id);
      assert.equal((await page.evaluate(()=>frontierOsSessionSnapshot())).current.detail,'thread/'+after.thread.id);
      await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(id=>window.frontierMailSnapshot?.().threadId===id,after.thread.id);
      assert.equal((await snapshot(page)).thread.messages.at(-1).body,entry.followUp.response);assert(await page.locator('[data-fm-decision="follow-up"]').isDisabled());
      await page.getByRole('button',{name:'Approve $0.60M',exact:true}).click();await page.locator('[data-fm-decision-status="approved"]').waitFor({state:'visible'});
      const approved=await snapshot(page);assert.equal(approved.cash,after.cash-600000);assert.equal(approved.gates[initiativeId].stage,1);
      assert.equal(approved.request.audit.filter(a=>a.action==='follow-up').length,1);await shot(page,name+'-approved');
    }else{await page.getByRole('button',{name:'Reject request',exact:true}).click();await page.locator('[data-fm-decision-status="rejected"]').waitFor({state:'visible'});assert.equal((await snapshot(page)).cash,after.cash)}
    report.surfaces[name]={status:'pass',reviewerId:entry.followUp.reviewerId,threadId:after.thread.id,unchangedMoneyAndStatus:true,oneResponse:true,retry:true,reloadAndReturn:full,subsequentDecision:full?'approve':'reject'};
  }catch(error){
    report.surfaces[name]={status:'fail',error:String(error.stack||error)};await shot(page,name+'-failure').catch(()=>{});
    fs.writeFileSync(path.join(out,name+'-failure.html'),await page.content().catch(()=>''));
    write(name+'-failure.json',await page.evaluate(()=>({state,mail:window.frontierMailExport?.(),events:window.frontierEventJournal?.({limit:600})})).catch(()=>({unavailable:true})));throw error;
  }finally{await context.tracing.stop({path:path.join(out,name+'-trace.zip')});report.evidence.push(name+'-trace.zip');await context.close()}
}
try{browser=await chromium.launch({headless:true});for(const v of matrix)await run(v);assert.equal(report.pageErrors.length,0,report.pageErrors.join(' | '));report.status='pass'}
catch(error){report.status='fail';report.error=String(error.stack||error);throw error}
finally{await browser?.close();report.generatedAt=new Date().toISOString();write('report.json',report);fs.writeFileSync(path.join(out,'REPORT.md'),'# P5.3.3 Mail follow-up\n\nStatus: **'+report.status.toUpperCase()+'**\n\nFive canonical viewports; real question and subsequent decision clicks; stable history, retry, owner evidence and phone/desktop reload/return. See report.json and per-surface screenshots, traces and event/state evidence.\n\nRuntime errors: '+report.pageErrors.length+'. Physical iPhone verification remains manual.\n'+(report.error?'\n'+report.error+'\n':''))}
console.log('Mail follow-up cross-device journeys passed');
