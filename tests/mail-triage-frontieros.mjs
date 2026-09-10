import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve('artifacts/mail-triage');fs.mkdirSync(out,{recursive:true});
const report={version:1,item:'P5.3.5',status:'running',surfaces:{},pageErrors:[]};
const write=(name,data)=>fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2)+'\n');
const matrix=JSON.parse(fs.readFileSync('visual-qa/responsive-matrix.json','utf8')).viewports;
const shot=(page,name)=>page.screenshot({path:path.join(out,name+'.png'),fullPage:true});
const finance=page=>page.evaluate(()=>({cash:state.cash,portfolio:state.portfolioStrategy,gates:state.investmentCommittee.gates,decisions:state.investmentCommittee.decisions,requests:state.investmentCommittee.mailRequests}));
async function target(page,el){await el.scrollIntoViewIfNeeded();const b=await el.boundingBox();assert(b.height>=44,'Small target: '+JSON.stringify(b));assert(b.x>=0);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Document overflow');assert.equal(await page.locator('.gameplay-bottom-nav:visible').count(),0)}
let browser;
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
   state.investmentCommittee.mailRequests=state.investmentCommittee.mailRequests.filter(r=>r.id!==results.missing.requestId);evaluatePortfolioStrategy();save();return results;
  },id);
  await page.getByRole('button',{name:'Archive',exact:true}).click();assert.equal((await page.evaluate(()=>frontierMailSnapshot())).threadId,null,'Archiving from Inbox returns to the list');
  const before=await finance(page),triage=page.locator('[data-fm-folder="needs-decision"]');await target(page,triage);await triage.click();
  await page.waitForFunction(()=>frontierOsSessionSnapshot().current.detail==='needs-decision');
  const snap=await page.evaluate(()=>frontierMailSnapshot());assert.equal(snap.counts['needs-decision'],2);assert.deepEqual(new Set(snap.visibleThreadIds),new Set([original.threadId,fixtures.delegated.threadId]));assert.deepEqual(await finance(page),before);
  assert(await page.locator('[data-fm-folder="needs-decision"]').getAttribute('aria-current')==='page');await shot(page,v.id+'-triage');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>frontierMailSnapshot().folder==='needs-decision');
  assert.equal((await page.evaluate(()=>frontierMailSnapshot())).visibleThreadIds.length,2);
  await page.getByLabel('Search mail',{exact:true}).fill('Triage delegated');assert.equal(await page.locator('[data-fm-thread]').count(),1);
  await page.getByLabel('Search mail',{exact:true}).fill('no matching request');assert.equal(await page.locator('[data-fm-thread]').count(),0);assert(await page.locator('.fm-empty').textContent().then(s=>s.includes('match this search')));
  await page.getByLabel('Search mail',{exact:true}).fill('');
  const row=page.locator('[data-fm-thread="'+original.threadId+'"]');await target(page,row);await row.click();
  await page.waitForFunction(id=>frontierOsSessionSnapshot().current.detail==='thread/'+id+'/from/needs-decision',original.threadId);
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-fm-decision-status="pending"]').waitFor({state:'visible'});
  assert.equal((await page.evaluate(()=>frontierMailSnapshot())).folder,'needs-decision');
  await page.getByRole('button',{name:'Open Finance',exact:true}).click();await page.getByRole('button',{name:'← Back to request',exact:true}).click();
  assert.equal((await page.evaluate(()=>frontierMailSnapshot())).threadId,original.threadId);
  await page.getByRole('button',{name:'Open snapshot',exact:true}).click();await page.locator('[data-a-evidence-status="available"]').waitFor({state:'visible'});await page.getByRole('button',{name:'← Back to request',exact:true}).click();
  assert.deepEqual(await finance(page),before,'Triage and cross-app reads changed Finance');
  const approve=page.getByRole('button',{name:'Approve $0.60M',exact:true});await target(page,approve);await approve.click();await page.locator('[data-fm-decision-status="approved"]').waitFor({state:'visible'});
  assert.equal((await page.evaluate(()=>frontierMailSnapshot())).threadId,original.threadId,'Decision must not switch to another request');
  assert.equal((await page.evaluate(()=>frontierMailSnapshot())).counts['needs-decision'],1);
  assert.equal((await finance(page)).cash,before.cash-600000);await shot(page,v.id+'-decided');
  await page.getByRole('button',{name:'Back to message list',exact:true}).click();
  await page.locator('[data-fm-thread="'+fixtures.delegated.threadId+'"]').click();await page.locator('[data-fm-decision-status="delegated"]').waitFor({state:'visible'});
  await page.getByRole('button',{name:'Reject request',exact:true}).click();await page.locator('[data-fm-decision-status="rejected"]').waitFor({state:'visible'});
  await page.getByRole('button',{name:'Back to message list',exact:true}).click();assert.equal(await page.locator('[data-fm-thread]').count(),0);assert((await page.locator('.fm-empty').textContent()).includes('No Finance requests need a decision'));await shot(page,v.id+'-empty');
  const archive=page.locator('[data-fm-folder="archive"]');await target(page,archive);await archive.click();await page.locator('[data-fm-thread="'+original.threadId+'"]').click();
  assert.equal((await page.evaluate(()=>frontierMailSnapshot())).threadId,original.threadId);assert(await page.getByRole('button',{name:'Move to inbox',exact:true}).isVisible());assert(await page.getByRole('button',{name:'Open snapshot',exact:true}).isVisible());
  const evidence=await page.evaluate(()=>({mail:frontierMailExport(),view:frontierMailSnapshot(),state,events:frontierEventJournal({limit:600}),bundle:frontierCreateDebugBundle({reason:'mail-triage-qa'})}));write(v.id+'-evidence.json',evidence);
  report.surfaces[v.id]={status:'pass',canonicalFiltering:true,archivedRequestVisible:true,search:true,reload:true,crossAppReturn:true,closedSelectionPreserved:true,historyPreserved:true};
 }catch(error){report.surfaces[v.id]={status:'fail',error:String(error.stack||error)};await shot(page,v.id+'-failure').catch(()=>{});write(v.id+'-failure.json',await page.evaluate(()=>({state,mail:window.frontierMailExport?.(),view:window.frontierMailSnapshot?.(),events:window.frontierEventJournal?.({limit:600})})).catch(()=>({unavailable:true})));fs.writeFileSync(path.join(out,v.id+'-failure.html'),await page.content().catch(()=>''));throw error}
 finally{await context.tracing.stop({path:path.join(out,v.id+'-trace.zip')});await context.close()}
}
try{browser=await chromium.launch({headless:true});for(const v of matrix)await run(v);assert.equal(report.pageErrors.length,0,report.pageErrors.join(' | '));report.status='pass'}
catch(error){report.status='fail';report.error=String(error.stack||error);throw error}
finally{await browser?.close();write('report.json',report);fs.writeFileSync(path.join(out,'REPORT.md'),'# P5.3.5 Mail triage\n\nStatus: **'+report.status.toUpperCase()+'**\n\nFive canonical viewports: actual triage, search, archive, request, decision and cross-app return clicks; reload and historical evidence. Screenshots, traces and state/events retained on failure and success.\n\nPhysical iPhone/PWA verification remains manual.\n'+(report.error||''))}
console.log('Mail triage cross-device journeys passed');
