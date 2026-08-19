// Item 13.5 — stable, accessible progressive disclosure for dense mobile views.
(function(){
  const media=matchMedia('(max-width: 720px)');
  const denseViews=new Set(['hiring','workforce','policy','modelLab','dataEvals','portfolio','criticalPath','program','programLearning','portfolioStrategy','investmentCommittee','competitive','ecosystem','communications','governance','financeStrategy','slo','releaseGov','roadmapPressure']);
  const EMPTY_COPY=/\b(no (?:active|open|available|current|saved|completed|known|pending)?\s*(?:projects?|models?|incidents?|runs?|employees?|candidates?|commitments?|records?|data|items?|events?|families?|forks?|dependencies?)|nothing (?:here|to show|yet)|none (?:yet|available)|will appear here)\b/i;
  let queued=false;

  const viewName=()=>state?.view||'unknown';
  const storageKey=view=>`frontier-disclosure:v2:${view}`;
  function saved(view=viewName()){try{return JSON.parse(sessionStorage.getItem(storageKey(view))||'{}')}catch{return {}}}
  function persist(map,view=viewName()){try{sessionStorage.setItem(storageKey(view),JSON.stringify(map))}catch{}}
  function slug(s){return String(s||'section').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64)||'section'}
  function classHint(section){return [...section.classList].find(c=>!c.startsWith('pd-')&&!c.startsWith('fl-')&&!['panel','locked'].includes(c))||section.tagName.toLowerCase()}
  function titleFor(section,i){
    return section.querySelector(':scope > h1,:scope > h2,:scope > h3,:scope > header h1,:scope > header h2,:scope > header h3,.eyebrow')?.textContent?.trim()
      || classHint(section).replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase())
      || `Section ${i+1}`;
  }
  function hasEmptyCopy(value){
    const text=String(value||'').replace(/\s+/g,' ').trim();
    if(EMPTY_COPY.test(text))return true;
    const lower=text.toLowerCase();
    return /\bno active projects?\b/.test(lower)||/\bno projects? yet\b/.test(lower)||/\bempty team\b/.test(lower);
  }
  function containsEmptyCopy(section){
    if(hasEmptyCopy(section.textContent))return true;
    return [...section.querySelectorAll('p,small,li,dd,span')].some(node=>hasEmptyCopy(node.textContent));
  }
  function disclosureState(section){
    if(section.matches('.locked,[data-locked="true"],[data-lock-state="locked"]')||section.querySelector('.locked,[data-locked="true"],[data-lock-state="locked"]'))return 'locked';
    if(section.matches('.fl-empty,[class*="empty"]')||section.querySelector('.fl-empty,[class*="empty"]')||containsEmptyCopy(section))return 'empty';
    return 'ready';
  }
  function rootFor(app){
    const preferred=app.querySelector(':scope > .fl-page-shell,:scope > .game-shell,:scope > .cp-shell,:scope > .hiring-shell');
    if(preferred)return preferred;
    return [...app.children].find(x=>x.nodeType===1&&!x.matches('.gameplay-guidance,.campaign-progress,lab-install-prompt,.fl-sr-page-title'))||app;
  }
  function ownsZeroState(section){return !!section.querySelector(':scope .fl-zero-state,:scope [data-fl-zero-key]')}
  function candidatesFor(root){
    return [...root.querySelectorAll(':scope > section, :scope > main > section, :scope > div > section')]
      .filter(s=>!s.closest('.gameplay-guidance,.story-overlay,.modal-back,.incident-back,.gameplay-more-sheet')&&!s.matches('[data-pd-ignore],.fl-zero-state,[data-fl-zero-key]')&&!ownsZeroState(s));
  }
  function stableKeys(candidates){
    const seen=new Map();
    return candidates.map((section,i)=>{
      const title=titleFor(section,i),base=`${slug(title)}:${slug(classHint(section))}`,n=(seen.get(base)||0)+1;
      seen.set(base,n);return {section,title,key:`${base}:${n}`};
    });
  }
  function buildToggle(section,title,key){
    const btn=document.createElement('button');btn.type='button';btn.className='pd-toggle';btn.dataset.pdKey=key;
    const copy=document.createElement('span');copy.className='pd-toggle-copy';
    const label=document.createElement('b');label.textContent=title;
    const meta=document.createElement('small');meta.className='pd-toggle-meta';
    const icon=document.createElement('i');icon.className='pd-toggle-icon';icon.setAttribute('aria-hidden','true');
    copy.append(label,meta);btn.append(copy,icon);section.insertAdjacentElement('afterbegin',btn);return btn;
  }
  function apply(section,btn,{open,title,status,key}){
    section.classList.add('pd-enhanced');section.classList.toggle('pd-collapsed',!open);
    section.dataset.pdState=status;section.dataset.pdKey=key;section.dataset.pdOpen=String(open);
    btn.setAttribute('aria-expanded',String(open));btn.setAttribute('aria-label',`${open?'Collapse':'Expand'} ${title}`);
    btn.querySelector('.pd-toggle-meta').textContent=status==='locked'?'Locked':status==='empty'?'No data yet':open?'Hide details':'Show details';
    btn.querySelector('.pd-toggle-icon').textContent=open?'−':'+';
  }
  function enhance(section,title,key,status,defaultOpen,memory,view){
    let btn=section.querySelector(':scope > .pd-toggle');
    if(!btn||btn.dataset.pdKey!==key){btn?.remove();btn=buildToggle(section,title,key)}
    const open=Object.prototype.hasOwnProperty.call(memory,key)?Boolean(memory[key]):defaultOpen;
    apply(section,btn,{open,title,status,key});
    btn.onclick=()=>{
      const next=section.classList.contains('pd-collapsed');
      const map=saved(view);map[key]=next;persist(map,view);
      apply(section,btn,{open:next,title,status:disclosureState(section),key});
    };
  }
  function cleanupSection(section){
    section.querySelector(':scope > .pd-toggle')?.remove();
    section.classList.remove('pd-enhanced','pd-collapsed');
    delete section.dataset.pdState;delete section.dataset.pdKey;delete section.dataset.pdOpen;
  }
  function cleanup(root=document){for(const section of root.querySelectorAll?.('.pd-enhanced')||[])cleanupSection(section)}
  function decorate(){
    queued=false;
    const app=document.getElementById('app');if(!app)return;
    const view=viewName();
    if(!media.matches||!state?.started||!denseViews.has(view)){cleanup(app);return}
    const root=rootFor(app);
    // Empty-state guidance contains its own actionable UI. Never leave an ancestor
    // disclosure collapsed around it; that makes valid mobile controls measure 0px.
    for(const section of root.querySelectorAll('.pd-enhanced'))if(ownsZeroState(section))cleanupSection(section);
    const candidates=candidatesFor(root);
    if(!candidates.length){cleanup(app);return}
    const candidateSet=new Set(candidates);
    for(const section of root.querySelectorAll('.pd-enhanced'))if(!candidateSet.has(section))cleanupSection(section);
    const memory=saved(view),entries=stableKeys(candidates);
    entries.forEach(({section,title,key},i)=>{
      if(i===0&&entries.length>1){if(section.classList.contains('pd-enhanced'))cleanupSection(section);return}
      const status=disclosureState(section);
      const defaultOpen=status==='ready'&&(entries.length===1||i===1);
      enhance(section,title,key,status,defaultOpen,memory,view);
    });
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(decorate))}

  window.frontierDisclosureSync=decorate;
  window.frontierDisclosureReset=()=>{try{for(let i=sessionStorage.length-1;i>=0;i--){const k=sessionStorage.key(i);if(k?.startsWith('frontier-disclosure:'))sessionStorage.removeItem(k)}}catch{}schedule()};

  const base=window.render;
  if(typeof base==='function')window.render=function(){const out=base();schedule();return out};
  if(media.addEventListener)media.addEventListener('change',schedule);else addEventListener('resize',schedule);

  const app=document.getElementById('app');
  if(app)new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1)))schedule()}).observe(app,{childList:true,subtree:true});
  schedule();
})();