import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const out=path.resolve('artifacts/finance-frontieros');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[];

async function assertLastAction(page,label,action,field,before){
  const result=await page.evaluate(()=>frontierFinanceLastAction?.());
  assert(result,`${label}: ${action} did not reach Finance dispatcher`);
  assert.equal(result.action,action,`${label}: expected ${action} dispatcher action, got ${result.action}`);
  assert.equal(result.ok,true,`${label}: ${action} failed: ${result.error||JSON.stringify(result)}`);
  if(field)assert.equal(result.after[field],before+1,`${label}: ${action} dispatcher did not mutate ${field}: ${JSON.stringify(result)}`);
  return result;
}

async function controlWiring(locator){
  return locator.evaluate(el=>({
    onclick:el.getAttribute('onclick'),
    connected:el.isConnected,
    inLiveApp:document.getElementById('app')?.contains(el)||false,
    inDesktopWindow:!!el.closest('.frontieros-window'),
    inMobileShell:!!el.closest('.frontieros-mobile'),
    rootIsDocument:el.getRootNode()===document,
    uiAction:typeof window.frontierFinanceUiAction,
    dispatcher:typeof window.frontierFinanceDispatch,
    binder:typeof window.frontierFinanceBindControls,
    bridgeReady:(window.frontierEventJournal?.({type:'finance.dom-bridge.ready',limit:5})||[]).length
  }));
}

