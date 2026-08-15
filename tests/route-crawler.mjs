import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const inventory=JSON.parse(fs.readFileSync('visual-qa/inventory.json','utf8'));
const matrix=JSON.parse(fs.readFileSync('visual-qa/responsive-matrix.json','utf8'));
const outRoot=path.resolve(process.env.ROUTE_CRAWL_DIR||'artifacts/route-crawl');
const expectedVisits=inventory.screens.length*matrix.viewports.length;
const screenIds=new Set(inventory.screens.map(x=>x.id));
const mappedFunctions=new Map();
for(const screen of inventory.screens)for(const fn of screen.entrypoints||[])if(!mappedFunctions.has(fn))mappedFunctions.set(fn,screen.id);

fs.rmSync(outRoot,{recursive:true,force:true});
fs.mkdirSync(outRoot,{recursive:true});

const report={
  version:1,
  item:'13.15',
  generatedAt:new Date().toISOString(),
  sourceUrl:url,
  inventoryVersion:inventory.version,
  responsiveMatrixVersion:matrix.version,
  expectedVisits,
  visits:[],
  viewportSummaries:{},
  failures:[],
  warnings:[],
  runtimeOpeners:[],
  routeGraph:[],
  orphanRuntimePages:[]
};

const unique=(rows,keyFn)=>[...new Map(rows.map(x=>[keyFn(x),x])).values()];
async function settle(page,ms=60){await page.waitForTimeout(ms);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
async function sync(page){await page.evaluate(()=>{window.frontierPageSweepSync?.();window.frontierResponsiveSync?.();window.frontierAccessibilitySync?.();window.frontierOverlaySync?.()});await settle(page,20)}
async function dismissStory(page){for(let i=0;i<12;i++){const overlay=page.locator('.story-overlay');if(!(await overlay.count()))break;const primary=overlay.locator('button.primary').last();if(await primary.count())await primary.click();else{const any=overlay.locator('button').last();if(!(await any.count()))break;await any.click()}await settle(page,30)}}
async function graduate(page){await page.evaluate(()=>{state.campaign||={version:1};state.campaign.graduated=true;state.campaign.companyPriority=state.campaign.companyPriority||'research';state.campaign.modelReviewed=true;save();render()});await settle(page,80);await sync(page)}
async function goHome(page){await page.evaluate(()=>{if(typeof window.gameplayGoHome==='function')window.gameplayGoHome();else{state.view='company';save();render()}});await settle(page,55);await dismissStory(page);await sync(page)}
async function availableEntrypoint(page,names){return page.evaluate(xs=>xs.find(name=>typeof window[name]==='function'&&window[name].length===0)||null,names)}
async function invoke(page,name){return page.evaluate(fn=>{try{if(typeof window[fn]!=='function')return {ok:false,error:'missing'};window[fn]();return {ok:true}}catch(error){return {ok:false,error:String(error?.stack||error)}}},name)}
async function pageMeta(page){return page.evaluate(()=>{
  const app=document.getElementById('app');const shell=app?.querySelector('.fl-page-shell');const r=shell?.getBoundingClientRect();
  const visibleControls=[...document.querySelectorAll('button,a[href],[role="button"],input,select,textarea')].filter(el=>{const x=el.getBoundingClientRect(),cs=getComputedStyle(el);return x.width>0&&x.height>0&&cs.display!=='none'&&cs.visibility!=='hidden'&&!el.disabled}).length;
  return {
    pageId:app?.dataset.flPageId||null,
    category:app?.dataset.flPageCategory||null,
    responsiveMode:document.documentElement.dataset.flResponsiveMode||null,
    shellCount:app?.querySelectorAll('.fl-page-shell').length||0,
    shellWidth:r?.width||0,shellHeight:r?.height||0,
    textLength:(shell?.innerText||app?.innerText||'').trim().length,
    bodyWidth:document.body.scrollWidth,viewportWidth:document.documentElement.clientWidth,
    visibleControls,url:location.href
  };
})}
async function extractRouteReferences(page,source,surface='page'){
  const entries=[...mappedFunctions.entries()].map(([fn,target])=>({fn,target}));
  const refs=await page.evaluate(entries=>{
    const selectors='a[href],button,[role="button"],[onclick],[data-route],[data-view],[data-page]';
    const visible=el=>{const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return r.width>0&&r.height>0&&cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)>.05&&!el.disabled};
    const rows=[];
    for(const el of document.querySelectorAll(selectors)){
      if(!visible(el))continue;
      const hay=[el.getAttribute('onclick'),el.getAttribute('href'),el.getAttribute('data-route'),el.getAttribute('data-view'),el.getAttribute('data-page')].filter(Boolean).join(' ');
      if(!hay)continue;
      for(const item of entries)if(hay.includes(item.fn))rows.push({target:item.target,entrypoint:item.fn,label:(el.innerText||el.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,100)});
    }
    return rows;
  },entries);
  return unique(refs.map(x=>({source,surface,...x})),x=>`${x.source}|${x.surface}|${x.target}|${x.entrypoint}|${x.label}`);
}
function fail(type,details){report.failures.push({type,...details})}
function warn(type,details){report.warnings.push({type,...details})}

