// Item 13.8 — page-by-page visual sweep for every route in visual-qa/inventory.json.
(function(){
  const PAGES=[
    {id:'company-home',category:'core',entrypoints:['gameplayGoHome']},
    {id:'training',category:'core',entrypoints:['gameplayGoTrain']},
    {id:'hiring',category:'core',entrypoints:['hiringOpen']},
    {id:'model-lab',category:'core',entrypoints:['modelLabOpen']},
    {id:'workstation',category:'learning',entrypoints:['workstationOpen']},
    {id:'code-lab',category:'learning',entrypoints:['codeLabOpen']},
    {id:'knowledge',category:'learning',entrypoints:['knowledgeOpen']},
    {id:'career',category:'learning',entrypoints:['careerOpen']},
    {id:'postmortems',category:'learning',entrypoints:['postmortemsOpen','postmortemOpen']},
    {id:'engineering-artifacts',category:'learning',entrypoints:['engineeringArtifactsOpen']},
    {id:'incident-artifacts',category:'learning',entrypoints:['incidentArtifactsOpen']},
    {id:'data-evals',category:'engineering',entrypoints:['dataEvalsOpen']},
    {id:'tech-debt',category:'engineering',entrypoints:['techDebtOpen']},
    {id:'architecture',category:'engineering',entrypoints:['architectureOpen']},
    {id:'model-families',category:'engineering',entrypoints:['familyForksOpen','familyOpen']},
    {id:'maintenance',category:'engineering',entrypoints:['maintenanceEconomicsOpen','maintenanceOpen']},
    {id:'operations',category:'engineering',entrypoints:['opsOpen']},
    {id:'reliability',category:'engineering',entrypoints:['sloOpen']},
    {id:'release-governance',category:'engineering',entrypoints:['releaseGovOpen']},
    {id:'roadmap',category:'company',entrypoints:['roadmapPressureOpen']},
    {id:'quarterly-board',category:'company',entrypoints:['boardPlanningOpen']},
    {id:'capital',category:'company',entrypoints:['financeStrategyOpen']},
    {id:'macro-restructuring',category:'company',entrypoints:['macroOpen','restructuringOpen']},
    {id:'governance',category:'company',entrypoints:['governanceOpen']},
    {id:'executive-politics',category:'company',entrypoints:['execPoliticsOpen']},
    {id:'talent-memory',category:'company',entrypoints:['talentMemoryOpen']},
    {id:'org-management',category:'company',entrypoints:['orgOpen','orgManagementOpen']},
    {id:'workforce',category:'company',entrypoints:['workforceOpen']},
    {id:'portfolio',category:'company',entrypoints:['portfolioOpen']},
    {id:'critical-path',category:'company',entrypoints:['criticalPathOpen']},
    {id:'programs',category:'company',entrypoints:['programOpen']},
    {id:'program-learning',category:'company',entrypoints:['programLearningOpen']},
    {id:'strategy',category:'company',entrypoints:['strategyOpen']},
    {id:'investment',category:'company',entrypoints:['committeeOpen']},
    {id:'competition',category:'external',entrypoints:['competitiveOpen']},
    {id:'ecosystem',category:'external',entrypoints:['ecosystemOpen']},
    {id:'policy',category:'external',entrypoints:['policyOpen']},
    {id:'communications',category:'external',entrypoints:['communicationsOpen']}
  ];
  const byId=new Map(PAGES.map(x=>[x.id,x]));
  const byEntrypoint=new Map();
  for(const page of PAGES)for(const name of page.entrypoints)byEntrypoint.set(name,page);
  const VIEW_IDS={
    company:'company-home',hiring:'hiring',modelLab:'model-lab',workstation:'workstation',codeLab:'code-lab',knowledge:'knowledge',career:'career',
    postmortems:'postmortems',engineeringArtifacts:'engineering-artifacts',incidentArtifacts:'incident-artifacts',dataEvals:'data-evals',techDebt:'tech-debt',
    architecturePortfolio:'architecture',architecture:'architecture',familyForks:'model-families',maintenance:'maintenance',operations:'operations',slo:'reliability',
    releaseGov:'release-governance',roadmapPressure:'roadmap',quarterlyBoard:'quarterly-board',financeStrategy:'capital',macro:'macro-restructuring',
    governance:'governance',execPolitics:'executive-politics',talentMemory:'talent-memory',orgManagement:'org-management',workforce:'workforce',portfolio:'portfolio',
    criticalPath:'critical-path',program:'programs',programLearning:'program-learning',portfolioStrategy:'strategy',investmentCommittee:'investment',competitive:'competition',
    ecosystem:'ecosystem',policy:'policy',communications:'communications'
  };
  const ROOT_EXCLUDE='.gameplay-guidance,lab-install-prompt,.story-overlay,.modal-back,.incident-back,.feel-milestone,.gameplay-more-sheet';
  const BRIGHT_TAGS=new Set(['BUTTON','DIV','SECTION','ARTICLE','ASIDE','HEADER','FOOTER','FIELDSET','LI','TD','TH','DETAILS','SUMMARY','INPUT','SELECT','TEXTAREA']);
  let activeId=null,queued=false;

  function pageFor(id){return byId.get(id)||null}
  function inferPage(){
    if(activeId&&byId.has(activeId))return byId.get(activeId);
    try{
      if(typeof state!=='undefined'){
        const id=VIEW_IDS[state.view];if(id)return byId.get(id)||null;
      }
    }catch{}
    return null;
  }
  function primaryRoot(app){
    const candidates=[...app.children].filter(el=>el.nodeType===1&&!el.matches(ROOT_EXCLUDE));
    return candidates.find(el=>el.classList.contains('game-shell')||[...el.classList].some(c=>c.endsWith('-shell')))||candidates[0]||null;
  }
  function tagStructure(root){
    if(!root)return;
    root.classList.add('fl-page-shell');
    const direct=[...root.children];
    const head=direct.find(el=>el.tagName==='HEADER'||[...el.classList].some(c=>c.endsWith('-head')))||root.querySelector(':scope > header,:scope > [class$="-head"]');
    head?.classList.add('fl-page-head');
    for(const el of root.querySelectorAll('*')){
      const cs=[...el.classList];
      if(cs.some(c=>c.endsWith('-grid')||c==='grid'))el.classList.add('fl-page-grid');
      if(cs.some(c=>c.endsWith('-tabs')||c==='tabs'))el.classList.add('fl-page-tabs');
      if(cs.some(c=>c.endsWith('-empty')||c==='empty-state'||c==='fl-empty'))el.classList.add('fl-page-empty');
    }
  }
  function parseColor(color){
    const m=String(color).match(/rgba?\(([^)]+)\)/);if(!m)return null;
    const v=m[1].split(',').map(Number);return {r:v[0]||0,g:v[1]||0,b:v[2]||0,a:v.length>3?v[3]:1};
  }
  function repairBrightSurfaces(app){
    let repaired=0;
    for(const el of app.querySelectorAll('*')){
      if(!BRIGHT_TAGS.has(el.tagName)||el.closest('[data-fl-allow-light-surface="true"]'))continue;
      if(el.matches('input[type="color"]'))continue;
      const r=el.getBoundingClientRect();if(r.width<28||r.height<12||r.bottom<0||r.right<0)continue;
      const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)<.08)continue;
      const c=parseColor(cs.backgroundColor);if(!c||c.a<.72)continue;
      const luminance=(.2126*c.r+.7152*c.g+.0722*c.b)/255;
      if(luminance<.86||r.width*r.height<500)continue;
      el.classList.add('fl-page-bright-repair');repaired++;
    }
    app.dataset.flBrightRepairs=String(repaired);
  }
  function guardOverflow(root){
    if(!root)return;
    for(const el of root.querySelectorAll('pre,table,[class*="table"],[class*="grid"],[class*="row"],[class*="tabs"]')){
      const r=el.getBoundingClientRect();if(r.width<=0)continue;
      const cs=getComputedStyle(el);
      if(el.scrollWidth>el.clientWidth+6&&!['auto','scroll'].includes(cs.overflowX))el.classList.add('fl-page-overflow-guard');
    }
  }
  function decorate(){
    queued=false;
    const app=document.getElementById('app');if(!app)return;
    const page=inferPage();
    if(!page){
      app.removeAttribute('data-fl-page-id');app.removeAttribute('data-fl-page-category');return;
    }
    app.dataset.flPageId=page.id;app.dataset.flPageCategory=page.category;
    document.documentElement.dataset.flPageSweep='1';
    const root=primaryRoot(app);
    if(root){root.dataset.flPageId=page.id;root.dataset.flPageCategory=page.category;tagStructure(root);guardOverflow(root)}
    repairBrightSurfaces(app);
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(decorate))}
  function wrapEntrypoint(name,page){
    const original=window[name];if(typeof original!=='function'||original.__flPageSweepWrapped)return;
    function wrapped(){activeId=page.id;const out=original.apply(this,arguments);schedule();return out}
    wrapped.__flPageSweepWrapped=true;wrapped.__flPageSweepOriginal=original;window[name]=wrapped;
  }
  for(const [name,page] of byEntrypoint)wrapEntrypoint(name,page);

  window.frontierPageSweepSync=decorate;
  window.frontierPageSweepRegistry=()=>PAGES.map(x=>({id:x.id,category:x.category,entrypoints:[...x.entrypoints]}));
  window.frontierPageSweepSet=id=>{if(byId.has(id)){activeId=id;schedule();return true}return false};
  document.documentElement.dataset.flPageSweep='1';

  const app=document.getElementById('app');
  if(app)new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1)))schedule()}).observe(app,{childList:true,subtree:true});
  addEventListener('resize',schedule);
  schedule();
})();