async function run(viewport,label){
  const phone=viewport.width<600;
  const context=await browser.newContext({viewport,isMobile:phone,hasTouch:phone});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(`${label}: ${error.stack||error}`));
  await page.goto(url,{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'networkidle'});
  await page.evaluate(()=>{
    state.started=true;
    state.cashM=Math.max(Number(state.cashM||0),30);
    state.cash=Math.max(Number(state.cash||0),30000000);
    save();
  });
  const launched=await page.evaluate(async isPhone=>{
    if(isPhone){frontierMobileShellActivate?.();return await frontierMobileAppOpen?.('finance')}
    frontierDesktopShellActivate?.();
    return await frontierDesktopAppOpen?.('finance');
  },phone);
  assert.equal(launched.ok,true,`${label}: Finance launch failed`);
  assert.equal(launched.via,'command:finance.open',`${label}: Finance must use native command`);
  await page.locator('[data-frontieros-native-app="finance"]').waitFor({state:'visible'});

  let snap=await page.evaluate(()=>frontierFinanceSnapshot());
  const catalogs=await page.evaluate(()=>({
    financing:Object.keys(frontierFinancingOptions?.()||{}),
    deals:Object.keys(frontierStrategicDeals?.()||{}),
    scenarios:Object.keys(frontierFinanceScenarios?.()||{}),
    initiatives:Object.keys(frontierInitiativeTemplates?.()||{})
  }));
  assert(catalogs.financing.includes('equity'),`${label}: canonical financing catalog missing equity (${catalogs.financing.join(',')})`);
  assert(catalogs.deals.includes('cloud'),`${label}: canonical strategic-deal catalog missing cloud (${catalogs.deals.join(',')})`);
  assert(catalogs.scenarios.includes('bull'),`${label}: canonical scenario catalog missing bull (${catalogs.scenarios.join(',')})`);
  assert(catalogs.initiatives.includes('research'),`${label}: canonical initiative catalog missing research (${catalogs.initiatives.join(',')})`);

  const txBefore=snap.transactions.length;
  assert.equal(await page.evaluate(()=>frontierFinanceSetView('financing')),true,`${label}: financing view switch failed`);
  const equity=page.locator('[data-fin-financing="equity"]');
  await equity.waitFor({state:'visible',timeout:5000});
  const wiring=await controlWiring(equity);
  assert.equal(wiring.connected,true,`${label}: Equity control disconnected: ${JSON.stringify(wiring)}`);
  assert.equal(wiring.inLiveApp,true,`${label}: visible Equity control is not inside live #app: ${JSON.stringify(wiring)}`);
  assert.equal(wiring.rootIsDocument,true,`${label}: Equity control is hosted outside the main document: ${JSON.stringify(wiring)}`);
  assert.equal(wiring.uiAction,'function',`${label}: Finance UI action unavailable: ${JSON.stringify(wiring)}`);
  assert.equal(wiring.dispatcher,'function',`${label}: Finance dispatcher unavailable: ${JSON.stringify(wiring)}`);
  assert(wiring.onclick,`${label}: Equity control missing clone-safe action attribute: ${JSON.stringify(wiring)}`);
  await equity.click();
  await assertLastAction(page,label,'financing','transactions',txBefore);
  snap=await page.evaluate(()=>frontierFinanceSnapshot());
  assert.equal(snap.transactions.length,txBefore+1,`${label}: financing transaction missing`);

  const dealsBefore=snap.partnerships.length;
  assert.equal(await page.evaluate(()=>frontierFinanceSetView('deals')),true,`${label}: deals view switch failed`);
  await page.locator('[data-fin-deal="cloud"]').waitFor({state:'visible',timeout:5000});
  await page.locator('[data-fin-deal="cloud"]').click();
  await assertLastAction(page,label,'deal','partnerships',dealsBefore);
  snap=await page.evaluate(()=>frontierFinanceSnapshot());
  assert.equal(snap.partnerships.length,dealsBefore+1,`${label}: strategic deal missing`);

  assert.equal(await page.evaluate(()=>frontierFinanceSetView('committee')),true,`${label}: committee view switch failed`);
  await page.locator('[data-fin-propose="research"]').waitFor({state:'visible',timeout:5000});
  const initiativesBefore=snap.initiatives.length;
  await page.locator('[data-fin-propose="research"]').click();
  await assertLastAction(page,label,'propose','initiatives',initiativesBefore);
  snap=await page.evaluate(()=>frontierFinanceSnapshot());
  assert(snap.initiatives.length>=1,`${label}: initiative proposal missing`);
  const initiative=snap.initiatives.at(-1);

  const debatesBefore=snap.debates.length;
  await page.locator(`[data-fin-debate="${initiative.id}"]`).click();
  await assertLastAction(page,label,'debate','debates',debatesBefore);
  snap=await page.evaluate(()=>frontierFinanceSnapshot());
  assert(snap.debates.some(d=>d.id===initiative.id),`${label}: committee debate missing`);

  const bullBefore=snap.scenarios.bull;
  await page.locator('[data-fin-scenario="bull"]').evaluate(el=>{
    el.value='40';
    el.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await assertLastAction(page,label,'scenario');
  snap=await page.evaluate(()=>frontierFinanceSnapshot());
  assert.notEqual(snap.scenarios.bull,bullBefore,`${label}: scenario probability did not change`);

  const deep=await page.evaluate(id=>frontierOpenDeepLink(`frontieros://finance/initiative/${id}`,{source:'qa'}),initiative.id);
  assert.equal(deep.ok,true,`${label}: finance deep link failed`);
  snap=await page.evaluate(()=>frontierFinanceSnapshot());
  assert.equal(snap.view,'committee',`${label}: deep link view mismatch`);
  assert.equal(snap.initiativeId,initiative.id,`${label}: deep link initiative mismatch`);
  await page.screenshot({path:path.join(out,`${label}.png`),fullPage:true});

  const events=await page.evaluate(()=>frontierEventJournal({type:'finance.*',limit:120}));
  for(const type of ['finance.opened','finance.action.dispatched','finance.initiative.proposed','finance.committee.debated','finance.scenario.changed']){
    assert(events.some(event=>event.type===type),`${label}: missing event ${type}`);
  }
  await context.close();
  return {
    label,
    wiring,
    runway:snap.runway,
    debtM:snap.debtM,
    transactions:snap.transactions.length,
    partnerships:snap.partnerships.length,
    initiatives:snap.initiatives.length,
    debates:snap.debates.length,
    eventCount:events.length
  };
}

const desktop=await run({width:1440,height:1000},'desktop');
const phone=await run({width:390,height:844},'phone');
await browser.close();
assert.equal(errors.length,0,`Finance page errors: ${errors.join(' | ')}`);
const report={version:1,item:'P5.2.10',status:'pass',generatedAt:new Date().toISOString(),desktop,phone,pageErrors:errors};
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(out,'REPORT.md'),'# P5.2.10 FrontierOS Finance\n\n- Status: **PASS**\n- Native phone + desktop ownership: **PASS**\n- Canonical action dispatcher: **PASS**\n- Financing transaction: **PASS**\n- Strategic deal: **PASS**\n- Investment committee debate: **PASS**\n- Scenario mutation: **PASS**\n- Deep-link initiative routing: **PASS**\n- Runtime page errors: **0**\n');
console.log('P5.2.10 FrontierOS Finance regression passed');
