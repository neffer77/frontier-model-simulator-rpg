// Phase 4D.11 — Financing, Strategic Transactions & Runway Crises
const FINANCE_STRATEGY_VERSION=1;
const FINANCING_OPTIONS={
  equity:{name:'Equity round',cashM:18,dilution:.12,boardSeats:1,pressure:-.08},
  ventureDebt:{name:'Venture debt',cashM:10,debtM:11.5,monthlyServiceM:.22,pressure:.06},
  downRound:{name:'Emergency down round',cashM:14,dilution:.22,valuationFactor:.72,boardSeats:1,pressure:.12}
};
const STRATEGIC_DEALS={
  gpu:{name:'Long-term GPU supply agreement',costM:3.8,capacity:18,lockin:.08},
  cloud:{name:'Cloud strategic partnership',costM:1.6,capacity:8,trust:.015},
  acquihire:{name:'Systems-team acqui-hire',costM:4.5,hiring:6,credibility:.025},
  distribution:{name:'Enterprise distribution partnership',costM:1.2,revenueM:.9,trust:.02}
};

function ensureFinanceStrategyState(){
  ensureQuarterlyBoardState?.();
  const finance=state.financeStrategy ||= {};
  finance.version=FINANCE_STRATEGY_VERSION;
  finance.ownership ||= {founders:.68,employees:.14,investors:.18};
  finance.ownership.founders=Number.isFinite(Number(finance.ownership.founders))?Number(finance.ownership.founders):.68;
  finance.ownership.employees=Number.isFinite(Number(finance.ownership.employees))?Number(finance.ownership.employees):.14;
  finance.ownership.investors=Number.isFinite(Number(finance.ownership.investors))?Number(finance.ownership.investors):.18;
  finance.debtM=Number.isFinite(Number(finance.debtM))?Number(finance.debtM):0;
  finance.monthlyDebtServiceM=Number.isFinite(Number(finance.monthlyDebtServiceM))?Number(finance.monthlyDebtServiceM):0;
  finance.boardSeats ||= {founders:3,investors:1,strategic:0};
  finance.boardSeats.founders=Number.isFinite(Number(finance.boardSeats.founders))?Number(finance.boardSeats.founders):3;
  finance.boardSeats.investors=Number.isFinite(Number(finance.boardSeats.investors))?Number(finance.boardSeats.investors):1;
  finance.boardSeats.strategic=Number.isFinite(Number(finance.boardSeats.strategic))?Number(finance.boardSeats.strategic):0;
  if(!Array.isArray(finance.transactions))finance.transactions=[];
  if(!Array.isArray(finance.partnerships))finance.partnerships=[];
  if(!Array.isArray(finance.history))finance.history=[];
  if(!Object.prototype.hasOwnProperty.call(finance,'crisis'))finance.crisis=null;
  return finance;
}
function capTableTotal(){
  ensureFinanceStrategyState();
  return Object.values(state.financeStrategy.ownership).reduce((a,b)=>a+b,0);
}
function normalizeCapTable(){
  const total=capTableTotal()||1;
  Object.keys(state.financeStrategy.ownership).forEach(key=>state.financeStrategy.ownership[key]/=total);
}
function financingTerms(type){
  ensureFinanceStrategyState();
  const deal=FINANCING_OPTIONS[type];
  if(!deal)return null;
  const runway=typeof quarterlyRunway==='function'?quarterlyRunway():12;
  const patience=state.quarterlyBoard?.investorPatience??.7;
  const distress=Math.max(0,(6-runway)/6)+(1-patience)*.4;
  return {
    ...deal,
    dilution:Math.min(.35,(deal.dilution||0)+distress*.06),
    cashM:Number((deal.cashM*(1-distress*.12)).toFixed(2))
  };
}
function executeFinancing(type){
  const finance=ensureFinanceStrategyState();
  const deal=financingTerms(type);
  if(!deal)return false;
  state.cashM=(state.cashM||0)+deal.cashM;
  if(deal.dilution){
    finance.ownership.founders*=1-deal.dilution;
    finance.ownership.employees*=1-deal.dilution;
    finance.ownership.investors=1-finance.ownership.founders-finance.ownership.employees;
    normalizeCapTable();
  }
  if(deal.debtM){
    finance.debtM+=deal.debtM;
    finance.monthlyDebtServiceM+=deal.monthlyServiceM||0;
  }
  if(deal.boardSeats)finance.boardSeats.investors+=deal.boardSeats;
  if(deal.valuationFactor&&state.quarterlyBoard?.board)state.quarterlyBoard.board.valuationM*=deal.valuationFactor;
  const executive=state.roadmapPressure?.executive;
  if(executive)executive.pressure=Math.max(0,Math.min(1,Number(executive.pressure||0)+(deal.pressure||0)));
  finance.transactions.push({day:state.day||1,type,name:deal.name,cashM:deal.cashM,dilution:deal.dilution||0,debtM:deal.debtM||0});
  finance.history.push({day:state.day||1,type:'financing.executed',financing:type});
  log?.(`💰 ${deal.name} closed for $${deal.cashM.toFixed(1)}M.`);
  save();
  render();
  return true;
}
function executeStrategicDeal(type){
  const finance=ensureFinanceStrategyState();
  const deal=STRATEGIC_DEALS[type];
  if(!deal||state.cashM<deal.costM){
    log?.('Insufficient cash for strategic deal.');
    save();
    render();
    return false;
  }
  state.cashM-=deal.costM;
  if(state.quarterlyBoard){
    state.quarterlyBoard.computeCapacity=(state.quarterlyBoard.computeCapacity||0)+(deal.capacity||0);
    state.quarterlyBoard.hiringEnvelope=(state.quarterlyBoard.hiringEnvelope||0)+(deal.hiring||0);
  }
  const customer=state.releaseGov?.customer;
  if(deal.revenueM&&customer)customer.revenueM=Number(customer.revenueM||0)+deal.revenueM;
  if(deal.trust&&customer)customer.trust=Math.min(1,Number(customer.trust||0)+deal.trust);
  const executive=state.roadmapPressure?.executive;
  if(deal.credibility&&executive)executive.credibility=Math.min(1,Number(executive.credibility||0)+deal.credibility);
  if(deal.lockin&&state.architecturePortfolio)state.architecturePortfolio.platformLockIn=(state.architecturePortfolio.platformLockIn||0)+deal.lockin;
  finance.partnerships.push({day:state.day||1,type,name:deal.name,costM:deal.costM});
  finance.history.push({day:state.day||1,type:'strategic.deal',deal:type});
  log?.(`🤝 ${deal.name} signed.`);
  save();
  render();
  return true;
}
function financeRunwayMonths(){
  const finance=ensureFinanceStrategyState();
  const base=typeof quarterlyRunway==='function'?quarterlyRunway():12;
  const service=finance.monthlyDebtServiceM||0;
  return Math.max(0,Number((base-service*1.8).toFixed(1)));
}
function evaluateRunwayCrisis(){
  const finance=ensureFinanceStrategyState();
  const runway=financeRunwayMonths();
  if(runway<3&&!finance.crisis){
    finance.crisis={openedDay:state.day||1,severity:'critical',runway};
    if(state.quarterlyBoard?.board)state.quarterlyBoard.board.investorPatience=Math.max(0,(state.quarterlyBoard.board.investorPatience||.7)-.12);
    const executive=state.roadmapPressure?.executive;
    if(executive)executive.boardConfidence=Math.max(0,Number(executive.boardConfidence||0)-.08);
    log?.(`🚨 Runway crisis: ${runway} months remaining.`);
  }else if(runway>=6&&finance.crisis){
    finance.crisis.resolvedDay=state.day||1;
    finance.crisis=null;
  }
}
function negotiateBoardSeat(){
  const finance=ensureFinanceStrategyState();
  const board=state.quarterlyBoard?.board;
  if((board?.investorPatience??.7)<.45){
    finance.boardSeats.investors+=1;
    if(board)board.investorPatience=Math.min(1,(board.investorPatience||0)+.08);
    finance.history.push({day:state.day||1,type:'board.seat.granted'});
    log?.('🏛 Granted an investor board seat to stabilize financing support.');
  }else{
    finance.boardSeats.strategic+=1;
    const executive=state.roadmapPressure?.executive;
    if(executive)executive.boardConfidence=Math.min(1,Number(executive.boardConfidence||0)+.03);
    log?.('🏛 Added an independent strategic board seat.');
  }
  save();
  render();
  return true;
}
function financeStrategyOpen(){ensureFinanceStrategyState();state.view='financeStrategy';save();render();}
function financeStrategyClose(){state.view='company';save();render();}
function renderFinanceStrategy(){
  const finance=ensureFinanceStrategyState();
  evaluateRunwayCrisis();
  const runway=financeRunwayMonths();
  const valuation=state.quarterlyBoard?.board?.valuationM||0;
  const financingCards=Object.keys(FINANCING_OPTIONS).map(key=>{
    const terms=financingTerms(key);
    const dilution=terms.dilution?`${Math.round(terms.dilution*100)}% dilution`:'';
    const debt=terms.debtM?`$${terms.debtM.toFixed(1)}M debt`:'';
    return `<article><b>${terms.name}</b><span>$${terms.cashM.toFixed(1)}M cash</span><small>${dilution}${debt}</small><button onclick="executeFinancing('${key}')">Execute</button></article>`;
  }).join('');
  const strategicCards=Object.entries(STRATEGIC_DEALS).map(([key,deal])=>
    `<article><b>${deal.name}</b><span>$${deal.costM.toFixed(1)}M</span><button onclick="executeStrategicDeal('${key}')">Sign</button></article>`
  ).join('');
  const ownershipRows=Object.entries(finance.ownership).map(([key,value])=>
    `<div class="fs-row"><span>${esc(key)}</span><b>${Math.round(value*100)}%</b></div>`
  ).join('');
  return `<div class="fs-shell">
    <header class="fs-head"><div><div class="eyebrow">PHASE 4D.11 · CAPITAL STRATEGY</div><h1>Financing, Strategic Deals & Runway</h1><p>Capital is no longer free: choose dilution, debt service, supply lock-in, or strategic leverage under changing runway pressure.</p></div><button onclick="financeStrategyClose()">Return to company</button></header>
    <section class="fs-summary ${runway<3?'crisis':''}"><div><span>Runway</span><b>${runway} mo</b></div><div><span>Valuation</span><b>$${valuation.toFixed(1)}M</b></div><div><span>Debt</span><b>$${finance.debtM.toFixed(1)}M</b><small>$${finance.monthlyDebtServiceM.toFixed(2)}M/mo service</small></div><div><span>Founder ownership</span><b>${Math.round(finance.ownership.founders*100)}%</b></div></section>
    <section class="fs-card"><h2>Financing options</h2><div class="fs-grid">${financingCards}</div></section>
    <section class="fs-card"><h2>Strategic transactions</h2><div class="fs-grid">${strategicCards}</div></section>
    <section class="fs-card"><h2>Capital structure</h2>${ownershipRows}<div class="fs-row"><span>Board</span><b>${finance.boardSeats.founders} founder · ${finance.boardSeats.investors} investor · ${finance.boardSeats.strategic} strategic</b></div><button onclick="negotiateBoardSeat()">Negotiate board seat</button></section>
  </div>`;
}
const financeStrategyBaseRender=render;
render=function(){
  const finance=ensureFinanceStrategyState();
  evaluateRunwayCrisis();
  if(state.view==='financeStrategy'){
    document.getElementById('app').innerHTML=renderFinanceStrategy();
    return;
  }
  financeStrategyBaseRender();
  if(!state.started)return;
  const shell=document.querySelector('.game-shell');
  if(!shell)return;
  const runway=financeRunwayMonths();
  const button=document.createElement('button');
  button.className='fs-launch';
  button.onclick=financeStrategyOpen;
  button.innerHTML=`<span>CAPITAL STRATEGY</span><b>${runway} mo runway · $${finance.debtM.toFixed(1)}M debt · ${Math.round(finance.ownership.founders*100)}% founder ownership</b><small>Financing · GPU deals · partnerships · board control →</small>`;
  shell.insertBefore(button,shell.children[1]||null);
};
render();
