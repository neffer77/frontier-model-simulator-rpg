// Item 13.11 — deterministic modal / overlay / story manager.
(function(){
  const g=window;
  let queued=false,topRecord=null,restoreFocus=null,labelCounter=0;
  const FOCUSABLE='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const CONFIGS=[
    {id:'more',selector:'.gameplay-more-sheet',panel:':scope > section',backdrop:'.gameplay-sheet-backdrop',priority:10,dismissible:true,label:'Lab systems',initial:'header button',close:()=>g.gameplayCloseMenu?.()},
    {id:'priority',selector:'.campaign-priority',panel:':scope > section',backdrop:'.campaign-priority-backdrop',priority:20,dismissible:true,label:'Company priority',initial:'.campaign-choice-grid button',close:()=>g.campaignClosePriority?.()},
    {id:'incident',selector:'.incident-back',panel:':scope > .incident',priority:30,dismissible:false,label:'Live engineering incident',initial:'.inspect-tabs button.active,.decision button'},
    {id:'milestone',selector:'.feel-milestone',panel:':scope > .feel-milestone-card',priority:40,dismissible:true,label:'Milestone',initial:'button',close:record=>record.panel.querySelector('button')?.click()},
    {id:'story',selector:'.story-overlay',panel:':scope > .story-scene-card',priority:50,dismissible:true,label:'Story scene',initial:'.story-actions .primary,.story-actions button:last-child',close:()=>g.storySceneClose?.()},
    {id:'modal',selector:'.modal-back',panel:':scope > .modal',priority:60,dismissible:true,label:'Technical explainer',initial:'.x,a[href],button',close:()=>{const root=document.getElementById('modalRoot');if(root)root.innerHTML=''}}
  ];

  function visible(el,cfg){
    if(!el?.isConnected)return false;
    if(cfg.id==='more'&&!document.body.classList.contains('gameplay-menu-open'))return false;
    const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')return false;
    return el.getClientRects().length>0;
  }
  function panelFor(host,cfg){return host.querySelector(cfg.panel)||host}
  function focusables(panel){return [...panel.querySelectorAll(FOCUSABLE)].filter(el=>{const cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden'&&!el.closest('[aria-hidden="true"]')})}
  function labelPanel(panel,cfg){
    panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
    let heading=panel.querySelector('h1,h2,h3');
    if(heading){if(!heading.id)heading.id=`fl-overlay-title-${++labelCounter}`;panel.setAttribute('aria-labelledby',heading.id);panel.removeAttribute('aria-label')}
    else if(!panel.hasAttribute('aria-label'))panel.setAttribute('aria-label',cfg.label);
    if(!panel.hasAttribute('tabindex'))panel.tabIndex=-1;
  }
  function decorate(host,cfg){
    const panel=panelFor(host,cfg);host.classList.add('fl-overlay-host');host.dataset.flOverlayType=cfg.id;host.dataset.flOverlayPriority=String(cfg.priority);host.style.zIndex=String(700+cfg.priority*10);
    panel.classList.add('fl-overlay-panel');panel.dataset.flOverlayPanel=cfg.id;labelPanel(panel,cfg);
    if(cfg.backdrop){const backdrop=host.querySelector(cfg.backdrop);if(backdrop)backdrop.classList.add('fl-overlay-backdrop')}
    return {host,panel,cfg};
  }
  function collect(){
    const out=[];
    for(const cfg of CONFIGS)for(const host of document.querySelectorAll(cfg.selector))if(visible(host,cfg))out.push(decorate(host,cfg));
    return out.sort((a,b)=>a.cfg.priority-b.cfg.priority);
  }
  function suspend(record,on){
    const {host,panel}=record;
    host.classList.toggle('fl-overlay-suspended',on);
    if(on){host.setAttribute('aria-hidden','true');try{host.inert=true}catch{};panel.removeAttribute('aria-modal')}
    else{host.removeAttribute('aria-hidden');try{host.inert=false}catch{};panel.setAttribute('aria-modal','true')}
  }
  function focusTop(record){
    requestAnimationFrame(()=>{
      if(!record?.host.isConnected||record.host.classList.contains('fl-overlay-suspended'))return;
      const preferred=record.cfg.initial&&record.panel.querySelector(record.cfg.initial);
      const target=preferred||focusables(record.panel)[0]||record.panel;
      try{target.focus({preventScroll:true})}catch{target.focus?.()}
    });
  }
  function restore(){
    const target=restoreFocus;restoreFocus=null;
    if(target?.isConnected&&typeof target.focus==='function')requestAnimationFrame(()=>{try{target.focus({preventScroll:true})}catch{target.focus()}})
  }
  function sync(){
    queued=false;const active=collect(),nextTop=active.at(-1)||null;
    active.forEach(record=>suspend(record,record!==nextTop));
    document.body.classList.toggle('fl-overlay-open',!!nextTop);
    document.documentElement.dataset.flOverlaySystem='1';
    document.documentElement.dataset.flOverlayCount=String(active.length);
    if(nextTop)document.documentElement.dataset.flOverlayTop=nextTop.cfg.id;else delete document.documentElement.dataset.flOverlayTop;

    const changed=topRecord?.host!==nextTop?.host;
    if(changed){
      if(!topRecord&&nextTop){const activeEl=document.activeElement;restoreFocus=activeEl&&activeEl!==document.body?activeEl:null}
      topRecord=nextTop;
      if(nextTop)focusTop(nextTop);else restore();
    }
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(sync))}
  function dismiss(record=topRecord){
    if(!record?.cfg.dismissible)return false;
    const fn=record.cfg.close;if(typeof fn==='function')fn(record);schedule();return true;
  }
  function trapTab(event,record){
    const items=focusables(record.panel);
    if(!items.length){event.preventDefault();record.panel.focus();return}
    const first=items[0],last=items.at(-1),active=document.activeElement;
    if(event.shiftKey&&(active===first||!record.panel.contains(active))){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&(active===last||!record.panel.contains(active))){event.preventDefault();first.focus()}
  }

  document.addEventListener('keydown',event=>{
    const record=topRecord;if(!record)return;
    if(event.key==='Escape'){
      event.preventDefault();event.stopPropagation();
      if(record.cfg.dismissible)dismiss(record);
      return;
    }
    if(event.key==='Tab')trapTab(event,record);
  },true);

  g.frontierOverlaySync=sync;
  g.frontierOverlayDismissTop=()=>dismiss(topRecord);
  g.frontierOverlayTop=()=>topRecord?{type:topRecord.cfg.id,priority:topRecord.cfg.priority,dismissible:topRecord.cfg.dismissible}:null;
  g.frontierOverlayRegistry=()=>CONFIGS.map(({id,priority,dismissible,label})=>({id,priority,dismissible,label}));
  document.documentElement.dataset.flOverlaySystem='1';

  new MutationObserver(records=>{
    if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1)))schedule();
  }).observe(document.body,{childList:true,subtree:true});
  new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
  addEventListener('resize',schedule);schedule();
})();
