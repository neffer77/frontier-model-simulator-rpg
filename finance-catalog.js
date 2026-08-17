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
})();