const browser=await chromium.launch({headless:true});
try{
  for(const viewport of matrix.viewports){
    const ctx=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},isMobile:viewport.isMobile,hasTouch:viewport.hasTouch,deviceScaleFactor:1,locale:'en-US',timezoneId:'UTC',colorScheme:'dark',reducedMotion:'reduce'});
    const page=await ctx.newPage();const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e?.stack||e)));
    const response=await page.goto(url,{waitUntil:'networkidle'});
    if(!response||!response.ok())fail('document-load',{viewport:viewport.id,status:response?.status()||null});
    await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});await settle(page,80);await sync(page);

    const founder=page.getByRole('button',{name:/found the lab/i});
    if(!(await founder.count())){fail('founder-missing',{viewport:viewport.id});await ctx.close();continue}
    await founder.click();await settle(page,90);await dismissStory(page);await graduate(page);await goHome(page);

    const runtimeRegistry=await page.evaluate(()=>window.frontierPageSweepRegistry?.()||[]);
    const runtimeIds=runtimeRegistry.map(x=>x.id).filter(Boolean);
    const missingRuntime=inventory.screens.filter(x=>!runtimeIds.includes(x.id)).map(x=>x.id);
    const extraRuntime=runtimeIds.filter(id=>!screenIds.has(id));
    if(missingRuntime.length)fail('runtime-registry-missing',{viewport:viewport.id,screenIds:missingRuntime});
    if(extraRuntime.length)fail('runtime-registry-extra',{viewport:viewport.id,screenIds:extraRuntime});

    const viewportEdges=[];
    viewportEdges.push(...await extractRouteReferences(page,'company-home','home'));
    if(await page.evaluate(()=>typeof window.gameplayToggleMenu==='function')){
      await page.evaluate(()=>window.gameplayToggleMenu());await settle(page,45);await sync(page);
      viewportEdges.push(...await extractRouteReferences(page,'company-home','more-sheet'));
      await page.evaluate(()=>window.gameplayCloseMenu?.());await settle(page,25);await sync(page);
    }

    let passed=0;
    for(const screen of inventory.screens){
      await goHome(page);
      const entry=await availableEntrypoint(page,screen.entrypoints||[]);
      if(!entry){fail('entrypoint-missing',{viewport:viewport.id,screenId:screen.id,candidates:screen.entrypoints||[]});continue}
      const beforeErrors=pageErrors.length;const result=await invoke(page,entry);
      if(!result.ok){fail('route-threw',{viewport:viewport.id,screenId:screen.id,entrypoint:entry,error:result.error});continue}
      await settle(page,65);await dismissStory(page);await sync(page);
      const meta=await pageMeta(page);const routeErrors=pageErrors.slice(beforeErrors);
      const row={viewport:viewport.id,screenId:screen.id,label:screen.label,category:screen.category,entrypoint:entry,...meta,pageErrors:routeErrors};report.visits.push(row);
      if(meta.pageId!==screen.id)fail('wrong-page-id',{viewport:viewport.id,screenId:screen.id,entrypoint:entry,actual:meta.pageId});
      if(meta.category!==screen.category)fail('wrong-category',{viewport:viewport.id,screenId:screen.id,expected:screen.category,actual:meta.category});
      if(meta.responsiveMode!==viewport.id)fail('wrong-responsive-mode',{viewport:viewport.id,screenId:screen.id,expected:viewport.id,actual:meta.responsiveMode});
      if(meta.shellCount<1||meta.shellWidth<1||meta.shellHeight<1)fail('page-shell-missing',{viewport:viewport.id,screenId:screen.id,meta});
      if(meta.textLength<20)fail('blank-route',{viewport:viewport.id,screenId:screen.id,textLength:meta.textLength});
      if(meta.bodyWidth>meta.viewportWidth+8)fail('horizontal-overflow',{viewport:viewport.id,screenId:screen.id,bodyWidth:meta.bodyWidth,viewportWidth:meta.viewportWidth});
      if(routeErrors.length)fail('page-error',{viewport:viewport.id,screenId:screen.id,errors:routeErrors});
      viewportEdges.push(...await extractRouteReferences(page,screen.id,'route'));
      await goHome(page);const homeMeta=await pageMeta(page);
      if(homeMeta.pageId!=='company-home')fail('home-recovery',{viewport:viewport.id,screenId:screen.id,actual:homeMeta.pageId});
      else passed++;
    }

    const dedupEdges=unique(viewportEdges,x=>`${x.source}|${x.surface}|${x.target}|${x.entrypoint}|${x.label}`);
    report.routeGraph.push(...dedupEdges.map(x=>({viewport:viewport.id,...x})));
    const linkedTargets=new Set(dedupEdges.map(x=>x.target));
    const graphCandidates=inventory.screens.filter(x=>x.id!=='company-home');
    const graphCoverage=graphCandidates.length?linkedTargets.size/graphCandidates.length:1;
    const navigationGaps=graphCandidates.filter(x=>!linkedTargets.has(x.id)).map(x=>x.id);
    if(graphCoverage>=0.75&&navigationGaps.length)fail('navigation-graph-orphans',{viewport:viewport.id,coverage:Number(graphCoverage.toFixed(3)),screenIds:navigationGaps});
    else if(navigationGaps.length)warn('navigation-graph-advisory',{viewport:viewport.id,coverage:Number(graphCoverage.toFixed(3)),screenIds:navigationGaps,reason:'Inline route-reference discovery covers less than 75% of screens, so event-listener based navigation may be in use.'});

    if(viewport.id==='desktop'){
      const discovered=await page.evaluate(pattern=>{const re=new RegExp(pattern);return Object.getOwnPropertyNames(window).filter(name=>re.test(name)&&typeof window[name]==='function'&&window[name].length===0).sort()},inventory.discovery.runtimePattern);
      for(const opener of discovered){
        const mapped=mappedFunctions.get(opener)||null;await goHome(page);const before=(await pageMeta(page)).pageId;const result=await invoke(page,opener);await settle(page,45);await dismissStory(page);await sync(page);const after=await pageMeta(page);
        const kind=after.pageId&&after.pageId!==before?'page':'non-page';report.runtimeOpeners.push({opener,mappedScreenId:mapped,beforePageId:before,afterPageId:after.pageId,kind,ok:result.ok,error:result.error||null});
        if(!result.ok){warn('runtime-opener-threw',{opener,error:result.error});continue}
        if(kind==='page'&&!screenIds.has(after.pageId)){const orphan={opener,pageId:after.pageId};report.orphanRuntimePages.push(orphan);fail('orphan-runtime-page',orphan)}
        else if(kind==='page'&&screenIds.has(after.pageId)&&!mappedFunctions.has(opener))fail('unmapped-page-opener',{opener,pageId:after.pageId});
      }
    }

    report.viewportSummaries[viewport.id]={expectedRoutes:inventory.screens.length,passedRoutes:passed,routeReferences:dedupEdges.length,linkedTargets:linkedTargets.size,graphCoverage:Number(graphCoverage.toFixed(3)),navigationGaps};
    await ctx.close();
  }
}finally{await browser.close()}

