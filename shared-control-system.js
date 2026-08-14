// Item 13.6 — classify legacy simulator controls into shared semantic variants.
(function(){
  const VARIANTS=['fl-btn-primary','fl-btn-secondary','fl-btn-ghost','fl-btn-danger','fl-btn-icon','fl-btn-nav','fl-btn-locked'];
  const FIELD_TYPES=new Set(['text','search','email','url','tel','number','password','date','datetime-local','month','week','time']);
  const classes=el=>el?.classList?[...el.classList]:[];
  const suffix=(el,s)=>classes(el).some(c=>c.endsWith(s));
  const text=el=>(el?.textContent||'').trim().replace(/\s+/g,' ').toLowerCase();

  function isLaunch(button){return button.classList.contains('fl-launch')||suffix(button,'-launch')}
  function isCardChoice(button){return button.matches('.tier,.tech-node,.decision button,.knowledge button,.term,.tech-help,.pd-toggle,.gameplay-system-grid button')||suffix(button,'-node')}
  function clearVariant(button){for(const c of VARIANTS)button.classList.remove(c)}
  function setVariant(button,variant){
    button.classList.add('fl-btn',`fl-btn-${variant}`);
    button.dataset.flControl=variant;
  }
  function isDestructive(button){
    const t=text(button),onclick=button.getAttribute('onclick')||'';
    return button.classList.contains('danger-btn')||button.classList.contains('danger')||button.classList.contains('destructive')||/\b(delete|remove|reset|fire|terminate|abort|revoke|discard)\b/.test(t)||/reset|delete|remove|fire|terminate|abort|revoke/i.test(onclick);
  }
  function isIcon(button){
    const t=text(button),label=(button.getAttribute('aria-label')||'').toLowerCase();
    return button.classList.contains('x')||button.classList.contains('icon-btn')||button.classList.contains('icon-button')||/^(×|✕|✖|\+|−|…|⋯)$/.test(t)||/\b(close|dismiss|menu|more)\b/.test(label);
  }
  function isNav(button){return Boolean(button.closest('.rolebar,.gameplay-bottom-nav,.inspect-tabs,[role="tablist"],nav'))}
  function isPrimary(button){
    const t=text(button);
    return button.classList.contains('primary')||Boolean(button.closest('lab-objective-card,.gameplay-objective,lab-install-prompt'))||Boolean(button.closest('.story-actions')&&button===button.parentElement?.lastElementChild)||/^(continue|advance|start training|found the lab|install|confirm|approve|hire|ship|launch run)\b/.test(t);
  }
  function isGhost(button){
    if(button.classList.contains('ghost')||button.classList.contains('lab-disclosure-toggle'))return true;
    const parent=button.parentElement;
    return Boolean(parent&&(parent.matches('header,.fl-section-head,[class$="-head"]')||parent.classList.contains('panel-title')));
  }
  function locked(button){return button.disabled||button.getAttribute('aria-disabled')==='true'||button.classList.contains('locked')}

  function classifyButton(button){
    if(!(button instanceof HTMLButtonElement)||isLaunch(button)||isCardChoice(button))return;
    clearVariant(button);
    let variant='secondary';
    if(isIcon(button))variant='icon';
    else if(isDestructive(button))variant='danger';
    else if(isPrimary(button))variant='primary';
    else if(isNav(button))variant='nav';
    else if(isGhost(button))variant='ghost';
    setVariant(button,variant);
    if(locked(button)){
      button.classList.add('fl-btn-locked');
      button.dataset.flControlState='locked';
    }else delete button.dataset.flControlState;
  }

  function classifyField(el){
    if(el instanceof HTMLSelectElement||el instanceof HTMLTextAreaElement){el.classList.add('fl-control-field');el.dataset.flControl='field';return}
    if(!(el instanceof HTMLInputElement))return;
    const type=(el.type||'text').toLowerCase();
    if(FIELD_TYPES.has(type)){el.classList.add('fl-control-field');el.dataset.flControl='field'}
  }

  function classifyGroup(el){
    if(!(el instanceof Element))return;
    if(el.classList.contains('fl-actions')||suffix(el,'-actions')){
      el.classList.add('fl-control-group');
      if(/footer|actions-end|dialog-actions/.test(el.className))el.dataset.flAlign='end';
    }
  }

  function decorate(root=document){
    const nodes=[];
    if(root instanceof Element)nodes.push(root);
    if(root.querySelectorAll)nodes.push(...root.querySelectorAll('button,input,select,textarea,.fl-actions,[class$="-actions"]'));
    for(const el of nodes){
      if(el instanceof HTMLButtonElement)classifyButton(el);
      else if(el instanceof HTMLInputElement||el instanceof HTMLSelectElement||el instanceof HTMLTextAreaElement)classifyField(el);
      else classifyGroup(el);
    }
  }

  window.frontierControlDecorate=decorate;
  document.documentElement.dataset.flControlSystem='1';
  decorate(document);

  const host=document.getElementById('app')||document.body;
  const observer=new MutationObserver(records=>{
    for(const record of records)for(const node of record.addedNodes)if(node instanceof Element)decorate(node);
  });
  observer.observe(host,{childList:true,subtree:true});
})();
