import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const out=path.resolve('artifacts/company-frontieros');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[];

async function lastAction(page,label,action){
  const result=await page.evaluate(()=>window.frontierCompanyLastAction?.());
  assert(result,`${label}: ${action} did not reach Company dispatcher`);
  assert.equal(result.action,action,`${label}: expected ${action}, got ${result.action}`);
  assert.equal(result.ok,true,`${label}: ${action} failed: ${result.error||JSON.stringify(result)}`);
  return result;
}

async function run(viewport,label){
  const phone=viewport.width<600;
  const context=await browser.newContext({viewport,isMobile:phone,hasTouch:phone});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(`${label}: ${e.stack||e}`));
  await page.goto(url,{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'networkidle'});
  await page.evaluate(()=>{state.started=true;state.cashM=Math.max(Number(state.cashM||0),30);state.cash=Math.max(Number(state.cash||0),30000000);save();});
  const launched=await page.evaluate(async isPhone=>{if(isPhone){frontierMobileShellActivate?.();return await frontierMobileAppOpen?.('company')}frontierDesktopShellActivate?.();return await frontierDesktopAppOpen?.('company')},phone);
  assert.equal(launched.ok,true,`${label}: Company launch failed`);
  assert.equal(launched.via,'command:company.open',`${label}: Company must use native command`);
  await page.locator('[data-frontieros-native-app="company"]').waitFor({state:'visible'});
  assert.equal(await page.locator('.company-os-nav button').count(),6,`${label}: Company view count drifted`);

  let snap=await page.evaluate(()=>frontierCompanySnapshot());
  assert.equal(snap.view,'overview',`${label}: initial view mismatch`);
  assert(Number.isFinite(snap.board.valuationM),`${label}: board valuation missing`);
  assert(Number.isFinite(snap.finance.ownership.founders),`${label}: canonical ownership bridge missing`);

  await page.evaluate(()=>frontierCompanySetView('board'));
  await page.locator('[data-company-action="board-plan"][data-value="balanced"]').click();
  await lastAction(page,label,'board-plan');
  snap=await page.evaluate(()=>frontierCompanySnapshot());
  assert(snap.board.plan,`${label}: quarterly plan missing`);
  assert.equal(snap.board.plan.priority,'balanced',`${label}: quarterly plan priority mismatch`);

  const motionsBefore=snap.governance.motions.length;
  await page.evaluate(()=>frontierCompanySetView('governance'));
  await page.locator('[data-company-action="governance-vote"][data-value="accelerate"]').click();
  await lastAction(page,label,'governance-vote');
  snap=await page.evaluate(()=>frontierCompanySnapshot());
  assert.equal(snap.governance.motions.length,motionsBefore+1,`${label}: governance motion missing`);

  const macroBefore=snap.macro.history.length;
  await page.evaluate(()=>frontierCompanySetView('restructuring'));
  await page.locator('[data-company-action="macro-shock"][data-value="tight"]').click();
  await lastAction(page,label,'macro-shock');
  snap=await page.evaluate(()=>frontierCompanySnapshot());
  assert.equal(snap.macro.current?.key,'tight',`${label}: macro shock missing`);
  assert.equal(snap.macro.history.length,macroBefore+1,`${label}: macro history did not advance`);
  assert.equal(snap.board.valuationM,await page.evaluate(()=>state.quarterlyBoard.board.valuationM),`${label}: macro valuation did not reconcile to canonical board state`);

  const execBefore=snap.leadership.history.length;
  await page.evaluate(()=>frontierCompanySetView('leadership'));
  await page.locator('[data-company-action="executive-align"][data-value="cto:empower"]').click();
  await lastAction(page,label,'executive-align');
  snap=await page.evaluate(()=>frontierCompanySnapshot());
  assert.equal(snap.leadership.history.length,execBefore+1,`${label}: executive action history missing`);

  const deep=await page.evaluate(()=>frontierOpenDeepLink('frontieros://company/governance',{source:'qa'}));
  assert.equal(deep.ok,true,`${label}: Company deep link failed`);
  snap=await page.evaluate(()=>frontierCompanySnapshot());
  assert.equal(snap.view,'governance',`${label}: deep-link view mismatch`);

  await page.screenshot({path:path.join(out,`${label}.png`),fullPage:true});
  const events=await page.evaluate(()=>frontierEventJournal({type:'company.*',limit:160}));
  for(const type of ['company.opened','company.rendered','company.action.dispatched'])assert(events.some(e=>e.type===type),`${label}: missing event ${type}`);
  await context.close();
  return{label,runway:snap.runway,valuationM:snap.board.valuationM,boardConfidence:snap.board.confidence,motions:snap.governance.motions.length,macroEvents:snap.macro.history.length,executiveEvents:snap.leadership.history.length,eventCount:events.length};
}

const desktop=await run({width:1440,height:1000},'desktop');
const phone=await run({width:390,height:844},'phone');
await browser.close();
assert.equal(errors.length,0,`Company page errors: ${errors.join(' | ')}`);
const report={version:1,item:'P5.2.11',status:'pass',generatedAt:new Date().toISOString(),desktop,phone,pageErrors:errors,evidence:['desktop.png','phone.png']};
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(out,'REPORT.md'),'# P5.2.11 FrontierOS Company\n\n- Status: **PASS**\n- Native phone + desktop ownership: **PASS**\n- Quarterly board plan: **PASS**\n- Governance vote: **PASS**\n- Macro shock + canonical reconciliation: **PASS**\n- Executive alignment: **PASS**\n- Company deep link: **PASS**\n- Runtime page errors: **0**\n');
console.log('P5.2.11 FrontierOS Company regression passed');
