import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const devices=[
  {name:'desktop',viewport:{width:1440,height:1000},isMobile:false,hasTouch:false},
  {name:'phone',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];

async function settle(page,ms=80){
  await page.waitForTimeout(ms);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}

const browser=await chromium.launch({headless:true});
for(const device of devices){
  const context=await browser.newContext({viewport:device.viewport,isMobile:device.isMobile,hasTouch:device.hasTouch});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error?.stack||error)));

  await page.goto(url,{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'networkidle'});

  const founder=page.getByRole('button',{name:/found the lab/i});
  if(await founder.count()){
    await founder.click();
    await settle(page,120);
  }

  // Remove narrative interruptions and open a real engineering workstation exactly
  // through the canonical incident API used by gameplay.
  await page.evaluate(()=>{
    state.story ||= {seen:[],active:null};
    state.story.seen=[...(state.story.seen||[]).filter(id=>id!=='firstIncident'),'firstIncident'];
    state.story.active=null;
    openIncident('nan');
  });
  await settle(page,150);

  assert.equal(await page.locator('.workstation:visible').count(),1,`${device.name}: workstation missing`);
  assert.equal(await page.locator('.ws-tools:visible').count(),1,`${device.name}: investigation tools missing before advice`);
  assert.equal(await page.locator('.ask-team-panel:visible').count(),1,`${device.name}: Ask Team panel missing`);

  const maya=page.locator('.ask-team-panel button').filter({hasText:'Maya'}).first();
  assert.equal(await maya.count(),1,`${device.name}: Maya advice button missing`);
  await maya.click();
  await settle(page,150);

  assert.equal(await page.locator('body > .npc-advice-back').count(),0,`${device.name}: legacy body advice overlay returned`);
  assert.equal(await page.locator('.workstation .npc-advice-inline:visible').count(),1,`${device.name}: advice was not rendered inside workstation`);
  assert.equal(await page.locator('.workstation').evaluate(el=>el.classList.contains('npc-advice-active')),true,`${device.name}: workstation did not enter advice subview`);
  assert.equal(await page.evaluate(()=>state.npcTeam?.advice?.employeeId||null),'maya',`${device.name}: advice state missing`);

  const back=page.getByRole('button',{name:/back to investigation/i});
  assert.equal(await back.count(),1,`${device.name}: Back to investigation button missing`);
  await back.click();
  await settle(page,180);

  assert.equal(await page.evaluate(()=>state.npcTeam?.advice||null),null,`${device.name}: advice state survived return`);
  assert.equal(await page.locator('.npc-advice-inline').count(),0,`${device.name}: advice subview survived return`);
  assert.equal(await page.locator('.npc-advice-back').count(),0,`${device.name}: legacy advice overlay survived return`);
  assert.equal(await page.locator('.workstation:visible').count(),1,`${device.name}: workstation disappeared after return`);
  assert.equal(await page.locator('.ws-tools:visible').count(),1,`${device.name}: investigation tools did not return`);
  assert.equal(await page.locator('.ask-team-panel:visible').count(),1,`${device.name}: Ask Team panel did not return`);
  assert.equal(await page.locator('.workstation').evaluate(el=>el.classList.contains('npc-advice-active')),false,`${device.name}: workstation remained in advice mode`);
  assert.equal(errors.length,0,`${device.name}: runtime errors: ${errors.join(' | ')}`);

  await context.close();
}
await browser.close();
console.log('NPC advice workstation subview regression passed on desktop + phone');
