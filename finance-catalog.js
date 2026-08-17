// P5.2.10 — explicit bridges for classic-script finance catalogs and actions
(function(){
  'use strict';
  let lastAction=null;
  const counts=()=>{
    try{
      if(typeof ensureFinanceStrategyState==='function')ensureFinanceStrategyState();
      return {
        transactions:Array.isArray(state.financeStrategy?.transactions)?state.financeStrategy.transactions.length:0,
        partnerships:Array.isArray(state.financeStrategy?.partnerships)?state.financeStrategy.partnerships.length:0,
        initiatives:Array.isArray(state.portfolioStrategy?.initiatives)?state.portfolioStrategy.initiatives.length:0,
        debates:Array.isArray(state.investmentCommittee?.debates)?state.investmentCommittee.debates.length:0
      };
    }catch{return {transactions:0,partnerships:0,initiatives:0,debates:0}}
  };
  const record=(result,severity)=>{
    lastAction=result;
    window.frontierEmitEvent?.(result.ok?'finance.action.dispatched':'finance.action.failed',result,{source:'finance-catalog',severity:severity||'info'});
    return result;
  };
  window.frontierFinancingOptions=()=>typeof FINANCING_OPTIONS!=='undefined'?FINANCING_OPTIONS:{};
  window.frontierStrategicDeals=()=>typeof STRATEGIC_DEALS!=='undefined'?STRATEGIC_DEALS:{};
  window.frontierFinanceScenarios=()=>typeof SCENARIOS!=='undefined'?SCENARIOS:{};
  window.frontierInitiativeTemplates=()=>typeof INITIATIVE_TEMPLATES!=='undefined'?INITIATIVE_TEMPLATES:{};
  window.frontierFinanceDispatch=(action,payload={})=>{
    const before=counts();
    try{
      let value=false;
      if(action==='financing')value=typeof executeFinancing==='function'?executeFinancing(payload.type):false;
      else if(action==='deal')value=typeof executeStrategicDeal==='function'?executeStrategicDeal(payload.type):false;
      else if(action==='board-seat')value=typeof negotiateBoardSeat==='function'?negotiateBoardSeat():false;
      else if(action==='propose')value=typeof proposeInitiative==='function'?proposeInitiative(payload.key):false;
      else if(action==='debate')value=typeof runCommitteeDebate==='function'?runCommitteeDebate(payload.id):false;
      else if(action==='gate')value=typeof gateInitiative==='function'?gateInitiative(payload.id,payload.decision):false;
      else if(action==='scenario')value=typeof setScenarioProbability==='function'?setScenarioProbability(payload.id,payload.value):false;
      else throw new Error(`Unknown finance action: ${action}`);
      const after=counts();
      const expectedMutation=action==='financing'?after.transactions>before.transactions:action==='deal'?after.partnerships>before.partnerships:action==='propose'?after.initiatives>before.initiatives:action==='debate'?after.debates>before.debates:true;
      return record({ok:value!==false&&expectedMutation,action,payload:{...payload},before,after,value});
    }catch(error){
      return record({ok:false,action,payload:{...payload},before,after:counts(),error:String(error?.stack||error)},'error');
    }
  };
  window.frontierFinanceLastAction=()=>lastAction?JSON.parse(JSON.stringify(lastAction)):null;
  window.frontierExecuteFinancing=type=>window.frontierFinanceDispatch('financing',{type}).ok;
  window.frontierExecuteStrategicDeal=type=>window.frontierFinanceDispatch('deal',{type}).ok;
  window.frontierNegotiateBoardSeat=()=>window.frontierFinanceDispatch('board-seat').ok;
  window.frontierProposeInitiative=key=>window.frontierFinanceDispatch('propose',{key}).ok;
  window.frontierRunCommitteeDebate=id=>window.frontierFinanceDispatch('debate',{id}).ok;
  window.frontierGateInitiative=(id,decision)=>window.frontierFinanceDispatch('gate',{id,decision}).ok;
  window.frontierSetScenarioProbability=(id,value)=>window.frontierFinanceDispatch('scenario',{id,value}).ok;

  // The native app may render before the optional DOM bridge initializes. Keep a
  // canonical UI action available from the catalog layer so visible controls can
  // never degrade into optional-chaining no-ops. finance-dom-bridge.js replaces
  // this with its richer shell-aware implementation when it initializes normally.
  window.frontierFinanceUiAction=(name,value,extra)=>{
    if(name==='view')return {ok:!!window.frontierFinanceSetView?.(value),action:name};
    if(name==='financing'){
      const result=window.frontierFinanceDispatch('financing',{type:value});
      if(result.ok)window.frontierFinanceSetView?.('financing');
      return result;
    }
    if(name==='deal'){
      const result=window.frontierFinanceDispatch('deal',{type:value});
      if(result.ok)window.frontierFinanceSetView?.('deals');
      return result;
    }
    if(name==='board-seat'){
      const result=window.frontierFinanceDispatch('board-seat');
      if(result.ok)window.frontierFinanceSetView?.('runway');
      return result;
    }
    if(name==='proposal'){
      const result=window.frontierFinanceDispatch('propose',{key:value});
      const snap=window.frontierFinanceSnapshot?.();
      const id=snap?.initiatives?.at?.(-1)?.id||null;
      if(result.ok&&id)window.frontierFinanceSelectInitiative?.(id);
      if(result.ok)window.frontierEmitEvent?.('finance.initiative.proposed',{initiativeId:id,key:value},{source:'finance-catalog'});
      return result;
    }
    if(name==='initiative')return {ok:!!window.frontierFinanceSelectInitiative?.(value),action:name};
    if(name==='debate'){
      const result=window.frontierFinanceDispatch('debate',{id:value});
      if(result.ok)window.frontierFinanceSelectInitiative?.(value);
      if(result.ok)window.frontierEmitEvent?.('finance.committee.debated',{initiativeId:value},{source:'finance-catalog'});
      return result;
    }
    if(name==='gate'){
      const [id,decision]=String(value||'').split(':');
      const result=window.frontierFinanceDispatch('gate',{id,decision});
      if(result.ok)window.frontierFinanceSelectInitiative?.(id);
      if(result.ok)window.frontierEmitEvent?.('finance.gate.decided',{initiativeId:id,decision},{source:'finance-catalog'});
      return result;
    }
    if(name==='scenario'){
      const result=window.frontierFinanceDispatch('scenario',{id:value,value:extra});
      if(result.ok)window.frontierFinanceSetView?.('committee');
      if(result.ok)window.frontierEmitEvent?.('finance.scenario.changed',{scenario:value,value:Number(extra)},{source:'finance-catalog'});
      return result;
    }
    return record({ok:false,action:name,payload:{value,extra},before:counts(),after:counts(),error:`Unknown Finance UI action: ${name}`},'error');
  };
})();
