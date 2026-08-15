import fs from 'node:fs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const inventory=JSON.parse(fs.readFileSync('visual-qa/inventory.json','utf8'));
const devices=[
  {name:'desktop',viewport:{width:1440,height:1000},isMobile:false,hasTouch:false},
  {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];

async function settle(page,ms=55){await page.waitForTimeout(ms);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
async function dismissStory(page){for(let i=0;i<12;i++){const o=page.locator('.story-overlay');if(!(await o.count()))break;const b=o.locator('button').last();if(!(await b.count()))break;await b.click();await settle(page,25)}}
async function graduate(page){await page.evaluate(()=>{state.campaign ||= {version:1};state.campaign.graduated=true;state.campaign.companyPriority=state.campaign.companyPriority||'research';state.campaign.modelReviewed=true;save();render()});await settle(page,80)}
async function goHome(page){await page.evaluate(()=>window.gameplayGoHome?.());await settle(page,55);await dismissStory(page)}
async function availableEntrypoint(page,names){return page.evaluate(xs=>xs.find(name=>typeof window[name]==='function')||null,names)}
async function invoke(page,name){return page.evaluate(fn=>{try{window[fn]();return {ok:true}}catch(error){return {ok:false,error:String(error?.stack||error)}}},name)}
async function unresolvedBright(page){return page.evaluate(()=>{
  const parse=color=>{const m=String(color).match(/rgba?\(([^)]+)\)/);if(!m)return null;const v=m[1].split(',').map(Number);return {r:v[0]||0,g:v[1]||0,b:v[2]||0,a:v.length>3?v[3]:1}};
  const tags=new Set(['BUTTON','DIV','SECTION','ARTICLE','ASIDE','HEADER','FOOTER','FIELDSET','LI','TD','TH','DETAILS','SUMMARY','INPUT','SELECT','TEXTAREA']);
  const bad=[];
  for(const el of document.querySelectorAll('#app *')){
    if(!tags.has(el.tagName)||el.closest('[data-fl-allow-light-surface="true"]')||el.matches('input[type="color"]'))continue;
    const r=el.getBoundingClientRect();if(r.width<28||r.height<12||r.bottom<0||r.right<0)continue;
    const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)<.08)continue;
    const c=parse(cs.backgroundColor);if(!c||c.a<.72)continue;
    const lum=(.2126*c.r+.7152*c.g+.0722*c.b)/255;
    if(lum>=.86&&r.width*r.height>=500)bad.push({tag:el.tagName,className:el.className,bg:cs.backgroundColor,w:Math.round(r.width),h:Math.round(r.height),text:(el.textContent||'').trim().slice(0,80)});
  }
  return bad.slice(0,12);
})}

const browser=await chromium.launch({headless:true});
for(const d of devices){
  const ctx=await browser.newContext({viewport:d.viewport,isMobile:d.isMobile,hasTouch:d.hasTouch});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e)));
  await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.flPageSweep),'1',`${d.name}: page sweep runtime missing`);
  const founder=page.getByRole('button',{name:/found the lab/i});assert(await founder.count(),`${d.name}: founder CTA missing`);await founder.click();await settle(page,80);await dismissStory(page);await graduate(page);

  const registry=await page.evaluate(()=>window.frontierPageSweepRegistry?.()||[]);
  assert.equal(registry.length,inventory.screens.length,`${d.name}: runtime registry should cover all inventory screens`);
  const tested=[];

  for(const screen of inventory.screens){
    await goHome(page);
    const entry=await availableEntrypoint(page,screen.entrypoints||[]);
    assert(entry,`${d.name}/${screen.id}: no available entrypoint from ${(screen.entrypoints||[]).join(', ')}`);
    const before=errors.length;
    const result=await invoke(page,entry);assert(result.ok,`${d.name}/${screen.id}: ${entry} threw ${result.error||''}`);await settle(page,70);await dismissStory(page);
    await page.evaluate(()=>window.frontierPageSweepSync?.());await settle(page,20);

    const meta=await page.evaluate(()=>({id:document.getElementById('app')?.dataset.flPageId||null,category:document.getElementById('app')?.dataset.flPageCategory||null,repairs:Number(document.getElementById('app')?.dataset.flBrightRepairs||0),bodyWidth:document.body.scrollWidth,viewport:document.documentElement.clientWidth,rootCount:document.querySelectorAll('.fl-page-shell').length,rootId:document.querySelector('.fl-page-shell')?.dataset.flPageId||null}));
    assert.equal(meta.id,screen.id,`${d.name}/${screen.id}: runtime tagged ${meta.id}`);
    assert.equal(meta.category,screen.category,`${d.name}/${screen.id}: expected category ${screen.category}, got ${meta.category}`);
    assert(meta.rootCount>=1,`${d.name}/${screen.id}: normalized page shell missing`);
    assert.equal(meta.rootId,screen.id,`${d.name}/${screen.id}: primary root not tagged with page id`);
    assert(meta.bodyWidth<=meta.viewport+8,`${d.name}/${screen.id}: horizontal document overflow ${meta.bodyWidth}px > ${meta.viewport}px`);
    const bright=await unresolvedBright(page);assert.equal(bright.length,0,`${d.name}/${screen.id}: unresolved near-white surfaces ${JSON.stringify(bright)}`);
    const newErrors=errors.slice(before);assert.equal(newErrors.length,0,`${d.name}/${screen.id}: runtime errors ${newErrors.join(' | ')}`);
    tested.push({id:screen.id,entry,repairs:meta.repairs});
  }

  assert.equal(tested.length,inventory.screens.length,`${d.name}: incomplete page sweep`);
  const categories=new Set(tested.map(x=>inventory.screens.find(s=>s.id===x.id)?.category));
  for(const category of ['core','learning','engineering','company','external'])assert(categories.has(category),`${d.name}: category ${category} not exercised`);
  await ctx.close();
}
await browser.close();
console.log(`Page-by-page visual sweep passed for ${inventory.screens.length} screens on desktop + mobile`);
