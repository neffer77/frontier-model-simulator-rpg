import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const devices=[
  {name:'desktop',viewport:{width:1440,height:1000},isMobile:false,hasTouch:false},
  {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];
const cases=[
  ['model','model-lab','modelLab','model-lab.no-models'],
  ['portfolio','portfolio','portfolio','portfolio.no-projects'],
  ['critical','critical-path','criticalPath','critical-path.no-active-projects'],
  ['operations','operations','operations','operations.no-incidents'],
  ['governance','governance','governance','governance.no-votes'],
  ['programs','programs','program','programs.no-trains'],
  ['postmortems','postmortems','postmortems','postmortems.none'],
  ['hiring','hiring','hiring','hiring.no-employees']
];

async function settle(page,ms=70){await page.waitForTimeout(ms);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
async function dismissStory(page){for(let i=0;i<12;i++){const o=page.locator('.story-overlay');if(!(await o.count()))break;const b=o.locator('button').last();if(!(await b.count()))break;await b.click();await settle(page,25)}}
async function prepare(page){
  await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.flEmptyStateSystem),'1','empty-state runtime missing');
  const founder=page.getByRole('button',{name:/found the lab/i});assert(await founder.count(),'founder CTA missing');await founder.click();await settle(page);await dismissStory(page);
  await page.evaluate(()=>{state.campaign||={version:1};state.campaign.graduated=true;state.campaign.companyPriority='research';state.campaign.modelReviewed=true;window.__emptyTestEmployees=structuredClone(state.npcEmployees||[]);save();render()});await settle(page);
}
async function restoreEmployees(page){await page.evaluate(()=>{state.npcEmployees=structuredClone(window.__emptyTestEmployees||[]);ensureHiring?.();save()})}
async function openZero(page,kind,id,view){
  await page.evaluate(({kind,id,view})=>{
    if(kind==='model'){ensureModelLabState?.();state.models=[];state.modelLab.selectedModelId=null;state.modelLab.tab='overview'}
    if(kind==='portfolio'){ensurePortfolio?.();state.portfolio.projects=[];state.portfolio.allocations={};state.portfolio.history=[];recalcPortfolio?.()}
    if(kind==='critical'){ensurePortfolio?.();state.portfolio.projects=[];state.portfolio.allocations={};ensureCriticalPath?.();state.criticalPath.dependencies=[];state.criticalPath.milestones={};evaluateCriticalPath?.()}
    if(kind==='operations'){ensureOpsState?.();state.operations.incidents=[];state.operations.history=[]}
    if(kind==='governance'){ensureGovernanceState?.();state.governance.motions=[];state.governance.history=[]}
    if(kind==='programs'){ensureProgram?.();state.program.trains=[];state.program.history=[];evaluatePrograms?.()}
    if(kind==='postmortems'){ensureOrgHistory?.();state.organization.postmortems=[];state.organization.incidents=[];state.organization.actionItems=[]}
    if(kind==='hiring'){ensureHiring?.();state.npcEmployees=[];for(const t of Object.values(state.hiring.teams||{})){t.memberIds=[];t.managerId=null}syncManagers?.()}
    window.frontierPageSweepSet?.(id);state.view=view;save();
    if(kind==='hiring'&&typeof renderHiring==='function')document.getElementById('app').innerHTML=renderHiring();else render();
  },{kind,id,view});
  await settle(page,100);await page.evaluate(()=>{window.frontierPageSweepSync?.();window.frontierEmptyStateSync?.()});await settle(page,30);
}
async function assertCard(page,d,key){
  const card=page.locator(`[data-fl-zero-key="${key}"]`);assert.equal(await card.count(),1,`${d.name}/${key}: expected one zero-state card`);
  assert.equal(await card.getAttribute('role'),'status',`${d.name}/${key}: status semantics missing`);
  assert((await card.locator('h3').textContent()||'').trim().length>8,`${d.name}/${key}: title missing`);
  assert((await card.locator('.fl-zero-next').textContent()||'').includes('Next signal'),`${d.name}/${key}: next-signal guidance missing`);
  assert(await card.locator('button').count(),`${d.name}/${key}: contextual action missing`);
  const visual=await card.evaluate(el=>{const r=el.getBoundingClientRect(),cs=getComputedStyle(el),m=cs.backgroundColor.match(/rgba?\(([^)]+)\)/),v=m?m[1].split(',').map(Number):[0,0,0];return {width:r.width,right:r.right,bg:cs.backgroundColor,lum:(.2126*(v[0]||0)+.7152*(v[1]||0)+.0722*(v[2]||0))/255}});
  assert(visual.lum<.55,`${d.name}/${key}: zero-state surface is too bright (${visual.bg})`);
  assert(visual.right<=d.viewport.width+8,`${d.name}/${key}: zero-state overflows viewport`);
  if(d.name==='mobile'){const heights=await card.locator('button').evaluateAll(bs=>bs.map(b=>b.getBoundingClientRect().height));assert(heights.every(h=>h>=43),`${key}: mobile actions below ~44px: ${JSON.stringify(heights)}`)}
  await page.evaluate(()=>{window.frontierEmptyStateSync?.();window.frontierEmptyStateSync?.()});assert.equal(await card.count(),1,`${d.name}/${key}: repeated sync duplicated card`);
}

