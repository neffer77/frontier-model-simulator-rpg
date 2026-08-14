import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const inventory=JSON.parse(fs.readFileSync('visual-qa/inventory.json','utf8'));
const outRoot=path.resolve(process.env.VISUAL_INVENTORY_DIR||'artifacts/visual-inventory');
fs.rmSync(outRoot,{recursive:true,force:true});
fs.mkdirSync(outRoot,{recursive:true});

const requiredRouteIds=new Set([
  'company-home','training','hiring','data-evals','tech-debt','operations','reliability',
  'release-governance','roadmap','capital','governance','executive-politics','talent-memory',
  'workforce','portfolio','programs','strategy','investment','competition','ecosystem','policy',
  'communications','architecture','critical-path','quarterly-board'
]);

const browser=await chromium.launch({headless:true});
const report={
  version:1,
  generatedAt:new Date().toISOString(),
  sourceUrl:url,
  inventoryVersion:inventory.version,
  knownDefects:inventory.knownDefects,
  devices:{},
  unresolvedScreens:[],
  discoveredOpeners:[]
};

const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function settle(page,ms=100){
  await page.waitForTimeout(ms);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}

async function dismissStory(page){
  for(let i=0;i<12;i++){
    const overlay=page.locator('.story-overlay');
    if(!(await overlay.count()))break;
    const primary=overlay.locator('button.primary').last();
    if(await primary.count())await primary.click();
    else {
      const any=overlay.locator('button').last();
      if(await any.count())await any.click();else break;
    }
    await settle(page,35);
  }
}

async function goHome(page){
  await page.evaluate(()=>{
    if(typeof window.gameplayGoHome==='function')window.gameplayGoHome();
    else {state.view='company';save();render();}
  });
  await settle(page,80);
}

async function graduate(page){
  await page.evaluate(()=>{
    state.campaign ||= {version:1};
    state.campaign.graduated=true;
    state.campaign.companyPriority=state.campaign.companyPriority||'research';
    state.campaign.modelReviewed=true;
    save();render();
  });
  await settle(page,100);
}

async function seedRepresentativeModel(page){
  await page.evaluate(()=>{
    state.cashM=Math.max(Number(state.cashM||0),20);
    state.compute=Math.max(Number(state.compute||0),120000);
    state.research=Math.max(Number(state.research||0),8);
    state.reputation=Math.max(Number(state.reputation||0),12);
    if(!(state.models||[]).length){
      const p=typeof trainingPhysics==='function'?trainingPhysics(MODEL_TIERS[0]):{flops:2.52e20,gpuHours:213,batch:262144,steps:45777,tokens:12000000000,techBoost:0};
      state.models=[{
        id:'visual-qa-model-1',name:'VISUAL-1',tier:'350M Dense',paramsB:.35,tokensB:12,steps:p.steps,score:61,day:state.day||1,
        architecture:{type:'Dense Transformer',parametersB:.35,activeParametersB:.35,contextLength:8192,precision:'BF16 mixed'},
        training:{status:'completed',startedDay:1,completedDay:state.day||1,config:{precision:'bf16'},history:[]},
        checkpoints:[],evals:[],experiments:[],postTraining:[],launches:[],incidents:[],
        costs:{trainingM:.2,simulatedH100h:p.gpuHours},capabilities:{},weaknesses:[],technicalDebt:[]
      }];
    }
    save();render();
  });
  await settle(page,120);
}

async function seedIncident(page){
  await page.evaluate(()=>{
    const t=MODEL_TIERS.find(x=>x.id==='350m')||MODEL_TIERS[0];
    state.activeRun={name:'VISUAL-INCIDENT',tier:t.id,progress:35,phase:'pretraining',physics:trainingPhysics(t),startedDay:state.day||1,loss:2.73,incident:'nan'};
    state.selectedIncident='nan';
    state.incidentTab='metrics';
    save();render();
  });
  await settle(page,100);
}

async function clearIncident(page){
  await page.evaluate(()=>{state.activeRun=null;state.selectedIncident=null;save();render()});
  await settle(page,80);
}

