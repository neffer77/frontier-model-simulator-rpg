// Item 13.7 — compose Company/Home feature launchers into one stable dashboard hub.
(function(){
  const GROUPS=[
    {id:'model',title:'Model & Engineering',hint:'Data, model families, architecture, maintenance and technical debt.',tokens:['data-evals-launch','dataeval','data + eval','fork-launch','family','model famil','arch-launch','architecture','debt-launch','techdebt','tech debt','technical debt','maint-launch','maintenance']},
    {id:'operations',title:'Operations & Releases',hint:'Operational ownership, reliability, SLOs and release discipline.',tokens:['ops-launch','opsopen','operations','slo-launch','sloopen','reliability','rg-launch','releasegov','release governance','release']},
    {id:'execution',title:'Execution & People',hint:'Roadmaps, projects, programs, critical path, org design and workforce.',tokens:['rp-launch','roadmappressure','roadmap','workforce','portfolioopen','project portfolio','criticalpath','critical path','programlearning','program learning','programopen','program management','orgmanagement','organization management','hiring']},
    {id:'leadership',title:'Leadership & Capital',hint:'Board, financing, governance, executives, talent and strategy.',tokens:['boardplanning','quarterly board','financestrategy','financing','capital','macroopen','restructuring','governanceopen','governance','execpolitics','executive politics','talentmemory','talent memory','strategyopen','portfolio strategy','committeeopen','investment committee']},
    {id:'external',title:'External Environment',hint:'Competition, ecosystem, policy, regulation and public communications.',tokens:['competitiveopen','competitive','competition','ecosystemopen','ecosystem','policyopen','policy','regulation','communicationsopen','communications']},
    {id:'other',title:'Other Lab Systems',hint:'Additional company systems supplied by future modules.',tokens:[]}
  ];
  const ORDER=[
    'data-evals-launch','dataeval','fork-launch','family','arch-launch','architecture','debt-launch','techdebt','maint-launch','maintenance',
    'ops-launch','opsopen','operations','slo-launch','sloopen','reliability','rg-launch','releasegov','release governance',
    'rp-launch','roadmappressure','roadmap','workforce','portfolioopen','project portfolio','criticalpath','critical path','programlearning','program learning','programopen','orgmanagement','hiring',
    'boardplanning','quarterly board','financestrategy','financing','macroopen','restructuring','governanceopen','execpolitics','talentmemory','strategyopen','committeeopen',
    'competitiveopen','competitive','ecosystemopen','ecosystem','policyopen','policy','communicationsopen','communications'
  ];
  let queued=false;

  const classes=el=>el?.classList?[...el.classList]:[];
  const isLauncher=el=>el instanceof HTMLButtonElement&&(el.classList.contains('fl-launch')||classes(el).some(c=>c!=='fl-launch'&&c.endsWith('-launch')));
  function signal(button){return [button.className,button.getAttribute('onclick')||'',String(button.onclick||''),button.textContent||''].join(' ').toLowerCase().replace(/\s+/g,' ')}
  function groupFor(button){const s=signal(button);return GROUPS.find(g=>g.id!=='other'&&g.tokens.some(t=>s.includes(t)))||GROUPS.at(-1)}
  function orderFor(button){const s=signal(button),i=ORDER.findIndex(t=>s.includes(t));return i<0?999:i}
  function labelId(button){return (button.querySelector('span')?.textContent||button.querySelector('b')?.textContent||button.textContent||'system').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,72)||'system'}
  function specificLaunchClass(button){return classes(button).find(c=>c!=='fl-launch'&&c.endsWith('-launch'))||null}
  function launcherId(button){return specificLaunchClass(button)||button.getAttribute('data-dashboard-id')||button.getAttribute('data-campaign-target')||labelId(button)}
  function launcherKey(button){
    // Locked-state decoration may add data-campaign-target after a launcher has already
    // been hosted. A module-specific *-launch class is the stable identity shared by
    // both the fresh render and the previously hosted button; never key on generic
    // fl-launch or on post-render decoration first.
    return specificLaunchClass(button)||button.getAttribute('data-dashboard-id')||button.getAttribute('data-campaign-target')||labelId(button);
  }
  function signature(buttons){return buttons.map(b=>`${groupFor(b).id}:${orderFor(b)}:${launcherKey(b)}`).sort().join('|')}
  function createHub(){
    const hub=document.createElement('section');hub.className='company-system-hub fl-panel';hub.setAttribute('aria-labelledby','company-system-hub-title');
    hub.innerHTML=`<header class="company-system-hub-head"><div class="company-system-hub-copy"><div class="eyebrow">COMPANY SYSTEMS</div><h2 id="company-system-hub-title">Run the lab</h2><p>Technical, operational and company systems are grouped here so the main dashboard stays readable as the simulation grows.</p></div><span class="company-system-count fl-badge">0 systems</span></header><div class="company-system-groups"></div>`;
    return hub;
  }
  function groupNode(group,items){
    const section=document.createElement('section');section.className='company-system-group fl-card';section.dataset.dashboardGroup=group.id;
    section.innerHTML=`<header class="company-system-group-head"><div><strong>${group.title}</strong><small>${group.hint}</small></div><span class="company-system-group-count fl-badge">${items.length}</span></header><div class="company-system-launch-grid"></div>`;
    const grid=section.querySelector('.company-system-launch-grid');
    for(const button of items){button.dataset.companyGroup=group.id;grid.appendChild(button)}
    return section;
  }
  function allLaunchers(shell,hub){
    const byKey=new Map();
    // Prefer the newly rendered shell launcher when both generations exist.
    for(const child of shell.children)if(isLauncher(child))byKey.set(launcherKey(child),child);
    if(hub)for(const button of hub.querySelectorAll('button'))if(isLauncher(button)&&!byKey.has(launcherKey(button)))byKey.set(launcherKey(button),button);
    return [...byKey.values()];
  }
  function organize(){
    queued=false;
    const app=document.getElementById('app');
    const shell=app?.querySelector('.game-shell');
    const existing=app?.querySelector('.company-system-hub');
    if(!shell||typeof state==='undefined'||!state?.started||state.view!=='company'){existing?.remove();return}
    const buttons=allLaunchers(shell,existing);
    if(!buttons.length){existing?.remove();return}
    buttons.sort((a,b)=>orderFor(a)-orderFor(b)||launcherId(a).localeCompare(launcherId(b)));
    const sig=signature(buttons);
    const stray=[...shell.children].filter(isLauncher);
    if(existing&&existing.dataset.dashboardSignature===sig&&!stray.length){
      const count=existing.querySelector('.company-system-count');if(count)count.textContent=`${buttons.length} system${buttons.length===1?'':'s'}`;
      return;
    }
    const hub=existing||createHub();
    const groups=hub.querySelector('.company-system-groups');groups.replaceChildren();
    for(const group of GROUPS){const items=buttons.filter(b=>groupFor(b).id===group.id);if(items.length)groups.appendChild(groupNode(group,items))}
    hub.dataset.dashboardSignature=sig;
    hub.querySelector('.company-system-count').textContent=`${buttons.length} system${buttons.length===1?'':'s'}`;
    if(!hub.isConnected){
      const world=shell.querySelector(':scope > .world-grid');
      const rolebar=shell.querySelector(':scope > .rolebar');
      if(world)shell.insertBefore(hub,world);else if(rolebar)rolebar.insertAdjacentElement('afterend',hub);else shell.appendChild(hub);
    }
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(organize))}

  window.frontierCompanyDashboardSync=organize;
  document.documentElement.dataset.flCompanyDashboard='1';
  const app=document.getElementById('app');
  if(app)new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1)))schedule()}).observe(app,{childList:true,subtree:true});
  addEventListener('resize',schedule);
  schedule();
})();