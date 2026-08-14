// Item 13.4 — tag legacy simulator UI with shared fl-* surface primitives.
(function(){
  const EXCLUDED_CARDS=new Set(['story-scene-card','feel-milestone-card','realism-card','replay-card','founder-card']);
  const SPECIAL_CARDS=['.ops-rotation','.ops-incident','.maint-card','.maint-family','.platform-event','.family-lifecycle article','.rp-grid article','.dep-grid article'];
  const KPI_GROUPS=['.resource-strip','.telemetry-grid','.slo-kpis','.maint-kpis','.replay-career','.realism-summary'];

  const classes=el=>el?.classList?[...el.classList]:[];
  const suffix=(el,s)=>classes(el).some(c=>c.endsWith(s));
  const contains=(el,s)=>classes(el).some(c=>c.includes(s));
  const add=(el,cls,kind)=>{
    if(!el||!el.classList)return;
    if(!el.classList.contains(cls))el.classList.add(cls);
    if(kind&&!el.dataset.flSurface)el.dataset.flSurface=kind;
  };

  function preserveLaunchAccent(el){
    if(el.style.getPropertyValue('--fl-launch-bg'))return;
    const cs=getComputedStyle(el);
    const bg=cs.backgroundImage&&cs.backgroundImage!=='none'?cs.backgroundImage:cs.backgroundColor;
    if(bg&&bg!=='none')el.style.setProperty('--fl-launch-bg',bg);
    if(cs.borderColor)el.style.setProperty('--fl-launch-border',cs.borderColor);
  }

  function decorateGroup(group){
    add(group,'fl-kpi-grid','kpi-grid');
    for(const child of group.children)add(child,'fl-kpi','kpi');
  }

  function decorateElement(el){
    if(!(el instanceof Element))return;
    const cs=classes(el);

    if(el.classList.contains('panel'))add(el,'fl-panel','panel');
    if(suffix(el,'-launch')){preserveLaunchAccent(el);add(el,'fl-launch','launch')}
    if(suffix(el,'-card')&&!cs.some(c=>EXCLUDED_CARDS.has(c)))add(el,'fl-card','card');
    if(suffix(el,'-summary'))decorateGroup(el);
    if(suffix(el,'-row'))add(el,'fl-row','row');
    if(suffix(el,'-actions'))add(el,'fl-actions','actions');
    if(suffix(el,'-head')&&!el.classList.contains('incident-head')&&!el.classList.contains('progress-head'))add(el,'fl-section-head','section-head');
    if(cs.includes('status')||cs.includes('counter')||suffix(el,'-badge')||suffix(el,'-pill')||suffix(el,'-tag'))add(el,'fl-badge','badge');
    if(contains(el,'empty')&&!el.classList.contains('empty-progress'))add(el,'fl-empty','empty');
  }

  function decorate(root=document){
    const nodes=[];
    if(root instanceof Element)nodes.push(root);
    if(root.querySelectorAll)nodes.push(...root.querySelectorAll('*'));
    for(const el of nodes)decorateElement(el);

    const scope=root.querySelectorAll?root:document;
    for(const selector of SPECIAL_CARDS){
      for(const el of scope.querySelectorAll(selector))add(el,'fl-card','card');
      if(root instanceof Element&&root.matches(selector))add(root,'fl-card','card');
    }
    for(const selector of KPI_GROUPS){
      for(const el of scope.querySelectorAll(selector))decorateGroup(el);
      if(root instanceof Element&&root.matches(selector))decorateGroup(root);
    }
  }

  window.frontierSurfaceDecorate=decorate;
  document.documentElement.dataset.flSurfaceSystem='1';
  decorate(document);

  const host=document.getElementById('app')||document.body;
  const observer=new MutationObserver(records=>{
    for(const record of records)for(const node of record.addedNodes)if(node instanceof Element)decorate(node);
  });
  observer.observe(host,{childList:true,subtree:true});
})();
