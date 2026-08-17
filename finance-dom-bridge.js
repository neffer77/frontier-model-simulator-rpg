// P5.2.10 — Shell-safe delegated interactions for native FrontierOS Finance
(function(){
  'use strict';
  if(window.__frontierFinanceDomBridge)return;
  window.__frontierFinanceDomBridge=true;
  const inFinance=target=>!!target?.closest?.('[data-frontieros-native-app="finance"]');
  const reopen=(view,initiativeId)=>{
    if(initiativeId&&window.frontierFinanceSelectInitiative)return window.frontierFinanceSelectInitiative(initiativeId);
    if(view&&window.frontierFinanceSetView)return window.frontierFinanceSetView(view);
    return window.frontierFinanceOpen?.({view:view||'runway'});
  };
  const action=(name,payload={},view,initiativeId)=>{
    const result=window.frontierFinanceDispatch?.(name,payload)||{ok:false,action:name,error:'Finance dispatcher unavailable'};
    if(result.ok&&view)reopen(view,initiativeId);
    return result;
  };
  window.frontierFinanceUiAction=(name,value,extra)=>{
    if(name==='view')return {ok:!!reopen(value),action:name};
    if(name==='financing')return action('financing',{type:value},'financing');
    if(name==='deal')return action('deal',{type:value},'deals');
    if(name==='board-seat')return action('board-seat',{},'runway');
    if(name==='proposal'){
      const result=action('propose',{key:value});
      const snap=window.frontierFinanceSnapshot?.();
      const id=snap?.initiatives?.at?.(-1)?.id||snap?.initiatives?.[snap.initiatives.length-1]?.id||null;
      if(result.ok)reopen('committee',id);
      if(result.ok)window.frontierEmitEvent?.('finance.initiative.proposed',{initiativeId:id,key:value},{source:'finance-dom-bridge'});
      return result;
    }
    if(name==='initiative')return {ok:!!reopen('committee',value),action:name};
    if(name==='debate'){
      const result=action('debate',{id:value},'committee',value);
      if(result.ok)window.frontierEmitEvent?.('finance.committee.debated',{initiativeId:value},{source:'finance-dom-bridge'});
      return result;
    }
    if(name==='gate'){
      const [id,decision]=String(value||'').split(':');
      const result=action('gate',{id,decision},'committee',id);
      if(result.ok)window.frontierEmitEvent?.('finance.gate.decided',{initiativeId:id,decision},{source:'finance-dom-bridge'});
      return result;
    }
    if(name==='scenario'){
      const result=action('scenario',{id:value,value:extra},'committee');
      if(result.ok)window.frontierEmitEvent?.('finance.scenario.changed',{scenario:value,value:Number(extra)},{source:'finance-dom-bridge'});
      return result;
    }
    return {ok:false,action:name,error:`Unknown Finance UI action: ${name}`};
  };
  document.addEventListener('click',event=>{
    if(!inFinance(event.target))return;
    const target=event.target;
    const view=target.closest('[data-fin-view]');
    if(view){event.stopImmediatePropagation();window.frontierFinanceUiAction('view',view.dataset.finView);return}
    const financing=target.closest('[data-fin-financing]');
    if(financing){event.stopImmediatePropagation();window.frontierFinanceUiAction('financing',financing.dataset.finFinancing);return}
    const deal=target.closest('[data-fin-deal]');
    if(deal){event.stopImmediatePropagation();window.frontierFinanceUiAction('deal',deal.dataset.finDeal);return}
    if(target.closest('[data-fin-board-seat]')){event.stopImmediatePropagation();window.frontierFinanceUiAction('board-seat');return}
    const proposal=target.closest('[data-fin-propose]');
    if(proposal){event.stopImmediatePropagation();window.frontierFinanceUiAction('proposal',proposal.dataset.finPropose);return}
    const initiative=target.closest('[data-fin-initiative]');
    if(initiative){event.stopImmediatePropagation();window.frontierFinanceUiAction('initiative',initiative.dataset.finInitiative);return}
    const debate=target.closest('[data-fin-debate]');
    if(debate){event.stopImmediatePropagation();window.frontierFinanceUiAction('debate',debate.dataset.finDebate);return}
    const gate=target.closest('[data-fin-gate]');
    if(gate){event.stopImmediatePropagation();window.frontierFinanceUiAction('gate',gate.dataset.finGate);return}
  },true);
  document.addEventListener('change',event=>{
    if(!inFinance(event.target))return;
    const scenario=event.target.closest('[data-fin-scenario]');
    if(!scenario)return;
    event.stopImmediatePropagation();
    window.frontierFinanceUiAction('scenario',scenario.dataset.finScenario,scenario.value);
  },true);
  window.frontierEmitEvent?.('finance.dom-bridge.ready',{schemaVersion:2,dispatcher:true},{source:'finance-dom-bridge'});
})();
