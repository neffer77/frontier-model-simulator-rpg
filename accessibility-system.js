// Item 13.12 — semantic accessibility adapter for legacy + dynamic simulator UI.
(function(){
  const g=window;
  let queued=false,lastPageTitle='';
  const SYMBOL_LABELS={'×':'Close','✕':'Close','✖':'Close','…':'More options','⋯':'More options','+':'Add','−':'Remove','-':'Remove'};
  const safeState=()=>{try{return typeof state!=='undefined'?state:null}catch{return null}};
  const humanize=value=>String(value||'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).trim();

  function ensureInfrastructure(){
    const app=document.getElementById('app');if(app&&!app.hasAttribute('tabindex'))app.tabIndex=-1;
    if(!document.querySelector('.fl-skip-link')){
      const skip=document.createElement('a');skip.className='fl-skip-link';skip.href='#app';skip.textContent='Skip to current workspace';document.body.prepend(skip);
    }
    if(!document.getElementById('fl-a11y-live')){
      const live=document.createElement('div');live.id='fl-a11y-live';live.className='fl-sr-only';live.setAttribute('role','status');live.setAttribute('aria-live','polite');live.setAttribute('aria-atomic','true');document.body.appendChild(live);
    }
  }
  function announce(message){const live=document.getElementById('fl-a11y-live');if(!live||!message)return;live.textContent='';requestAnimationFrame(()=>{live.textContent=String(message)})}

  function accessibleName(el){
    const labelled=el.getAttribute('aria-labelledby');if(labelled){const text=labelled.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ').trim();if(text)return text}
    return (el.getAttribute('aria-label')||el.textContent||el.getAttribute('title')||'').replace(/\s+/g,' ').trim();
  }
  function inferButtonLabel(button){
    const raw=(button.textContent||'').replace(/\s+/g,' ').trim();if(SYMBOL_LABELS[raw])return SYMBOL_LABELS[raw];
    const signal=[button.className,button.id,button.getAttribute('onclick'),String(button.onclick||'')].join(' ').toLowerCase();
    if(/close|dismiss|cancel/.test(signal))return 'Close';
    if(/menu|more|togglemenu/.test(signal))return 'More options';
    if(/delete|remove|trash/.test(signal))return 'Remove';
    return '';
  }
  function decorateButtons(root=document){
    for(const button of root.querySelectorAll('button')){
      if(accessibleName(button))continue;
      const label=inferButtonLabel(button);if(label){button.setAttribute('aria-label',label);button.dataset.flA11yGeneratedLabel='1'}
    }
    for(const close of root.querySelectorAll('.x,.fl-lock-close'))if(!close.getAttribute('aria-label'))close.setAttribute('aria-label','Close');
  }

  function fieldName(field){
    if(field.getAttribute('aria-label')||field.getAttribute('aria-labelledby'))return true;
    if(field.labels?.length)return true;
    const wrapping=field.closest('label');if(wrapping&&wrapping.textContent.trim())return true;
    return false;
  }
  function decorateFields(root=document){
    for(const field of root.querySelectorAll('input,select,textarea')){
      if(field.type==='hidden'||fieldName(field))continue;
      const label=field.getAttribute('placeholder')||field.getAttribute('name')||field.id;
      if(label){field.setAttribute('aria-label',humanize(label));field.dataset.flA11yGeneratedLabel='1'}
    }
  }

  function bindTabs(tablist){
    if(tablist.dataset.flA11yTabs==='1')return;tablist.dataset.flA11yTabs='1';
    tablist.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      const tabs=[...tablist.querySelectorAll('[role="tab"]')];if(!tabs.length)return;
      let index=Math.max(0,tabs.indexOf(document.activeElement));
      if(event.key==='ArrowRight')index=(index+1)%tabs.length;
      if(event.key==='ArrowLeft')index=(index-1+tabs.length)%tabs.length;
      if(event.key==='Home')index=0;if(event.key==='End')index=tabs.length-1;
      event.preventDefault();tabs[index].focus();tabs[index].click();
    });
  }
  function decorateTabs(root=document){
    for(const tablist of root.querySelectorAll('.inspect-tabs')){
      tablist.setAttribute('role','tablist');tablist.setAttribute('aria-label','Incident evidence');
      const buttons=[...tablist.querySelectorAll('button')];
      buttons.forEach((button,index)=>{
        const selected=button.classList.contains('active');button.setAttribute('role','tab');button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
        if(!button.id)button.id=`fl-incident-tab-${index}-${String(button.textContent||'tab').trim().toLowerCase()}`;
      });bindTabs(tablist);
    }
  }
  function decorateRoles(root=document){
    for(const nav of root.querySelectorAll('.rolebar')){
      if(!nav.getAttribute('aria-label'))nav.setAttribute('aria-label','Engineering role');
      for(const button of nav.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.classList.contains('active')));
    }
  }

  function setProgress(el,value,label,max=100){
    if(!el)return;const n=Math.max(0,Math.min(Number(max)||100,Number(value)||0));
    el.setAttribute('role','progressbar');el.setAttribute('aria-valuemin','0');el.setAttribute('aria-valuemax',String(max));el.setAttribute('aria-valuenow',String(Math.round(n)));if(label)el.setAttribute('aria-label',label);
  }
  function parsePercent(text){const m=String(text||'').match(/(\d+(?:\.\d+)?)\s*%/);return m?Number(m[1]):null}
  function decorateProgress(root=document){
    for(const bar of root.querySelectorAll('.bigbar')){
      const value=parsePercent(bar.closest('.run-progress')?.querySelector('.progress-head span')?.textContent);if(value!=null)setProgress(bar,value,'Training progress');
    }
    const s=safeState();for(const bar of root.querySelectorAll('.feel-training'))if(s?.activeRun)setProgress(bar,s.activeRun.progress||0,'Training progress');
    for(const bar of root.querySelectorAll('.story-meter')){const value=parsePercent(bar.querySelector('i')?.style.width);if(value!=null)setProgress(bar,value,'Story progress')}
    for(const bar of root.querySelectorAll('.fl-lock-progress-track')){const value=parsePercent(bar.getAttribute('aria-label'));if(value!=null)setProgress(bar,value,bar.getAttribute('aria-label'))}
    for(const dots of root.querySelectorAll('.campaign-dots')){
      const text=dots.closest('.campaign-progress')?.querySelector('small')?.textContent||'',m=text.match(/(\d+)\s*\/\s*(\d+)/);if(m)setProgress(dots,Number(m[1]),'Guided campaign progress',Number(m[2]));
    }
  }

  function decorateTables(root=document){
    for(const th of root.querySelectorAll('table thead th'))if(!th.hasAttribute('scope'))th.setAttribute('scope','col');
    for(const th of root.querySelectorAll('table tbody th'))if(!th.hasAttribute('scope'))th.setAttribute('scope','row');
  }
  function decorateStatus(root=document){
    for(const el of root.querySelectorAll('.feel-toast')){el.setAttribute('role','status');el.setAttribute('aria-live','polite')}
    for(const el of root.querySelectorAll('.ticker')){el.setAttribute('role','status');el.setAttribute('aria-live','polite')}
    for(const el of root.querySelectorAll('.alarm'))el.setAttribute('aria-hidden','true');
    for(const panel of root.querySelectorAll('[data-fl-overlay-panel="incident"]'))panel.setAttribute('role','alertdialog');
  }
  function decorateLinks(root=document){
    for(const link of root.querySelectorAll('a[target="_blank"]')){
      if(link.dataset.flA11yExternal==='1')continue;link.dataset.flA11yExternal='1';
      const name=accessibleName(link);if(name&&!/opens in new/i.test(name))link.setAttribute('aria-label',`${name} (opens in new tab)`);
    }
  }

  function pageTitle(){
    const app=document.getElementById('app');if(!app)return 'Frontier Lab';
    const visibleH1=[...app.querySelectorAll('h1')].find(x=>!x.classList.contains('fl-sr-page-title'));if(visibleH1?.textContent.trim())return visibleH1.textContent.trim();
    const h2=app.querySelector('h2');if(h2?.textContent.trim())return h2.textContent.trim();
    const id=document.documentElement.dataset.flPage||document.documentElement.dataset.flPageId;return id?humanize(id):'Frontier Lab';
  }
  function decorateHeading(){
    const app=document.getElementById('app');if(!app)return;
    let hidden=app.querySelector(':scope > .fl-sr-page-title');const hasH1=[...app.querySelectorAll('h1')].some(x=>x!==hidden);
    if(hasH1){hidden?.remove();hidden=null}else{
      if(!hidden){hidden=document.createElement('h1');hidden.className='fl-sr-page-title';app.prepend(hidden)}hidden.textContent=pageTitle();
    }
    const title=pageTitle();if(title&&title!==lastPageTitle){lastPageTitle=title;announce(`Opened ${title}`)}
  }

  function duplicateIds(){const seen=new Set(),dupes=[];for(const el of document.querySelectorAll('[id]')){if(seen.has(el.id))dupes.push(el.id);else seen.add(el.id)}return [...new Set(dupes)]}
  function visible(el){const cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden'&&el.getClientRects().length>0&&!el.closest('[aria-hidden="true"]')}
  function audit(){
    const unlabeledButtons=[...document.querySelectorAll('button')].filter(el=>visible(el)&&!accessibleName(el)).map(el=>el.className||el.outerHTML.slice(0,80));
    const unlabeledFields=[...document.querySelectorAll('input:not([type="hidden"]),select,textarea')].filter(el=>visible(el)&&!fieldName(el)).map(el=>el.id||el.name||el.tagName);
    return {unlabeledButtons,unlabeledFields,duplicateIds:duplicateIds(),progressbars:document.querySelectorAll('[role="progressbar"]').length,tabs:document.querySelectorAll('[role="tab"]').length,pageTitle:pageTitle()};
  }

  function sync(){
    queued=false;ensureInfrastructure();decorateButtons();decorateFields();decorateTabs();decorateRoles();decorateProgress();decorateTables();decorateStatus();decorateLinks();decorateHeading();
    document.documentElement.dataset.flAccessibilitySystem='1';
    const app=document.getElementById('app');if(app){const result=audit();app.dataset.flA11yUnlabeled=String(result.unlabeledButtons.length+result.unlabeledFields.length)}
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(sync))}

  g.frontierAccessibilitySync=sync;
  g.frontierAccessibilityAudit=audit;
  g.frontierA11yAnnounce=announce;
  document.documentElement.dataset.flAccessibilitySystem='1';
  new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1)))schedule()}).observe(document.body,{childList:true,subtree:true});
  addEventListener('resize',schedule);schedule();
})();