async function availableEntrypoint(page,candidates){
  return page.evaluate(names=>names.find(name=>typeof window[name]==='function'&&window[name].length===0)||null,candidates);
}

async function invoke(page,name){
  return page.evaluate(fn=>{
    try{
      if(typeof window[fn]!=='function')return {ok:false,error:'missing'};
      window[fn]();
      return {ok:true};
    }catch(error){return {ok:false,error:String(error?.stack||error)}}
  },name);
}

async function brightSurfaceScan(page){
  return page.evaluate(()=>{
    const parse=color=>{
      const m=String(color).match(/rgba?\(([^)]+)\)/);if(!m)return null;
      const v=m[1].split(',').map(Number);return {r:v[0]||0,g:v[1]||0,b:v[2]||0,a:v.length>3?v[3]:1};
    };
    const pathFor=el=>{
      const id=el.id?`#${el.id}`:'';
      const cls=[...el.classList].slice(0,4).map(x=>`.${x}`).join('');
      return `${el.tagName.toLowerCase()}${id}${cls}`;
    };
    const ignore=new Set(['HTML','BODY','IMG','PICTURE','VIDEO','CANVAS','SVG','PATH','SCRIPT','STYLE','LINK','META']);
    const suspects=[];
    for(const el of document.querySelectorAll('body *')){
      if(ignore.has(el.tagName))continue;
      const r=el.getBoundingClientRect();
      if(r.width<28||r.height<12||r.bottom<0||r.right<0||r.top>document.documentElement.scrollHeight)continue;
      const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)<.08)continue;
      const c=parse(cs.backgroundColor);if(!c||c.a<.72)continue;
      const luminance=(.2126*c.r+.7152*c.g+.0722*c.b)/255;
      const area=r.width*r.height;
      if(luminance<.88||area<550)continue;
      suspects.push({
        selector:pathFor(el),tag:el.tagName.toLowerCase(),background:cs.backgroundColor,color:cs.color,
        width:Math.round(r.width),height:Math.round(r.height),area:Math.round(area),
        text:String(el.innerText||el.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,120)
      });
    }
    return suspects.sort((a,b)=>b.area-a.area).slice(0,30);
  });
}

async function capture(page,deviceDir,deviceReport,id,label,stateClasses,extra={}){
  await settle(page,80);
  const screenshot=`${String(deviceReport.captures.length+1).padStart(3,'0')}-${slug(id)}.png`;
  const file=path.join(deviceDir,screenshot);
  const brightSurfaces=await brightSurfaceScan(page);
  const meta=await page.evaluate(()=>({
    view:typeof state!=='undefined'?state.view:null,
    started:typeof state!=='undefined'?!!state.started:null,
    title:(document.querySelector('h1')?.textContent||document.querySelector('h2')?.textContent||document.title||'').trim(),
    bodyWidth:document.body.scrollWidth,bodyHeight:document.body.scrollHeight,
    domNodes:document.getElementsByTagName('*').length
  }));
  await page.screenshot({path:file,fullPage:true,animations:'disabled'});
  const row={id,label,stateClasses,screenshot,...meta,brightSurfaces,...extra};
  deviceReport.captures.push(row);
  return row;
}

function matrixMarkdown(deviceReports){
  const lines=['# Generated visual inventory','',`Generated: ${report.generatedAt}`,'',
    '| Device | Capture | State | View | Bright-surface suspects | Screenshot |','| --- | --- | --- | --- | ---: | --- |'];
  for(const [device,r] of Object.entries(deviceReports))for(const c of r.captures){
    lines.push(`| ${device} | ${c.label.replace(/\|/g,'/')} | ${(c.stateClasses||[]).join(', ')} | ${String(c.view||'—')} | ${c.brightSurfaces.length} | ${c.screenshot} |`);
  }
  lines.push('','## Unresolved inventory entries','');
  if(report.unresolvedScreens.length)for(const x of report.unresolvedScreens)lines.push(`- **${x.id}** — ${x.label}: ${x.reason}`);else lines.push('- None');
  lines.push('','## Runtime-discovered zero-argument `*Open` functions','');
  if(report.discoveredOpeners.length)for(const x of report.discoveredOpeners)lines.push(`- ${x}`);else lines.push('- None beyond the explicit inventory.');
  return lines.join('\n')+'\n';
}

