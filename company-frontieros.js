// P5.2.11 — Native FrontierOS Company
(function(){
  'use strict';
  const VIEWS=['overview','board','governance','restructuring','leadership','history'];
  const ui={view:'overview'};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct=v=>`${Math.round(Number(v||0)*100)}%`;
  const money=v=>`$${Number(v||0).toFixed(1)}M`;
  const snap=()=>window.frontierCompanyDomainSnapshot?.()||{board:{},finance:{},governance:{controlRisk:{}},macro:{},leadership:{executives:[],culture:{}}};

  function header(s){return `<header class="company-os-head"><div><div class="company-os-kicker">COMPANY · EXECUTIVE CONTROL PLANE</div><h1>Run the institution behind the model.</h1><p>Board allocation, governance, financing pressure, restructuring, executive succession, and organizational consequences share one native workspace.</p></div><div class="company-os-health ${s.runway<4?'is-risk':''}"><strong>${Number(s.runway||0).toFixed(1)}</strong><span>months runway</span><small>${money(s.board.valuationM)} valuation · ${pct(s.board.confidence)} board confidence</small></div></header>`}
  function nav(){return `<nav class="company-os-nav" aria-label="Company views">${VIEWS.map(v=>`<button data-company-view="${v}" onclick="event.stopPropagation();frontierCompanyUiAction('view','${v}')" class="${ui.view===v?'is-active':''}">${v[0].toUpperCase()+v.slice(1)}</button>`).join('')}</nav>`}
  function metric(label,value,detail='',risk=false){return `<article class="company-os-card ${risk?'is-risk':''}"><span>${esc(label)}</span><h2>${esc(value)}</h2>${detail?`<p>${esc(detail)}</p>`:''}</article>`}

  function overview(s){
    const risks=(s.leadership.executives||[]).filter(e=>e.status==='active'&&Number(e.retention)<.62).length;
    const successor=(s.leadership.executives||[]).find(e=>e.id===s.leadership.successor);
    return `<section class="company-os-grid">${metric('CASH',money(s.cashM),`Day ${s.day}`)}${metric('BOARD',pct(s.board.confidence),`Q${s.board.quarter} · review day ${s.board.nextReviewDay||'—'}`,s.board.confidence<.5)}${metric('FOUNDER CONTROL',pct(1-(s.governance.controlRisk?.risk||0)),`${s.governance.controlRisk?.status||'stable'} · ${pct(s.governance.founderAuthority)} authority`,(s.governance.controlRisk?.risk||0)>.55)}${metric('INVESTOR PATIENCE',pct(s.board.investorPatience),`${Number(s.finance.boardSeats?.investors||0)} investor seats`,s.board.investorPatience<.45)}<article class="company-os-card company-os-wide"><span>EXECUTIVE POSITION</span><div class="company-os-metrics"><div><b>${risks}</b><small>retention risks</small></div><div><b>${esc(successor?.name||'None')}</b><small>named successor</small></div><div><b>${esc(s.macro.current?.name||'Stable')}</b><small>capital market regime</small></div><div><b>${Number(s.governance.vetoes||0)}</b><small>investor vetoes</small></div></div></article><article class="company-os-card company-os-wide"><span>CONNECTED OPERATING APPS</span><p>Company owns executive decisions; detailed financing, delivery execution, and people operations stay in their specialist apps.</p><div class="company-os-actions"><button data-company-open="finance" onclick="event.stopPropagation();frontierCompanyUiAction('open-app','finance')">Open Finance</button><button data-company-open="projects" onclick="event.stopPropagation();frontierCompanyUiAction('open-app','projects')">Open Projects</button><button data-company-open="team" onclick="event.stopPropagation();frontierCompanyUiAction('open-app','team')">Open People</button></div></article></section>`;
  }

  function boardView(s){
    const p=s.board.plan;
    return `<section class="company-os-stack"><article class="company-os-card company-os-wide"><span>QUARTERLY OPERATING PLAN</span>${p?`<h3>Q${p.quarter} · ${esc(p.priority)} · ${money(p.budgetM)}</h3><div class="company-os-metrics">${Object.entries(p.allocations||{}).map(([k,v])=>`<div><b>${money(v)}</b><small>${esc(k)}</small></div>`).join('')}</div><p>Status: ${esc(p.status)}</p>`:`<p>No active quarterly plan. Choose an operating posture.</p><div class="company-os-actions">${['balanced','frontier','durable','growth'].map(k=>`<button data-company-action="board-plan" data-value="${k}" onclick="event.stopPropagation();frontierCompanyUiAction('board-plan','${k}')">${esc(k)}</button>`).join('')}</div>`}</article><article class="company-os-card"><span>FORECAST</span><p>${s.board.forecast?.revenueM==null?'No board forecast published.':`${money(s.board.forecast.revenueM)} revenue · ${money(s.board.forecast.cashM)} cash · ${pct(s.board.forecast.trust)} trust`}</p><button data-company-action="board-forecast" onclick="event.stopPropagation();frontierCompanyUiAction('board-forecast')">Publish current operating forecast</button></article><article class="company-os-card"><span>COMPETITIVE PRESSURE</span><h3>${(s.board.competitors||[]).filter(x=>!x.responded).length} unanswered moves</h3><button data-company-action="competitor-launch" onclick="event.stopPropagation();frontierCompanyUiAction('competitor-launch')">Simulate competitor launch</button></article><article class="company-os-card company-os-wide"><span>BOARD REVIEW</span><p>Review scores forecast accuracy, runway, customer trust, delivery credibility, reliability confidence, and missed commitments.</p><button data-company-action="board-review" onclick="event.stopPropagation();frontierCompanyUiAction('board-review')">Conduct board review</button></article>${(s.board.competitors||[]).slice().reverse().map(e=>`<article class="company-os-history"><b>Day ${e.day}</b><span>${esc(e.name)}</span><strong>${esc(e.headline)}</strong>${!e.responded?`<div class="company-os-actions"><button onclick="event.stopPropagation();frontierCompanyUiAction('competitor-response','${esc(e.id)}','differentiate')">Differentiate</button><button onclick="event.stopPropagation();frontierCompanyUiAction('competitor-response','${esc(e.id)}','hold')">Hold</button></div>`:`<small>Response: ${esc(e.response)}</small>`}</article>`).join('')}</section>`;
  }

  function governanceView(s){
    const motions={runway:'Approve emergency financing',accelerate:'Accelerate frontier roadmap',reliability:'Pause launches for reliability',sale:'Authorize strategic sale process',ceo_review:'Open CEO confidence review'};
    return `<section class="company-os-stack"><section class="company-os-grid">${metric('CONTROL RISK',pct(s.governance.controlRisk?.risk),s.governance.controlRisk?.status||'stable',(s.governance.controlRisk?.risk||0)>.55)}${metric('FOUNDER AUTHORITY',pct(s.governance.founderAuthority),`CEO ${s.governance.ceoStatus}`)}${metric('BOARD SEATS',`${s.finance.boardSeats?.founders||0}/${s.finance.boardSeats?.investors||0}/${s.finance.boardSeats?.strategic||0}`,'founder / investor / strategic')}${metric('VETOES',String(s.governance.vetoes||0),'cumulative investor vetoes')}</section><article class="company-os-card company-os-wide"><span>BOARD MOTIONS</span><div class="company-os-action-grid">${Object.entries(motions).map(([k,label])=>`<button data-company-action="governance-vote" data-value="${k}" onclick="event.stopPropagation();frontierCompanyUiAction('governance-vote','${k}')"><b>${esc(label)}</b><small>Call formal vote</small></button>`).join('')}</div></article><article class="company-os-card company-os-wide"><span>FIDUCIARY POSTURE</span><div class="company-os-actions">${['survival','mission','balanced'].map(k=>`<button data-company-action="fiduciary" data-value="${k}" onclick="event.stopPropagation();frontierCompanyUiAction('fiduciary','${k}')">${esc(k)}</button>`).join('')}</div></article>${(s.governance.motions||[]).slice().reverse().map(v=>`<article class="company-os-history ${v.passed?'is-pass':'is-fail'}"><b>${esc(v.id)}</b><span>${esc(v.name)}</span><strong>${v.passed?'PASSED':'FAILED'}${v.veto?' · VETOED':''}</strong><small>${v.votes?.yes||0} yes / ${v.votes?.no||0} no / ${v.votes?.abstain||0} abstain</small></article>`).join('')||'<div class="company-os-empty">No board motions yet.</div>'}</section>`;
  }

  function restructuringView(s){
    const shocks={tight:'Capital Markets Tighten',gpu:'GPU Supply Shock',boom:'AI Demand Boom',reg:'Regulatory Shock'};
    const terms={clean:'Clean Preferred',control:'Control Round',rescue:'Rescue Financing'};
    return `<section class="company-os-stack"><section class="company-os-grid">${metric('MARKET REGIME',s.macro.current?.name||'Stable',s.macro.current?`Since day ${s.macro.current.day}`:'No active shock')}${metric('LIQUIDATION PREF',`${Number(s.finance.liquidationPreference||1).toFixed(1)}×`,'investor preference stack')}${metric('COVENANT PRESSURE',pct(s.finance.covenantPressure),'financing control pressure',s.finance.covenantPressure>.35)}${metric('FOUNDER OWNERSHIP',pct(s.finance.ownership?.founders),'post-financing ownership')}</section><article class="company-os-card company-os-wide"><span>MACRO SHOCKS</span><div class="company-os-action-grid">${Object.entries(shocks).map(([k,label])=>`<button data-company-action="macro-shock" data-value="${k}" onclick="event.stopPropagation();frontierCompanyUiAction('macro-shock','${k}')"><b>${esc(label)}</b><small>Apply scenario</small></button>`).join('')}</div></article><article class="company-os-card company-os-wide"><span>TERM SHEETS</span><div class="company-os-action-grid">${Object.entries(terms).map(([k,label])=>`<button data-company-action="term-sheet" data-value="${k}" onclick="event.stopPropagation();frontierCompanyUiAction('term-sheet','${k}')"><b>${esc(label)}</b><small>Accept financing terms</small></button>`).join('')}</div></article><article class="company-os-card company-os-wide"><span>DISTRESSED OPTIONS</span><div class="company-os-actions"><button data-company-action="restructure" onclick="event.stopPropagation();frontierCompanyUiAction('restructure')">Restructure debt/equity</button><button data-company-action="secondary" onclick="event.stopPropagation();frontierCompanyUiAction('secondary')">Founder secondary · $1M</button><button data-company-action="acquisition-offer" onclick="event.stopPropagation();frontierCompanyUiAction('acquisition-offer')">Solicit acquisition offer</button></div></article>${(s.macro.offers||[]).map((o,i)=>`<article class="company-os-history"><b>${esc(o.buyer)}</b><span>${money(o.valueM)}</span><strong>${esc(o.status)}</strong>${o.status==='open'?`<button onclick="event.stopPropagation();frontierCompanyUiAction('acquisition-accept','${i}')">Accept offer</button>`:''}</article>`).join('')}</section>`;
  }

  function leadershipView(s){
    return `<section class="company-os-stack"><article class="company-os-card company-os-wide"><span>CULTURE</span><div class="company-os-metrics">${Object.entries(s.leadership.culture||{}).map(([k,v])=>`<div><b>${pct(v)}</b><small>${esc(k)}</small></div>`).join('')}</div></article>${(s.leadership.executives||[]).map(e=>`<article class="company-os-exec ${e.status!=='active'?'is-departed':''}"><div><span>${esc(e.id)}</span><h3>${esc(e.name)}</h3><p>${esc(e.faction)} · loyalty ${pct(e.loyalty)} · retention ${pct(e.retention)} · succession ${pct(e.readiness)}</p><small>${e.allies?.length||0} allies · ${e.rivals?.length||0} rivals</small></div>${e.status==='active'?`<div class="company-os-actions"><button data-company-action="executive-align" data-value="${esc(e.id)}:empower" onclick="event.stopPropagation();frontierCompanyUiAction('executive-align','${esc(e.id)}','empower')">Empower</button><button onclick="event.stopPropagation();frontierCompanyUiAction('executive-align','${esc(e.id)}','mediate')">Mediate</button><button onclick="event.stopPropagation();frontierCompanyUiAction('executive-align','${esc(e.id)}','challenge')">Challenge</button><button data-company-action="successor" data-value="${esc(e.id)}" onclick="event.stopPropagation();frontierCompanyUiAction('successor','${esc(e.id)}')">Nominate successor</button><button onclick="event.stopPropagation();frontierCompanyUiAction('retention','${esc(e.id)}')">Test retention</button></div>`:'<strong>Departed</strong>'}</article>`).join('')}<article class="company-os-card company-os-wide"><span>SUCCESSION</span><p>Named successor: <b>${esc((s.leadership.executives||[]).find(e=>e.id===s.leadership.successor)?.name||'None')}</b></p>${s.leadership.successor?`<button onclick="event.stopPropagation();frontierCompanyUiAction('leadership-transition','${esc(s.leadership.successor)}')">Transition CEO role</button>`:''}<div class="company-os-actions"><button onclick="event.stopPropagation();frontierCompanyUiAction('alliance','cto','coo')">Broker CTO + COO alliance</button><button onclick="event.stopPropagation();frontierCompanyUiAction('conflict','cro','cso')">Escalate CRO vs Safety conflict</button></div></article></section>`;
  }

  function historyView(s){
    const rows=[...(s.board.history||[]).map(x=>({...x,source:'board'})),...(s.governance.history||[]).map(x=>({...x,source:'governance'})),...(s.macro.history||[]).map(x=>({...x,source:'macro'})),...(s.leadership.history||[]).map(x=>({...x,source:'leadership'}))].sort((a,b)=>(b.day||0)-(a.day||0));
    return `<section class="company-os-stack">${rows.length?rows.map(x=>`<article class="company-os-history"><b>Day ${x.day||'—'}</b><span>${esc(x.source)}</span><strong>${esc(x.type||x.kind||'decision')}</strong><small>${esc(x.id||x.key||x.priority||x.action||'')}</small></article>`).join(''):'<div class="company-os-empty">No executive decisions recorded yet.</div>'}</section>`;
  }

  function body(s){return({overview,board:boardView,governance:governanceView,restructuring:restructuringView,leadership:leadershipView,history:historyView}[ui.view]||overview)(s)}
  function render(){const app=document.getElementById('app');if(!app)return false;const s=snap();app.innerHTML=`<main class="company-os" data-frontieros-native-app="company">${header(s)}${nav()}${body(s)}</main>`;window.frontierEmitEvent?.('company.rendered',{view:ui.view,runway:s.runway,boardConfidence:s.board.confidence,controlRisk:s.governance.controlRisk?.risk||0},{source:'company-frontieros'});return true}
  function setView(view){if(!VIEWS.includes(view))return false;ui.view=view;render();window.frontierEmitEvent?.('company.view.changed',{view},{source:'company-frontieros'});return true}
  function parseDetail(detail){const first=String(detail||'').split('/').filter(Boolean)[0];return VIEWS.includes(first)?first:'overview'}
  function open(options={}){window.frontierCompanyEnsure?.();const detail=typeof options==='string'?options:options.detail;ui.view=VIEWS.includes(options.view)?options.view:parseDetail(detail);render();const s=snap();window.frontierEmitEvent?.('company.opened',{view:ui.view,detail:detail||null,runway:s.runway,valuationM:s.board.valuationM},{source:'company-frontieros'});return{ok:true,status:'opened',appId:'company',view:ui.view}}
  function snapshot(){return{...snap(),view:ui.view}}

  async function openApp(id){
    const surface=document.documentElement.dataset.frontierOsSurface;
    if(surface==='desktop'&&window.frontierDesktopAppOpen)return window.frontierDesktopAppOpen(id);
    if(surface==='mobile'&&window.frontierMobileAppOpen)return window.frontierMobileAppOpen(id);
    return window.frontierLaunchApp?.(id,{source:'company-frontieros'});
  }
  function dispatchAndRender(action,payload={}){const result=window.frontierCompanyDispatch?.(action,payload)||{ok:false,action,error:'Company dispatcher unavailable'};render();return result}
  window.frontierCompanyUiAction=(action,value,extra)=>{
    if(action==='view')return setView(value);
    if(action==='open-app')return openApp(value);
    if(action==='board-plan')return dispatchAndRender('board-plan',{priority:value,budgetM:3});
    if(action==='board-forecast')return dispatchAndRender('board-forecast');
    if(action==='competitor-launch')return dispatchAndRender('competitor-launch');
    if(action==='competitor-response')return dispatchAndRender('competitor-response',{id:value,mode:extra});
    if(action==='board-review')return dispatchAndRender('board-review');
    if(action==='governance-vote')return dispatchAndRender('governance-vote',{kind:value});
    if(action==='fiduciary')return dispatchAndRender('fiduciary',{priority:value});
    if(action==='macro-shock')return dispatchAndRender('macro-shock',{key:value});
    if(action==='term-sheet')return dispatchAndRender('term-sheet',{key:value});
    if(action==='restructure')return dispatchAndRender('restructure');
    if(action==='secondary')return dispatchAndRender('secondary',{amountM:1});
    if(action==='acquisition-offer')return dispatchAndRender('acquisition-offer');
    if(action==='acquisition-accept')return dispatchAndRender('acquisition-accept',{index:Number(value)});
    if(action==='executive-align')return dispatchAndRender('executive-align',{id:value,mode:extra});
    if(action==='successor')return dispatchAndRender('successor',{id:value});
    if(action==='leadership-transition')return dispatchAndRender('leadership-transition',{id:value});
    if(action==='retention')return dispatchAndRender('retention',{id:value});
    if(action==='alliance')return dispatchAndRender('alliance',{a:value,b:extra});
    if(action==='conflict')return dispatchAndRender('conflict',{a:value,b:extra});
    return{ok:false,action,error:`Unknown Company UI action: ${action}`};
  };

  window.frontierCompanyOpen=open;
  window.frontierCompanySetView=setView;
  window.frontierCompanySnapshot=snapshot;
  window.frontierEmitEvent?.('company.ready',{schemaVersion:1,views:VIEWS,actionBoundary:'frontierCompanyDispatch'},{source:'company-frontieros'});
})();
