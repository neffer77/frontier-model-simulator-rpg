// P5.2.1 — FrontierOS Pager App
(function(){
  'use strict';
  const STORAGE='frontieros.pager.v1';
  const ui={filter:'active'};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const readStore=()=>{try{return JSON.parse(sessionStorage.getItem(STORAGE)||'{"read":{},"ack":{}}')}catch(e){return{read:{},ack:{}}}};
  const writeStore=x=>{try{sessionStorage.setItem(STORAGE,JSON.stringify(x))}catch(e){}};
  function incidents(){try{return typeof INCIDENTS!=='undefined'?INCIDENTS:[]}catch(e){return[]}}
  function live(){try{return typeof state!=='undefined'?state:{} }catch(e){return{}}}
  function severity(inc){return inc?.id==='nan'?'P0':inc?.id==='ttft'?'P1':inc?.id==='contam'?'P1':'P2'}
  function records(){
    const s=live(),defs=incidents(),store=readStore(),out=[];
    const activeId=s.activeRun?.incident||s.selectedIncident||null;
    if(activeId){const inc=defs.find(x=>x.id===activeId);if(inc)out.push({id:inc.id,title:inc.title,brief:inc.brief,role:inc.role,term:inc.term,status:'active',severity:severity(inc),run:s.activeRun?.name||null,day:s.day||1,read:!!store.read[inc.id],ack:!!store.ack[inc.id]});}
    const seen=new Set(out.map(x=>x.id));
    [...(s.runHistory||[])].reverse().forEach(row=>{if(seen.has(row.incident))return;const inc=defs.find(x=>x.id===row.incident);if(!inc)return;seen.add(inc.id);out.push({id:inc.id,title:inc.title,brief:inc.brief,role:inc.role,term:inc.term,status:'resolved',severity:severity(inc),run:row.run||null,day:row.day||null,read:true,ack:true});});
    return out;
  }
  function activeCount(){return records().filter(x=>x.status==='active').length}
  function mark(id,kind){const store=readStore();store[kind]||={};store[kind][id]=true;if(kind==='ack')store.read[id]=true;writeStore(store);render();window.frontierEmitEvent?.(`pager.incident.${kind==='ack'?'acknowledged':'read'}`,{incidentId:id},{source:'pager-frontieros'});return true}
  function item(r){return `<article class="pager-ticket ${r.status==='active'?'is-active':'is-resolved'}" data-severity="${r.severity}" data-incident-id="${esc(r.id)}"><header><span class="pager-severity">${r.severity}</span><span class="pager-status">${r.status.toUpperCase()}</span>${r.ack?'<span class="pager-ack">ACK</span>':''}</header><h2>${esc(r.title)}</h2><p>${esc(r.brief)}</p><dl><div><dt>Owner</dt><dd>${esc(r.role)}</dd></div><div><dt>Run</dt><dd>${esc(r.run||'—')}</dd></div><div><dt>Day</dt><dd>${esc(r.day??'—')}</dd></div><div><dt>Signal</dt><dd>${esc(r.term)}</dd></div></dl><footer>${r.status==='active'?`${!r.read?`<button type="button" data-pager-read="${esc(r.id)}">Mark read</button>`:''}${!r.ack?`<button type="button" data-pager-ack="${esc(r.id)}">Acknowledge</button>`:''}<button type="button" class="pager-primary" data-pager-open="${esc(r.id)}">Open investigation</button>`:`<button type="button" data-pager-review="${esc(r.id)}">Review case</button>`}</footer></article>`}
  function render(){
    const app=document.getElementById('app');if(!app)return false;const all=records(),shown=ui.filter==='all'?all:all.filter(x=>x.status===ui.filter);const active=all.filter(x=>x.status==='active').length,resolved=all.filter(x=>x.status==='resolved').length;
    app.innerHTML=`<main class="pager-app" data-frontieros-native-app="pager"><header class="pager-app-head"><div><div class="pager-kicker">FRONTIER OPERATIONS</div><h1>Pager</h1><p>Production alerts, ownership, and incident handoff.</p></div><div class="pager-summary"><b>${active}</b><span>active</span><small>${resolved} resolved</small></div></header><nav class="pager-filters" aria-label="Incident filters"><button type="button" data-pager-filter="active" class="${ui.filter==='active'?'is-active':''}">Active <span>${active}</span></button><button type="button" data-pager-filter="resolved" class="${ui.filter==='resolved'?'is-active':''}">Resolved <span>${resolved}</span></button><button type="button" data-pager-filter="all" class="${ui.filter==='all'?'is-active':''}">All <span>${all.length}</span></button></nav><section class="pager-list">${shown.length?shown.map(item).join(''):`<div class="pager-empty"><strong>${ui.filter==='active'?'No active pages':'Nothing here yet'}</strong><p>${ui.filter==='active'?'Training and serving incidents will appear here when they require intervention.':'Resolved incidents become a compact operational history.'}</p></div>`}</section></main>`;
    app.querySelector('.pager-app')?.addEventListener('click',onClick);window.frontierEmitEvent?.('pager.rendered',{active,resolved,filter:ui.filter},{source:'pager-frontieros'});return true;
  }
  async function openIncidentFromPager(id){
    mark(id,'ack');
    const nav=await window.frontierOsNavigate?.('training',{source:'pager-investigation'})||await window.frontierLaunchApp?.('training',{surface:document.documentElement.dataset.frontierOsSurface||'legacy',source:'pager-investigation'});
    if(nav?.ok===false)return nav;
    if(typeof openIncident==='function')openIncident(id);else{const s=live();s.selectedIncident=id;if(typeof save==='function')save();if(typeof render==='function')render();}
    window.frontierEmitEvent?.('pager.investigation.opened',{incidentId:id},{source:'pager-frontieros'});return {ok:true,status:'opened',incidentId:id};
  }
  async function onClick(event){
    const filter=event.target.closest('[data-pager-filter]');if(filter){ui.filter=filter.dataset.pagerFilter;render();return}
    const read=event.target.closest('[data-pager-read]');if(read){mark(read.dataset.pagerRead,'read');return}
    const ack=event.target.closest('[data-pager-ack]');if(ack){mark(ack.dataset.pagerAck,'ack');return}
    const open=event.target.closest('[data-pager-open]');if(open){await openIncidentFromPager(open.dataset.pagerOpen);return}
    const review=event.target.closest('[data-pager-review]');if(review){await openIncidentFromPager(review.dataset.pagerReview);}
  }
  function open(){ui.filter='active';render();return {ok:true,status:'opened',appId:'pager',active:activeCount()}}
  function snapshot(){return {schemaVersion:1,activeCount:activeCount(),filter:ui.filter,records:records()}}
  window.frontierPagerOpen=open;window.frontierPagerSnapshot=snapshot;window.frontierPagerIncidentOpen=openIncidentFromPager;window.frontierPagerMarkRead=id=>mark(id,'read');window.frontierPagerAcknowledge=id=>mark(id,'ack');
  try{window.frontierRegisterCommand?.('pager.open',()=>open(),{replace:true,source:'pager-frontieros',description:'Open the native FrontierOS Pager app',idempotent:true});}catch(e){}
  window.frontierEmitEvent?.('pager.ready',{schemaVersion:1},{source:'pager-frontieros'});
})();