for(const device of inventory.viewports){
  const deviceDir=path.join(outRoot,device.id);fs.mkdirSync(deviceDir,{recursive:true});
  const ctx=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:device.isMobile,hasTouch:device.hasTouch});
  const page=await ctx.newPage();
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e?.stack||e)));
  await page.goto(url,{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'networkidle'});
  await page.addStyleTag({content:'*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important}html{scroll-behavior:auto!important}'});
  const deviceReport={viewport:device,captures:[],pageErrors,routeInventory:[]};report.devices[device.id]=deviceReport;

  await capture(page,deviceDir,deviceReport,'founder','Founder setup',['empty']);

  const found=page.getByRole('button',{name:/found the lab/i});
  if(!(await found.count()))throw new Error(`${device.id}: founder launch button missing`);
  await found.click();await settle(page,100);
  if(await page.locator('.story-overlay').count())await capture(page,deviceDir,deviceReport,'story-intro','Intro story overlay',['populated']);
  await dismissStory(page);
  await capture(page,deviceDir,deviceReport,'company-early','Company / Home — early campaign',['locked','empty']);

  if(typeof await page.evaluate(()=>typeof window.gameplayToggleMenu==='function')){
    await page.evaluate(()=>window.gameplayToggleMenu?.());await settle(page,50);
    await capture(page,deviceDir,deviceReport,'more-locked','More sheet — early locks',['locked']);
    await page.evaluate(()=>window.gameplayCloseMenu?.());await settle(page,30);
  }

  await page.evaluate(()=>window.gameplayGoTrain?.());await settle(page,250);
  await capture(page,deviceDir,deviceReport,'training-empty','Training Operations — no active run',['empty']);
  await goHome(page);
  await graduate(page);
  await capture(page,deviceDir,deviceReport,'company-unlocked-empty','Company / Home — graduated, empty',['unlocked','empty']);
  await page.evaluate(()=>window.gameplayToggleMenu?.());await settle(page,50);
  await capture(page,deviceDir,deviceReport,'more-unlocked','More sheet — graduated',['unlocked']);
  await page.evaluate(()=>window.gameplayCloseMenu?.());await settle(page,30);

  const capturedOpeners=new Set();
  for(const screen of inventory.screens){
    const entry=await availableEntrypoint(page,screen.entrypoints||[]);
    if(!entry){
      deviceReport.routeInventory.push({id:screen.id,label:screen.label,status:'unresolved',entrypoints:screen.entrypoints||[]});
      if(requiredRouteIds.has(screen.id)&&!report.unresolvedScreens.some(x=>x.id===screen.id))report.unresolvedScreens.push({id:screen.id,label:screen.label,reason:`No zero-argument entrypoint found from ${(screen.entrypoints||[]).join(', ')}`});
      continue;
    }
    capturedOpeners.add(entry);
    await goHome(page);
    const beforeErrors=pageErrors.length;
    const result=await invoke(page,entry);await settle(page,110);
    if(!result.ok){
      deviceReport.routeInventory.push({id:screen.id,label:screen.label,status:'error',entrypoint:entry,error:result.error});
      if(!report.unresolvedScreens.some(x=>x.id===screen.id))report.unresolvedScreens.push({id:screen.id,label:screen.label,reason:`${entry} threw: ${result.error}`});
      continue;
    }
    const cap=await capture(page,deviceDir,deviceReport,`route-${screen.id}`,screen.label,['unlocked','empty'],{entrypoint:entry,category:screen.category,newPageErrors:pageErrors.slice(beforeErrors)});
    deviceReport.routeInventory.push({id:screen.id,label:screen.label,status:'captured',entrypoint:entry,view:cap.view,screenshot:cap.screenshot});
  }

  // Discover any zero-argument route-like globals added by modules but not represented above.
  const discovered=await page.evaluate(pattern=>{
    const re=new RegExp(pattern);
    return Object.getOwnPropertyNames(window).filter(name=>re.test(name)&&typeof window[name]==='function'&&window[name].length===0).sort();
  },inventory.discovery.runtimePattern);
  for(const name of discovered){
    if(!report.discoveredOpeners.includes(name))report.discoveredOpeners.push(name);
    if(capturedOpeners.has(name))continue;
    await goHome(page);
    const result=await invoke(page,name);if(!result.ok)continue;await settle(page,90);
    await capture(page,deviceDir,deviceReport,`discovered-${name}`,`Discovered route: ${name}`,['unlocked'],{entrypoint:name,discovered:true});
  }

  // Representative populated state for surfaces that only appear after a model exists.
  await goHome(page);await seedRepresentativeModel(page);
  await capture(page,deviceDir,deviceReport,'company-populated','Company / Home — representative populated state',['unlocked','populated']);
  if(await page.evaluate(()=>typeof window.modelLabSelect==='function')){
    await page.evaluate(()=>window.modelLabSelect(state.models[0].id));await settle(page,100);
    await capture(page,deviceDir,deviceReport,'model-lab-populated','Model Lab — representative model',['populated'],{entrypoint:'modelLabSelect'});
  }

  // Representative error/incident state.
  await goHome(page);await seedIncident(page);
  await capture(page,deviceDir,deviceReport,'training-incident','Training incident investigation',['error','populated']);
  await clearIncident(page);await goHome(page);

  if(await page.evaluate(()=>typeof window.showExplain==='function')){
    await page.evaluate(()=>showExplain('FLOPS'));await settle(page,50);
    await capture(page,deviceDir,deviceReport,'technical-explainer','Technical explainer modal',['populated']);
    await page.evaluate(()=>{const root=document.getElementById('modalRoot');if(root)root.innerHTML=''});await settle(page,20);
  }
  if(await page.evaluate(()=>typeof window.gameFeelMilestone==='function')){
    await page.evaluate(()=>window.gameFeelMilestone('VISUAL QA','Representative milestone surface for the Item 13 inventory.'));await settle(page,50);
    await capture(page,deviceDir,deviceReport,'milestone','Milestone celebration overlay',['populated']);
    await page.evaluate(()=>document.querySelector('.feel-milestone')?.remove());await settle(page,20);
  }
  if(await page.evaluate(()=>typeof window.campaignOpenPriority==='function')){
    await page.evaluate(()=>window.campaignOpenPriority());await settle(page,50);
    await capture(page,deviceDir,deviceReport,'company-priority','Company priority decision',['unlocked','populated']);
    await page.evaluate(()=>document.querySelector('.campaign-priority')?.remove());await settle(page,20);
  }
  if(await page.evaluate(()=>typeof window.realismOpen==='function')){
    await page.evaluate(()=>window.realismOpen());await settle(page,80);
    await capture(page,deviceDir,deviceReport,'realism-audit','Technical Realism Audit',['populated'],{entrypoint:'realismOpen'});
  }
  await goHome(page);
  if(await page.evaluate(()=>typeof window.replayOpen==='function')){
    await page.evaluate(()=>window.replayOpen());await settle(page,80);
    await capture(page,deviceDir,deviceReport,'run-archive','Run Archive / New Game+',['empty','populated'],{entrypoint:'replayOpen'});
  }

  await ctx.close();
}

await browser.close();
report.discoveredOpeners.sort();
fs.writeFileSync(path.join(outRoot,'report.json'),JSON.stringify(report,null,2));
fs.writeFileSync(path.join(outRoot,'MATRIX.md'),matrixMarkdown(report.devices));

const total=Object.values(report.devices).reduce((n,d)=>n+d.captures.length,0);
const bright=Object.values(report.devices).flatMap(d=>d.captures).reduce((n,c)=>n+c.brightSurfaces.length,0);
console.log(JSON.stringify({visualInventory:'captured',screenshots:total,brightSurfaceSuspects:bright,unresolvedScreens:report.unresolvedScreens.length,output:outRoot},null,2));
if(report.unresolvedScreens.some(x=>requiredRouteIds.has(x.id))){
  console.error('Required visual routes unresolved:',report.unresolvedScreens.filter(x=>requiredRouteIds.has(x.id)));
  process.exit(1);
}
