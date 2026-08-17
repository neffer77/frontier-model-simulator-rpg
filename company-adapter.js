// P5.2.11 — Canonical Company action/state adapter
(function(){
  'use strict';
  let lastAction=null;
  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch{return value}};
  const live=()=>{try{return typeof state!=='undefined'?state:{}}catch{return{}}};

  function hydrateLegacyCompatibility(){
    const s=live();
    const board=s.quarterlyBoard?.board||{};
    const finance=s.financeStrategy||{};
    const q=s.quarterly ||= {};
    q.valuationM=Number(board.valuationM??q.valuationM??850);
    q.investorPatience=Number(board.investorPatience??q.investorPatience??.78);
    q.boardConfidence=Number(board.confidence??q.boardConfidence??.8);
    const legacy=s.financing ||= {};
    legacy.capTable={
      founders:Number(finance.ownership?.founders??legacy.capTable?.founders??.68),
      employees:Number(finance.ownership?.employees??legacy.capTable?.employees??.14),
      investors:Number(finance.ownership?.investors??legacy.capTable?.investors??.18)
    };
    legacy.board={
      founder:Number(finance.boardSeats?.founders??legacy.board?.founder??3),
      investor:Number(finance.boardSeats?.investors??legacy.board?.investor??1),
      strategic:Number(finance.boardSeats?.strategic??legacy.board?.strategic??0)
    };
    legacy.debtM=Number(finance.debtM??legacy.debtM??0);
    legacy.debtServiceM=Number(finance.monthlyDebtServiceM??legacy.debtServiceM??0);
    legacy.liquidationPreference=Number(finance.liquidationPreference??legacy.liquidationPreference??1);
    legacy.covenantPressure=Number(finance.covenantPressure??legacy.covenantPressure??0);
    legacy.runwayCrisis=finance.crisis?clone(finance.crisis):null;
    return s;
  }

  function reconcileLegacyWrites(){
    const s=live(),q=s.quarterly||{},legacy=s.financing||{};
    const board=s.quarterlyBoard?.board;
    const finance=s.financeStrategy;
    if(board){
      if(Number.isFinite(Number(q.valuationM)))board.valuationM=Number(q.valuationM);
      if(Number.isFinite(Number(q.investorPatience)))board.investorPatience=Math.max(0,Math.min(1,Number(q.investorPatience)));
      if(Number.isFinite(Number(q.boardConfidence)))board.confidence=Math.max(0,Math.min(1,Number(q.boardConfidence)));
      if(s.roadmapPressure?.executive) s.roadmapPressure.executive.boardConfidence=board.confidence;
    }
    if(finance){
      if(legacy.capTable){
        finance.ownership ||= {};
        for(const key of ['founders','employees','investors'])if(Number.isFinite(Number(legacy.capTable[key])))finance.ownership[key]=Number(legacy.capTable[key]);
      }
      if(legacy.board){
        finance.boardSeats ||= {};
        if(Number.isFinite(Number(legacy.board.founder)))finance.boardSeats.founders=Number(legacy.board.founder);
        if(Number.isFinite(Number(legacy.board.investor)))finance.boardSeats.investors=Number(legacy.board.investor);
        if(Number.isFinite(Number(legacy.board.strategic)))finance.boardSeats.strategic=Number(legacy.board.strategic);
      }
      if(Number.isFinite(Number(legacy.debtM)))finance.debtM=Number(legacy.debtM);
      if(Number.isFinite(Number(legacy.debtServiceM)))finance.monthlyDebtServiceM=Number(legacy.debtServiceM);
      if(Number.isFinite(Number(legacy.liquidationPreference)))finance.liquidationPreference=Number(legacy.liquidationPreference);
      if(Number.isFinite(Number(legacy.covenantPressure)))finance.covenantPressure=Number(legacy.covenantPressure);
    }
    try{save?.()}catch{}
    return hydrateLegacyCompatibility();
  }

  function ensure(){
    try{window.ensureQuarterlyBoardState?.()}catch{}
    try{window.ensureFinanceStrategyState?.()}catch{}
    hydrateLegacyCompatibility();
    try{window.ensureMacroState?.()}catch{}
    try{window.ensureGovernanceState?.()}catch{}
    try{window.ensureExecutivePolitics?.()}catch{}
    return hydrateLegacyCompatibility();
  }

  function counts(){
    const s=ensure();
    return {
      boardHistory:Array.isArray(s.quarterlyBoard?.history)?s.quarterlyBoard.history.length:0,
      motions:Array.isArray(s.governance?.motions)?s.governance.motions.length:0,
      governanceHistory:Array.isArray(s.governance?.history)?s.governance.history.length:0,
      macroHistory:Array.isArray(s.macro?.history)?s.macro.history.length:0,
      termSheets:Array.isArray(s.macro?.termSheets)?s.macro.termSheets.length:0,
      restructurings:Array.isArray(s.macro?.restructurings)?s.macro.restructurings.length:0,
      offers:Array.isArray(s.macro?.offers)?s.macro.offers.length:0,
      executiveHistory:Array.isArray(s.execPolitics?.history)?s.execPolitics.history.length:0
    };
  }

  function domainSnapshot(){
    const s=ensure(),qb=s.quarterlyBoard||{},board=qb.board||{},finance=s.financeStrategy||{},g=s.governance||{},macro=s.macro||{},ep=s.execPolitics||{};
    let control={risk:0,equity:Number(finance.ownership?.founders||0),boardShare:1,authority:Number(g.founderAuthority||0),status:'stable'};
    try{if(typeof founderControlRisk==='function')control=founderControlRisk()}catch{}
    let runway=0;try{runway=Number(window.financeRunwayMonths?.()??window.currentRunwayMonths?.()??0)}catch{}
    return clone({
      schemaVersion:1,
      company:s.company||'Frontier Lab',day:Number(s.day||1),cashM:Number(s.cashM||0),runway,
      board:{quarter:Number(qb.quarter||1),confidence:Number(board.confidence||0),valuationM:Number(board.valuationM||0),investorPatience:Number(board.investorPatience||0),nextReviewDay:qb.nextReviewDay||null,plan:qb.plan||null,forecast:qb.forecast||{},competitors:qb.competitors||[],history:qb.history||[]},
      finance:{debtM:Number(finance.debtM||0),monthlyDebtServiceM:Number(finance.monthlyDebtServiceM||0),ownership:finance.ownership||{},boardSeats:finance.boardSeats||{},liquidationPreference:Number(finance.liquidationPreference||1),covenantPressure:Number(finance.covenantPressure||0)},
      governance:{founderAuthority:Number(g.founderAuthority||0),ceoStatus:g.ceoStatus||'active',vetoes:Number(g.vetoes||0),controlRisk:control,motions:g.motions||[],history:g.history||[]},
      macro:{current:macro.current||null,history:macro.history||[],termSheets:macro.termSheets||[],restructurings:macro.restructurings||[],offers:macro.offers||[],secondaryM:Number(macro.secondaryM||0)},
      leadership:{culture:ep.culture||{},successor:ep.successor||null,executives:Object.values(ep.executives||{}),history:ep.history||[]}
    });
  }

  function record(result,severity='info'){
    lastAction=result;
    window.frontierEmitEvent?.(result.ok?'company.action.dispatched':'company.action.failed',result,{source:'company-adapter',severity});
    return result;
  }

  function dispatch(action,payload={}){
    const before=counts();
    ensure();
    try{
      let value=true,legacyWrites=false;
      switch(action){
        case'board-plan': value=window.setQuarterPlan?.(payload.priority||'balanced',payload.budgetM??3);break;
        case'board-forecast': {
          const s=live();
          const revenue=payload.revenueM??s.releaseGov?.customer?.revenueM??0;
          const cash=payload.cashM??s.cashM??0;
          const trust=payload.trustPct??Math.round((s.releaseGov?.customer?.trust??.7)*100);
          value=window.setQuarterForecast?.(revenue,cash,trust);break;
        }
        case'competitor-launch': value=window.triggerCompetitorLaunch?.();break;
        case'competitor-response': value=window.respondToCompetitor?.(payload.id,payload.mode||'differentiate');break;
        case'board-review': value=window.conductBoardReview?.();break;
        case'governance-vote': legacyWrites=true;value=window.callBoardVote?.(payload.kind);break;
        case'fiduciary': legacyWrites=true;value=window.declareFiduciaryPriority?.(payload.priority||'balanced');break;
        case'macro-shock': legacyWrites=true;value=window.triggerMacroShock?.(payload.key);break;
        case'term-sheet': legacyWrites=true;value=window.acceptTermSheet?.(payload.key);break;
        case'restructure': legacyWrites=true;value=window.restructureCompany?.();break;
        case'secondary': legacyWrites=true;value=window.sellSecondary?.(payload.amountM??1);break;
        case'acquisition-offer': legacyWrites=true;value=window.generateAcquisitionOffer?.();break;
        case'acquisition-accept': legacyWrites=true;value=window.acceptAcquisition?.(Number(payload.index));break;
        case'executive-align': legacyWrites=true;value=window.alignExecutive?.(payload.id,payload.mode);break;
        case'successor': legacyWrites=true;value=window.nominateSuccessor?.(payload.id);break;
        case'leadership-transition': legacyWrites=true;value=window.executeLeadershipTransition?.(payload.id);break;
        case'retention': legacyWrites=true;value=window.retentionEvent?.(payload.id);break;
        case'alliance': legacyWrites=true;value=window.createExecutiveAlliance?.(payload.a,payload.b);break;
        case'conflict': legacyWrites=true;value=window.createExecutiveConflict?.(payload.a,payload.b);break;
        default: throw new Error(`Unknown Company action: ${action}`);
      }
      if(legacyWrites)reconcileLegacyWrites();else hydrateLegacyCompatibility();
      const after=counts();
      return record({ok:value!==false,action,payload:clone(payload),before,after,value:value===undefined?null:value});
    }catch(error){
      return record({ok:false,action,payload:clone(payload),before,after:counts(),error:String(error?.stack||error)},'error');
    }
  }

  window.frontierCompanyEnsure=ensure;
  window.frontierCompanyHydrateLegacyState=hydrateLegacyCompatibility;
  window.frontierCompanyReconcileLegacyState=reconcileLegacyWrites;
  window.frontierCompanyDomainSnapshot=domainSnapshot;
  window.frontierCompanyDispatch=dispatch;
  window.frontierCompanyLastAction=()=>lastAction?clone(lastAction):null;
  ensure();
  window.frontierEmitEvent?.('company.adapter.ready',{schemaVersion:1,actionBoundary:'frontierCompanyDispatch'},{source:'company-adapter'});
})();
