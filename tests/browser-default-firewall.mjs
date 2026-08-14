import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const devices=[
  {name:'desktop',viewport:{width:1440,height:1000},isMobile:false,hasTouch:false},
  {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];

function luminance(rgb){
  const m=String(rgb).match(/rgba?\(([^)]+)\)/);if(!m)return 0;
  const [r,g,b]=m[1].split(',').map(Number);return (.2126*r+.7152*g+.0722*b)/255;
}

async function settle(page){await page.waitForTimeout(80);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
async function dismissStory(page){for(let i=0;i<12;i++){const o=page.locator('.story-overlay');if(!(await o.count()))break;const b=o.locator('button').last();if(!(await b.count()))break;await b.click();await settle(page)}}
async function assertDark(page,selector,label){
  const rows=await page.locator(selector).evaluateAll((els)=>els.filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden'}).map(el=>({tag:el.tagName,className:el.className,bg:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color,text:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,80)})));
  assert(rows.length>0,`${label}: no visible elements matched ${selector}`);
  for(const row of rows)assert(luminance(row.bg)<.72,`${label}: bright browser-default surface survived on ${row.tag}.${row.className} (${row.bg})`);
}

const browser=await chromium.launch({headless:true});
for(const d of devices){
  const ctx=await browser.newContext({viewport:d.viewport,isMobile:d.isMobile,hasTouch:d.hasTouch});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e)));
  await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});
  const found=page.getByRole('button',{name:/found the lab/i});assert(await found.count(),`${d.name}: founder button missing`);await found.click();await settle(page);await dismissStory(page);
  await page.evaluate(()=>{state.campaign ||= {version:1};state.campaign.graduated=true;state.campaign.companyPriority='research';state.campaign.modelReviewed=true;state.view='company';save();render()});await settle(page);

  // VIS-001: these launchers previously inherited the browser's light native button face on desktop.
  await assertDark(page,'.maint-launch',`${d.name} VIS-001 maintenance launcher`);
  await assertDark(page,'.slo-launch',`${d.name} VIS-001 reliability launcher`);
  await assertDark(page,'.rg-launch',`${d.name} VIS-001 release-governance launcher`);

  const brightCompanyButtons=await page.locator('#app button').evaluateAll(els=>els.filter(el=>{const r=el.getBoundingClientRect(),cs=getComputedStyle(el);if(r.width<28||r.height<12||cs.display==='none'||cs.visibility==='hidden')return false;const m=cs.backgroundColor.match(/rgba?\(([^)]+)\)/);if(!m)return false;const [rC,gC,bC,a=1]=m[1].split(',').map(Number);const lum=(.2126*rC+.7152*gC+.0722*bC)/255;return a>.7&&lum>.88}).map(el=>({className:el.className,text:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,100),background:getComputedStyle(el).backgroundColor})));
  assert.equal(brightCompanyButtons.length,0,`${d.name}: Company/Home still has bright native-looking buttons: ${JSON.stringify(brightCompanyButtons)}`);

  // VIS-002: Critical Path's unclassed header control must inherit the dark fallback.
  await page.evaluate(()=>window.criticalPathOpen());await settle(page);
  await assertDark(page,'.cp-head > button',`${d.name} VIS-002 Critical Path return control`);

  // Synthetic naked controls prove future partially-styled modules cannot fall back to light browser chrome.
  await page.evaluate(()=>{
    const host=document.createElement('section');host.id='firewall-fixture';host.innerHTML=`<button>Naked button</button><input placeholder="Naked input"><select><option>Naked select</option></select><textarea placeholder="Naked textarea"></textarea><fieldset><legend>Naked fieldset</legend><details><summary>Naked summary</summary><p>Body</p></details></fieldset>`;document.getElementById('app').appendChild(host)
  });
  await assertDark(page,'#firewall-fixture button',`${d.name} naked button`);
  await assertDark(page,'#firewall-fixture input',`${d.name} naked input`);
  await assertDark(page,'#firewall-fixture select',`${d.name} naked select`);
  await assertDark(page,'#firewall-fixture textarea',`${d.name} naked textarea`);
  await assertDark(page,'#firewall-fixture fieldset',`${d.name} naked fieldset`);
  assert.equal(errors.length,0,`${d.name}: runtime errors: ${errors.join(' | ')}`);
  await ctx.close();
}
await browser.close();
console.log('Browser-default styling firewall regression passed');
