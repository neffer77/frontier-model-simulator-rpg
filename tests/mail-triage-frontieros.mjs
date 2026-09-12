import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve('artifacts/mail-triage');fs.mkdirSync(out,{recursive:true});
const report={version:3,item:'P5.3.7',status:'running',surfaces:{},pageErrors:[]};
const write=(name,data)=>fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2)+'\n');
const matrix=JSON.parse(fs.readFileSync('visual-qa/responsive-matrix.json','utf8')).viewports;
const shot=(page,name)=>page.screenshot({path:path.join(out,name+'.png'),fullPage:true});
const finance=page=>page.evaluate(()=>({cash:state.cash,portfolio:state.portfolioStrategy,gates:state.investmentCommittee.gates,decisions:state.investmentCommittee.decisions,requests:state.investmentCommittee.mailRequests}));
async function target(page,el){await el.scrollIntoViewIfNeeded();const b=await el.boundingBox();assert(b.height>=44,'Small target: '+JSON.stringify(b));assert(b.x>=0);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Document overflow');assert.equal(await page.locator('.gameplay-bottom-nav:visible').count(),0)}
async function rowContext(page,id,status,name=null){
 const row=page.locator('[data-fm-thread="'+id+'"]');await target(page,row);
 assert.equal(await row.locator('[data-fm-row-status]').getAttribute('data-fm-row-status'),status);
 assert.equal(await row.locator('.fm-row-decision-label').textContent(),status==='pending'?'Awaiting your decision':'Delegated review');
 assert.equal(await row.locator('button,select,input').count(),0,'Rows must not add nested decision controls');
 if(status==='pending')assert.equal(await row.locator('.fm-row-reviewer').count(),0);
 else{
  const reviewer=row.locator('.fm-row-reviewer');assert.equal(await reviewer.textContent(),name?'Reviewer: '+name:'Reviewer unavailable');
  assert.equal(await reviewer.getAttribute('data-fm-reviewer-status'),name?'available':'unavailable');
  assert.equal(await reviewer.locator('*').count(),0,'Reviewer names must be escaped text');
 }
 assert(await row.evaluate(el=>[...el.querySelectorAll('.fm-row-decision-label,.fm-row-reviewer')].every(part=>{const a=el.getBoundingClientRect(),b=part.getBoundingClientRect();return b.left>=a.left&&b.right<=a.right+1&&part.scrollWidth<=part.clientWidth+1})),'Decision context overflows its row');
 return row;
}
let browser;
async function returnAfterReload(page,button,threadId,folder){
 const before=await finance(page),mail=await page.evaluate(()=>frontierMailExport());
 await page.getByRole('button',{name:button,exact:true}).click();
 await page.getByRole('button',{name:'← Back to request',exact:true}).waitFor({state:'visible'});
 assert((await page.evaluate(()=>frontierOsSessionSnapshot().current.detail)).endsWith('/from/'+folder),'Cross-app route lost Mail origin');
 await page.reload({waitUntil:'domcontentloaded'});
 const back=page.getByRole('button',{name:'← Back to request',exact:true});await back.waitFor({state:'visible'});await target(page,back);await back.click();
 await page.waitForFunction(({threadId,folder})=>frontierMailSnapshot().threadId===threadId&&frontierMailSnapshot().folder===folder,{threadId,folder});
 assert.deepEqual(await finance(page),before,'Reload/return changed Finance');assert.deepEqual(await page.evaluate(()=>frontierMailExport()),mail,'Reload/return changed Mail history');
}
async function run(v){
 const context=await browser.newContext({viewport:{width:v.width,height:v.height},isMobile:v.isMobile,hasTouch:v.hasTouch});
 await context.tracing.start({screenshots:true,snapshots:true,sources:true});const page=await context.newPage();page.setDefaultTimeout(12000);
 page.on('pageerror',e=>report.pageErrors.push(v.id+': '+String(e.stack||e)));
 try{
  const url=new URL(process.env.TEST_URL||'http://127.0.0.1:4173/');url.searchParams.set('frontieros',v.isMobile?'1':'desktop');
  await page.goto(url.href,{waitUntil:'networkidle'});await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()});await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.frontierFinanceRequestFunding&&window.frontierMailSnapshot);
  await page.evaluate(()=>{state.started=true;state.day=8;state.cash=30000000;state.cashM=30;state.activeRun=null;state.selectedIncident=null;ensureInvestmentCommittee();save()});
  await page.evaluate(()=>frontierOsNavigate('finance',{detail:'runway'}));await page.locator('[data-fin-view="committee"]').click();await page.locator('[data-fin-propose="research"]').click();
  const id=await page.evaluate(()=>state.portfolioStrategy.initiatives.at(-1).id);
  await page.locator('[data-fin-mail-request="'+id+'"]').click();await page.locator('[data-fm-decision-status="pending"]').waitFor({state:'visible'});
  const original=await page.evaluate(()=>({threadId:frontierMailSnapshot().threadId,request:fundingMailRequest(frontierMailExport().threads.find(t=>t.id===frontierMailSnapshot().threadId).decisionRequest.id)}));
  await page.getByRole('button',{name:'Attach evidence',exact:true}).click();await page.getByRole('button',{name:'Open snapshot',exact:true}).waitFor({state:'visible'});
  const fixtures=await page.evaluate(async id=>{
   const source=structuredClone(state.portfolioStrategy.initiatives.find(i=>i.id===id)),results={};
   for(const kind of ['delegated','stale','missing']){
    const item={...structuredClone(source),id:id+'-'+kind,name:'Triage '+kind};state.portfolioStrategy.initiatives.push(item);
    results[kind]=await frontierDispatchCommand('finance.funding.mail.request',{initiativeId:item.id});
   }
   await frontierDispatchCommand('mail.decision.respond',{threadId:results.delegated.threadId,action:'delegate',delegateId:'priya',expectedRevision:0});
   state.portfolioStrategy.initiatives.find(i=>i.id===id+'-stale').risk+=.1;
   state.investmentCommittee.mailRequests=state.investmentCommittee.mailRequests.filter(r=>r.id!==results.missing.requestId);evaluatePortfolioStrategy();save();results.reviewerName=fundingMailStatus(results.delegated.requestId).delegates.find(e=>e.id==='priya').name;return results;
  },id);
  await page.getByRole('button',{name:'Archive',exact:true}).click();assert.equal((await page.evaluate(()=>frontierMailSnapshot())).threadId,null,'Archiving from Inbox returns to the list');
  assert.equal(await page.locator('[data-fm-row-status]').count(),0,'Ordinary folders keep their existing row content');
  let before=await finance(page);const triage=page.locator('[data-fm-folder="needs-decision"]');await target(page,triage);await triage.click();
  await page.waitForFunction(()=>frontierOsSessionSnapshot().current.detail==='needs-decision');
  const snap=await page.evaluate(()=>frontierMailSnapshot());assert.equal(snap.counts['needs-decision'],2);assert.deepEqual(new Set(snap.visibleThreadIds),new Set([original.threadId,fixtures.delegated.threadId]));assert.deepEqual(await finance(page),before);
  await rowContext(page,original.threadId,'pending');await rowContext(page,fixtures.delegated.threadId,'delegated',fixtures.reviewerName);
  assert(await page.locator('[data-fm-folder="needs-decision"]').getAttribute('aria-current')==='page');await shot(page,v.id+'-triage');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>frontierMailSnapshot().folder==='needs-decision');
  assert.equal((await page.evaluate(()=>frontierMailSnapshot())).visibleThreadIds.length,2);
  await rowContext(page,original.threadId,'pending');await rowContext(page,fixtures.delegated.threadId,'delegated',fixtures.reviewerName);
  await page.getByLabel('Search mail',{exact:true}).fill('Triage delegated');assert.equal(await page.locator('[data-fm-thread]').count(),1);
  await page.getByLabel('Search mail',{exact:true}).fill('no matching request');assert.equal(await page.locator('[data-fm-thread]').count(),0);assert(await page.locator('.fm-empty').textContent().then(s=>s.includes('match this search')));
  await page.getByLabel('Search mail',{exact:true}).fill('');
  await page.locator('[data-fm-thread="'+fixtures.delegated.threadId+'"]').click();await page.getByLabel('Committee reviewer',{exact:true}).selectOption('maya');
  const delegate=page.getByRole('button',{name:'Delegate review',exact:true});await target(page,delegate);await delegate.click();
  await page.waitForFunction(id=>fundingMailRequest(id)?.delegateId==='maya'&&document.querySelector('[data-fm-decision-result]')?.textContent.includes('Reviewer: '+state.npcEmployees.find(e=>e.id==='maya').name),fixtures.delegated.requestId);
  await page.getByRole('button',{name:'Back to message list',exact:true}).click();
  const reviewerState=await page.evaluate(()=>({name:state.npcEmployees.find(e=>e.id==='maya').name,committeeIds:structuredClone(state.investmentCommittee.committeeIds)}));
  await rowContext(page,fixtures.delegated.threadId,'delegated',reviewerState.name);
  const {requests:oldRequests,...resourcesBefore}=before,{requests:newRequests,...resourcesAfter}=await finance(page);assert.deepEqual(resourcesAfter,resourcesBefore,'Reassignment must not fund or progress an initiative');assert.equal(newRequests.length,oldRequests.length);
  const history=await page.evaluate(()=>frontierMailExport()),longName='Maya <b>Current reviewer</b> '+ 'LongName'.repeat(18);
  await page.evaluate(name=>{state.npcEmployees.find(e=>e.id==='maya').name=name;save()},longName);before=await finance(page);await triage.click();
  const renamed=await rowContext(page,fixtures.delegated.threadId,'delegated',longName);
  assert(await renamed.locator('.fm-row-reviewer').evaluate(el=>el.getBoundingClientRect().height>Number.parseFloat(getComputedStyle(el).lineHeight)*2),'Long reviewer names must wrap');
  assert.deepEqual(await page.evaluate(()=>frontierMailExport()),history,'A current name must not rewrite historical Mail');assert.deepEqual(await finance(page),before);await shot(page,v.id+'-reviewer-wrap');
  await page.evaluate(()=>{state.investmentCommittee.committeeIds=state.investmentCommittee.committeeIds.filter(id=>id!=='maya');save()});before=await finance(page);await triage.click();
  await rowContext(page,fixtures.delegated.threadId,'delegated');assert.equal((await page.evaluate(()=>frontierMailSnapshot())).counts['needs-decision'],2,'Missing reviewer must not hide an actionable request');
  assert.deepEqual(await page.evaluate(()=>frontierMailExport()),history);assert.deepEqual(await finance(page),before);await shot(page,v.id+'-reviewer-unavailable');
  await page.evaluate(prior=>{state.npcEmployees.find(e=>e.id==='maya').name=prior.name;state.investmentCommittee.committeeIds=prior.committeeIds;save()},reviewerState);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>frontierMailSnapshot().folder==='needs-decision');await rowContext(page,fixtures.delegated.threadId,'delegated',reviewerState.name);assert.deepEqual(await page.evaluate(()=>frontierMailExport()),history);before=await finance(page);
  const row=page.locator('[data-fm-thread="'+original.threadId+'"]');await target(page,row);await row.click();
  await page.waitForFunction(id=>frontierOsSessionSnapshot().current.detail==='thread/'+id+'/from/needs-decision',original.threadId);
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-fm-decision-status="pending"]').waitFor({state:'visible'});
  assert.equal((await page.evaluate(()=>frontierMailSnapshot())).folder,'needs-decision');
  await returnAfterReload(page,'Open Finance',original.threadId,'needs-decision');
  assert.equal((await page.evaluate(()=>frontierMailSnapshot())).threadId,original.threadId);
  await returnAfterReload(page,'Open snapshot',original.threadId,'needs-decision');
  await page.getByRole('button',{name:'Back to message list',exact:true}).click();assert.equal((await page.evaluate(()=>frontierMailSnapshot())).folder,'needs-decision');await row.click();
  const legacy=await page.evaluate(()=>{const t=frontierMailExport().threads.find(t=>t.id===frontierMailSnapshot().threadId),a=t.attachments[0];return [{app:'finance',detail:['initiative',t.linkedEntity.initiativeId,'return',t.id].map(encodeURIComponent).join('/')},{app:'artifacts',detail:['finance-evidence',a.requestId,a.id,'return',t.id].map(encodeURIComponent).join('/')} ]});
  for(const route of legacy){
   await page.evaluate(({app,detail})=>frontierOsNavigate(app,{detail}),route);await page.getByRole('button',{name:'← Back to request',exact:true}).waitFor({state:'visible'});
   await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'← Back to request',exact:true}).click();
   await page.waitForFunction(id=>frontierMailSnapshot().threadId===id,original.threadId);assert.equal((await page.evaluate(()=>frontierOsSessionSnapshot().current.detail)),'thread/'+original.threadId,'Legacy links retain the plain-thread route');
  }
  await page.getByRole('button',{name:'Back to message list',exact:true}).click();await triage.click();await row.click();
  assert.deepEqual(await finance(page),before,'Triage and cross-app reads changed Finance');
  const approve=page.getByRole('button',{name:'Approve $0.60M',exact:true});await target(page,approve);await approve.click();await page.locator('[data-fm-decision-status="approved"]').waitFor({state:'visible'});
  assert.equal((await page.evaluate(()=>frontierMailSnapshot())).threadId,original.threadId,'Decision must not switch to another request');
  assert.equal((await page.evaluate(()=>frontierMailSnapshot())).counts['needs-decision'],1);
  assert.equal((await finance(page)).cash,before.cash-600000);await shot(page,v.id+'-decided');
  await returnAfterReload(page,'Open Finance',original.threadId,'needs-decision');
  await returnAfterReload(page,'Open snapshot',original.threadId,'needs-decision');
  assert.equal((await page.evaluate(()=>frontierMailSnapshot())).counts['needs-decision'],1,'Returning to a closed request must not restore it to triage');
  await page.getByRole('button',{name:'Back to message list',exact:true}).click();
  await page.locator('[data-fm-thread="'+fixtures.delegated.threadId+'"]').click();await page.locator('[data-fm-decision-status="delegated"]').waitFor({state:'visible'});
  await page.getByRole('button',{name:'Reject request',exact:true}).click();await page.locator('[data-fm-decision-status="rejected"]').waitFor({state:'visible'});
  await page.getByRole('button',{name:'Back to message list',exact:true}).click();assert.equal(await page.locator('[data-fm-thread]').count(),0);assert((await page.locator('.fm-empty').textContent()).includes('No Finance requests need a decision'));await shot(page,v.id+'-empty');
  const archive=page.locator('[data-fm-folder="archive"]');await target(page,archive);await archive.click();assert.equal(await page.locator('[data-fm-row-status]').count(),0);await page.locator('[data-fm-thread="'+original.threadId+'"]').click();
  assert.equal((await page.evaluate(()=>frontierMailSnapshot())).threadId,original.threadId);assert(await page.getByRole('button',{name:'Move to inbox',exact:true}).isVisible());assert(await page.getByRole('button',{name:'Open snapshot',exact:true}).isVisible());
  await returnAfterReload(page,'Open snapshot',original.threadId,'archive');await page.getByRole('button',{name:'Back to message list',exact:true}).click();
  assert.equal((await page.evaluate(()=>frontierMailSnapshot())).folder,'archive');assert(await page.locator('[data-fm-thread="'+original.threadId+'"]').isVisible());await shot(page,v.id+'-archive-return');
  const evidence=await page.evaluate(()=>({mail:frontierMailExport(),view:frontierMailSnapshot(),state,events:frontierEventJournal({limit:600}),bundle:frontierCreateDebugBundle({reason:'mail-triage-qa'})}));write(v.id+'-evidence.json',evidence);
  report.surfaces[v.id]={status:'pass',canonicalFiltering:true,canonicalReviewer:true,reassignment:true,currentNameEscaping:true,longNameWrapping:true,missingReviewer:true,archivedRequestVisible:true,search:true,reload:true,crossAppReturn:true,crossAppReloadFolder:true,legacyReturnLinks:true,archiveReturn:true,closedSelectionPreserved:true,historyPreserved:true};
 }catch(error){report.surfaces[v.id]={status:'fail',error:String(error.stack||error)};await shot(page,v.id+'-failure').catch(()=>{});write(v.id+'-failure.json',await page.evaluate(()=>({state,mail:window.frontierMailExport?.(),view:window.frontierMailSnapshot?.(),events:window.frontierEventJournal?.({limit:600})})).catch(()=>({unavailable:true})));fs.writeFileSync(path.join(out,v.id+'-failure.html'),await page.content().catch(()=>''));throw error}
 finally{await context.tracing.stop({path:path.join(out,v.id+'-trace.zip')});await context.close()}
}
try{browser=await chromium.launch({headless:true});for(const v of matrix)await run(v);assert.equal(report.pageErrors.length,0,report.pageErrors.join(' | '));report.status='pass'}
catch(error){report.status='fail';report.error=String(error.stack||error);throw error}
finally{await browser?.close();write('report.json',report);fs.writeFileSync(path.join(out,'REPORT.md'),'# P5.3.7 Mail folder context across app reloads\n\nStatus: **'+report.status.toUpperCase()+'**\n\nFive canonical viewports: actual triage, search, archive, request, reassignment, decision and cross-app return clicks; Finance/Artifacts reloads retain the original thread and folder, including closed requests and Archive. Legacy return links remain supported. Canonical reviewer labels, missing reviewers, escaped long names and unchanged historical evidence remain checked. Screenshots, traces and state/events retained on failure and success.\n\nPhysical iPhone/PWA verification remains manual.\n'+(report.error||''))}
console.log('Mail triage cross-device journeys passed');
