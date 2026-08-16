import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const base=process.env.TEST_URL||'http://127.0.0.1:4173/';
const out=path.resolve('artifacts/mobile-frontieros');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await context.tracing.start({screenshots:true,snapshots:true,sources:true});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e)));
await page.goto(`${base}${base.includes('?')?'&':'?'}frontieros=1`,{waitUntil:'networkidle'});
await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});
await page.locator('.frontieros-phone-shell').waitFor({state:'visible'});

const initial=await page.evaluate(()=>frontierMobileShellSnapshot());
assert.equal(initial.active,true,'mobile shell did not activate');
assert.equal(initial.view,'home','phone must enter through FrontierOS Home');
assert.equal(initial.apps.length,14,'launcher must render canonical 14-app registry');
assert.equal(await page.locator('.frontieros-app-icon').count(),14,'launcher tile count drifted');
assert.equal(await page.locator('.frontieros-mobile-appbar').isVisible(),false,'app bar should be hidden on Home');
const layout=await page.locator('.frontieros-phone-shell').evaluate(el=>({width:el.getBoundingClientRect().width,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
assert(layout.width<=layout.viewport+1,'home shell escapes phone viewport');
assert(layout.scrollWidth<=layout.viewport+1,'home shell creates horizontal overflow');
await page.screenshot({path:path.join(out,'home-portrait.png'),fullPage:true});

await page.getByRole('button',{name:/Run Monitor/i}).click();
await page.locator('.frontieros-mobile-appbar').waitFor({state:'visible'});
let snap=await page.evaluate(()=>frontierMobileShellSnapshot());
assert.equal(snap.view,'app','ready app did not enter app view');
assert.equal(snap.currentApp,'training','Run Monitor did not become current app');
assert(await page.locator('#app').isVisible(),'legacy application surface is not visible beneath FrontierOS app bar');
await page.screenshot({path:path.join(out,'run-monitor-app.png'),fullPage:true});

await page.getByRole('button',{name:/Home/}).first().click();
await page.locator('.frontieros-phone-shell').waitFor({state:'visible'});
snap=await page.evaluate(()=>frontierMobileShellSnapshot());
assert.equal(snap.view,'home','Home control failed to return to launcher');
assert.equal(snap.currentApp,null,'current app was not cleared on Home');

await page.getByRole('button',{name:/Frontier Mail/i}).click();
assert.equal((await page.evaluate(()=>frontierMobileShellSnapshot())).view,'home','planned app must not leave Home');
assert(await page.getByRole('status').isVisible(),'planned-app explanation toast missing');
assert.match(await page.getByRole('status').textContent(),/coming/i,'planned-app explanation is unclear');

await page.setViewportSize({width:844,height:390});
await page.evaluate(()=>dispatchEvent(new Event('resize')));
await page.waitForTimeout(100);
const landscape=await page.locator('.frontieros-phone-shell').evaluate(el=>({right:el.getBoundingClientRect().right,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
assert(landscape.right<=landscape.viewport+1,'landscape shell escapes viewport');
assert(landscape.scrollWidth<=landscape.viewport+1,'landscape shell creates horizontal overflow');
await page.screenshot({path:path.join(out,'home-landscape.png'),fullPage:true});

const events=await page.evaluate(()=>frontierEventJournal({type:'os.mobile.*',limit:100}));
assert(events.some(e=>e.type==='os.mobile.shell.ready'),'mobile shell ready event missing');
assert(events.some(e=>e.type==='os.mobile.app.opened'&&e.data.appId==='training'),'mobile app-open event missing');
assert(events.some(e=>e.type==='os.mobile.app.blocked'&&e.data.appId==='mail'),'planned app block event missing');
assert.equal(errors.length,0,`runtime page errors: ${errors.join(' | ')}`);

await context.tracing.stop({path:path.join(out,'trace.zip')});await context.close();await browser.close();
const report={version:1,item:'P5.1.2',status:'pass',generatedAt:new Date().toISOString(),apps:initial.apps.length,portrait:'390x844',landscape:'844x390',events:events.length,pageErrors:errors.length,evidence:['home-portrait.png','run-monitor-app.png','home-landscape.png','trace.zip']};
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(out,'REPORT.md'),`# P5.1.2 Mobile FrontierOS Home\n\n- Status: **PASS**\n- Canonical app tiles: **${report.apps}**\n- Phone portrait: **PASS**\n- Phone landscape: **PASS**\n- Run Monitor launch → Home return: **PASS**\n- Planned-app explanation: **PASS**\n- Horizontal overflow: **0**\n- Runtime page errors: **0**\n- Playwright trace: **captured**\n`);
console.log('P5.1.2 mobile FrontierOS Home regression passed');
