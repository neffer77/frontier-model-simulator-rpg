import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const outDir=path.resolve('artifacts/app-registry');
fs.rmSync(outDir,{recursive:true,force:true});
fs.mkdirSync(outDir,{recursive:true});

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const pageErrors=[];
page.on('pageerror',error=>pageErrors.push(String(error?.stack||error)));
await page.goto(url,{waitUntil:'networkidle'});
await page.evaluate(()=>localStorage.clear());
await page.reload({waitUntil:'networkidle'});

const snapshot=await page.evaluate(()=>frontierAppRegistry());
assert.equal(snapshot.schemaVersion,1,'app registry schema drifted');
assert.equal(snapshot.count,14,'canonical FrontierOS app count drifted');
assert.equal(new Set(snapshot.apps.map(app=>app.id)).size,14,'app ids must be unique');
for(const app of snapshot.apps){assert(app.id&&app.label&&app.shortLabel&&app.icon&&app.category&&app.route,`${app.id||'unknown'} missing required metadata`);assert(app.route.startsWith('os/'),`${app.id} route must live under os/`);assert(app.surfaces.includes('phone')&&app.surfaces.includes('desktop'),`${app.id} must declare phone + desktop availability`);assert(app.window.width>0&&app.window.height>0,`${app.id} missing desktop window geometry`);assert(['ready','locked','planned'].includes(app.launchState),`${app.id} has invalid launch state`)}

const resolution=await page.evaluate(()=>({mail:frontierResolveApp('email'),training:frontierResolveApp('run-monitor'),evals:frontierResolveApp('os/evals'),team:frontierResolveApp('People'),system:frontierResolveApp('diagnostics')}));
assert.equal(resolution.mail.id,'mail','mail alias failed');assert.equal(resolution.training.id,'training','training alias failed');assert.equal(resolution.evals.id,'evals','route resolution failed');assert.equal(resolution.team.id,'team','label resolution failed');assert.equal(resolution.system.id,'settings','settings alias failed');

const links=await page.evaluate(()=>({uri:frontierParseDeepLink('frontieros://training/run-1842'),route:frontierParseDeepLink('os/model-lab/experiment/alpha'),alias:frontierParseDeepLink('email/thread/m1')}));
assert.equal(links.uri.appId,'training','frontieros URI app resolution failed');assert.equal(links.uri.detail,'run-1842','frontieros URI detail failed');assert.equal(links.route.appId,'model-lab','os route app resolution failed');assert.equal(links.route.detail,'experiment/alpha','os route detail failed');assert.equal(links.alias.appId,'mail','alias deep link failed');

const states=await page.evaluate(()=>({mail:frontierApp('mail'),company:frontierApp('company'),training:frontierApp('training')}));
assert.equal(states.mail.launchState,'ready','Mail should be native and ready after P5.2.7');assert.equal(states.company.launchState,'locked','Company app should be locked before company setup');assert.equal(states.training.launchState,'ready','Training should remain launchable from fresh state');

const blocked=await page.evaluate(()=>frontierLaunchApp('company',{source:'qa'}));assert.equal(blocked.ok,false,'locked app must not launch');assert.equal(blocked.status,'locked','locked app must report locked status');
const mailLaunch=await page.evaluate(()=>frontierLaunchApp('mail',{source:'qa'}));assert.equal(mailLaunch.ok,true,'Mail native command launch failed');assert.equal(mailLaunch.via,'command:mail.open','Mail must launch through native mail.open command');await page.locator('[data-frontieros-native-app="mail"]').waitFor({state:'visible'});
const launched=await page.evaluate(()=>frontierLaunchApp('settings',{source:'qa'}));assert.equal(launched.ok,true,'Settings app command launch failed');assert.equal(launched.via,'command:diagnostics.open','Settings must launch through canonical command');await page.locator('.frontier-debug-panel').waitFor({state:'visible'});await page.evaluate(()=>frontierCloseDiagnostics());

const badge=await page.evaluate(()=>{state.activeRun={id:'qa-run'};state.selectedIncident='qa-incident';return{training:frontierApp('training').badge,pager:frontierApp('pager').badge}});assert.equal(badge.training,1,'training active-run badge missing');assert.equal(badge.pager,1,'pager incident badge missing');
const events=await page.evaluate(()=>frontierEventJournal({type:'os.app.*',limit:30}));assert(events.some(event=>event.type==='os.app.launch.blocked'&&event.data.appId==='company'),'locked launch event missing');assert(events.some(event=>event.type==='os.app.launch.completed'&&event.data.appId==='mail'),'Mail successful app launch event missing');assert(events.some(event=>event.type==='os.app.launch.completed'&&event.data.appId==='settings'),'successful app launch event missing');assert.equal(pageErrors.length,0,`runtime page errors: ${pageErrors.join(' | ')}`);
await context.close();await browser.close();
const report={version:1,item:'P5.1.1',status:'pass',generatedAt:new Date().toISOString(),appCount:snapshot.count,categories:snapshot.categories,appIds:snapshot.apps.map(app=>app.id),ready:snapshot.apps.filter(x=>x.launchState==='ready').map(x=>x.id),planned:snapshot.apps.filter(x=>x.launchState==='planned').map(x=>x.id),events:events.slice(-12)};fs.writeFileSync(path.join(outDir,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(outDir,'REPORT.md'),`# P5.1.1 FrontierOS App Registry\n\n- Status: **PASS**\n- Canonical apps: **${report.appCount}**\n- Categories: **${report.categories.length}**\n- Alias resolution: **PASS**\n- Deep links: **PASS**\n- Locked/planned semantics: **PASS**\n- Native Mail launch: **PASS**\n- Command-backed launch: **PASS**\n- Badge providers: **PASS**\n- Runtime page errors: **0**\n`);console.log('P5.1.1 FrontierOS app registry regression passed');