const browser=await chromium.launch({headless:true});
for(const d of devices){
  const ctx=await browser.newContext({viewport:d.viewport,isMobile:d.isMobile,hasTouch:d.hasTouch});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e)));
  await prepare(page);
  const registry=await page.evaluate(()=>window.frontierEmptyStateRegistry?.()||[]);assert.equal(registry.length,8,`${d.name}: expected eight registered zero-data states`);

  for(const [kind,id,view,key] of cases){await openZero(page,kind,id,view);await assertCard(page,d,key)}
  await restoreEmployees(page);

  // Critical Path action must route to the place where data is created.
  await openZero(page,'critical','critical-path','criticalPath');await page.getByRole('button',{name:'Open project portfolio'}).click();await settle(page,100);assert.equal(await page.evaluate(()=>state.view),'portfolio',`${d.name}: Critical Path CTA did not open Project Portfolio`);

  // Portfolio lifecycle: creating data removes the zero state.
  await openZero(page,'portfolio','portfolio','portfolio');await page.evaluate(()=>createPortfolioProject('frontier'));await settle(page,100);await page.evaluate(()=>window.frontierEmptyStateSync?.());assert.equal(await page.locator('[data-fl-zero-key="portfolio.no-projects"]').count(),0,`${d.name}: portfolio zero state survived first project`);

  // Operations lifecycle: first incident replaces quiet-queue guidance with the real incident.
  await openZero(page,'operations','operations','operations');await page.evaluate(()=>triggerOperationalIncident('runtime_outage'));await settle(page,100);await page.evaluate(()=>window.frontierEmptyStateSync?.());assert.equal(await page.locator('[data-fl-zero-key="operations.no-incidents"]').count(),0,`${d.name}: operations zero state survived first incident`);

  // Focus actions lead to real controls rather than dead-end explanatory UI.
  await openZero(page,'governance','governance','governance');await page.getByRole('button',{name:'Focus board motions'}).click();await settle(page,20);assert(/call vote/i.test(await page.evaluate(()=>document.activeElement?.textContent||'')),`${d.name}: governance action did not focus a vote control`);
  await openZero(page,'hiring','hiring','hiring');await page.getByRole('button',{name:'Focus first candidate'}).click();await settle(page,20);assert(/interview/i.test(await page.evaluate(()=>document.activeElement?.textContent||'')),`${d.name}: hiring action did not focus a candidate control`);

  assert.equal(errors.length,0,`${d.name}: runtime errors: ${errors.join(' | ')}`);await ctx.close();
}
await browser.close();
console.log('Empty / zero-data state regression passed for 8 domains on desktop + mobile');
