// Item 13.13 — responsive visual sweep runtime.
(function(){
  const g=window;
  let queued=false;
  const MODES=[
    {id:'phone-portrait',label:'Phone portrait',test:{width:390,height:844}},
    {id:'phone-landscape',label:'Phone landscape',test:{width:844,height:390}},
    {id:'tablet',label:'Tablet',test:{width:834,height:1112}},
    {id:'desktop',label:'Desktop',test:{width:1440,height:1000}},
    {id:'wide',label:'Wide desktop',test:{width:1920,height:1080}}
  ];
  const TABLE_WRAP='fl-responsive-table-wrap';
  const INLINE_SCROLL='.rolebar,.fl-page-tabs,.inspect-tabs,.gameplay-system-grid,.campaign-dots,.lineage';

  function viewport(){
    const vv=g.visualViewport;
    return {width:Math.round(vv?.width||g.innerWidth||document.documentElement.clientWidth||0),height:Math.round(vv?.height||g.innerHeight||document.documentElement.clientHeight||0)};
  }
  function modeFor(width,height){
    const landscape=width>height;
    if(width<=600&&!landscape)return 'phone-portrait';
    if(landscape&&height<=600&&width<=1000)return 'phone-landscape';
    if(width<1100)return 'tablet';
    if(width<1600)return 'desktop';
    return 'wide';
  }
  function orientation(width,height){return width>height?'landscape':'portrait'}

  function wrapTables(root=document){
    for(const table of root.querySelectorAll('#app table')){
      if(table.closest(`.${TABLE_WRAP}`))continue;
      const wrap=document.createElement('div');wrap.className=TABLE_WRAP;
      const caption=table.querySelector('caption')?.textContent?.trim();wrap.dataset.flResponsiveTableLabel=caption?`${caption} table, horizontally scrollable`:'Data table, horizontally scrollable';
      table.parentNode?.insertBefore(wrap,table);wrap.appendChild(table);
    }
  }
  function decorateScrollers(root=document){
    for(const el of root.querySelectorAll(INLINE_SCROLL)){
      if(el.scrollWidth>el.clientWidth+2)el.classList.add('fl-responsive-local-scroll');else el.classList.remove('fl-responsive-local-scroll');
    }
    for(const pre of root.querySelectorAll('#app pre'))pre.classList.add('fl-responsive-local-scroll');
    for(const wrap of root.querySelectorAll(`.${TABLE_WRAP}`)){
      const scrollable=wrap.scrollWidth>wrap.clientWidth+2;wrap.dataset.flResponsiveScrollable=String(scrollable);
      if(scrollable){wrap.setAttribute('role','region');wrap.setAttribute('aria-label',wrap.dataset.flResponsiveTableLabel||'Data table, horizontally scrollable');wrap.tabIndex=0}
      else{wrap.removeAttribute('role');wrap.removeAttribute('aria-label');wrap.removeAttribute('tabindex')}
    }
  }
  function applyMode(){
    const {width,height}=viewport(),mode=modeFor(width,height),orient=orientation(width,height),html=document.documentElement,app=document.getElementById('app');
    html.dataset.flResponsiveSweep='1';html.dataset.flResponsiveMode=mode;html.dataset.flResponsiveOrientation=orient;
    html.style.setProperty('--fl-viewport-width',`${width}px`);html.style.setProperty('--fl-viewport-height',`${height}px`);
    if(app){app.dataset.flResponsiveMode=mode;app.dataset.flResponsiveOrientation=orient}
    wrapTables();decorateScrollers();
    return {mode,orientation:orient,width,height};
  }
  function visible(el){const cs=getComputedStyle(el),r=el.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)>.02&&r.width>1&&r.height>1&&!el.closest('[aria-hidden="true"]')}
  function audit(){
    const vp=viewport(),docWidth=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),offenders=[];
    for(const el of document.querySelectorAll('#app *,.gameplay-bottom-nav,.gameplay-more-sheet>section')){
      if(!visible(el)||el.closest(`.${TABLE_WRAP},.fl-responsive-local-scroll`)||el.matches('svg,canvas,img,video'))continue;
      const r=el.getBoundingClientRect();
      if(r.left<-5||r.right>vp.width+5)offenders.push({tag:el.tagName,className:String(el.className||'').slice(0,100),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),text:(el.textContent||'').trim().slice(0,60)});
      if(offenders.length>=20)break;
    }
    const nav=document.querySelector('.gameplay-bottom-nav');const nr=nav&&visible(nav)?nav.getBoundingClientRect():null;
    return {mode:modeFor(vp.width,vp.height),orientation:orientation(vp.width,vp.height),viewport:vp,documentWidth:docWidth,overflow:Math.max(0,docWidth-vp.width),offenders,tableWraps:document.querySelectorAll(`.${TABLE_WRAP}`).length,scrollableTables:document.querySelectorAll(`.${TABLE_WRAP}[data-fl-responsive-scrollable="true"]`).length,nav:nr?{left:Math.round(nr.left),right:Math.round(nr.right),top:Math.round(nr.top),bottom:Math.round(nr.bottom),width:Math.round(nr.width),height:Math.round(nr.height)}:null};
  }
  function sync(){queued=false;return applyMode()}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(sync))}

  g.frontierResponsiveSync=sync;
  g.frontierResponsiveMode=()=>{const v=viewport();return modeFor(v.width,v.height)};
  g.frontierResponsiveRegistry=()=>MODES.map(x=>({...x,test:{...x.test}}));
  g.frontierResponsiveAudit=audit;
  document.documentElement.dataset.flResponsiveSweep='1';

  new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1)))schedule()}).observe(document.body,{childList:true,subtree:true});
  addEventListener('resize',schedule);addEventListener('orientationchange',schedule);g.visualViewport?.addEventListener('resize',schedule);
  if('ResizeObserver'in g)new ResizeObserver(schedule).observe(document.documentElement);
  schedule();
})();