const perViewport=new Map();
for(const row of report.visits){if(!perViewport.has(row.viewport))perViewport.set(row.viewport,new Set());perViewport.get(row.viewport).add(row.screenId)}
for(const viewport of matrix.viewports){const seen=perViewport.get(viewport.id)||new Set();const missing=inventory.screens.filter(x=>!seen.has(x.id)).map(x=>x.id);if(missing.length)fail('crawl-incomplete',{viewport:viewport.id,screenIds:missing})}
if(report.visits.length!==expectedVisits)fail('visit-count',{expected:expectedVisits,actual:report.visits.length});

fs.writeFileSync(path.join(outRoot,'report.json'),JSON.stringify(report,null,2)+'\n');
const md=['# Route crawl report','',`- Expected route/viewport visits: **${expectedVisits}**`,`- Actual visits: **${report.visits.length}**`,`- Failures: **${report.failures.length}**`,`- Warnings: **${report.warnings.length}**`,`- Runtime \`*Open\` functions inspected: **${report.runtimeOpeners.length}**`,`- Orphan runtime pages: **${report.orphanRuntimePages.length}**`,'','## Viewports','', '| Viewport | Passed routes | Route references | Graph coverage | Navigation gaps |','| --- | ---: | ---: | ---: | --- |'];
for(const viewport of matrix.viewports){const x=report.viewportSummaries[viewport.id]||{};md.push(`| ${viewport.id} | ${x.passedRoutes||0}/${inventory.screens.length} | ${x.routeReferences||0} | ${Math.round((x.graphCoverage||0)*100)}% | ${(x.navigationGaps||[]).join(', ')||'None'} |`)}
md.push('','## Failures','');if(report.failures.length)for(const x of report.failures)md.push(`- **${x.type}** — \`${JSON.stringify(x)}\``);else md.push('- None.');
md.push('','## Warnings','');if(report.warnings.length)for(const x of report.warnings)md.push(`- **${x.type}** — \`${JSON.stringify(x)}\``);else md.push('- None.');
fs.writeFileSync(path.join(outRoot,'REPORT.md'),md.join('\n')+'\n');

if(report.failures.length){console.error(`Route crawl failed with ${report.failures.length} failure(s). See ${path.join(outRoot,'REPORT.md')}`);process.exit(1)}
console.log(`Route crawl passed: ${inventory.screens.length} routes × ${matrix.viewports.length} viewports = ${expectedVisits} visits; runtime opener and navigation graph audits complete`);
