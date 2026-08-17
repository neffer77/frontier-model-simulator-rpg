// P5.2.10 — Shell-safe delegated interactions for native FrontierOS Finance
(function(){
  'use strict';
  if(window.__frontierFinanceDomBridge)return;
  window.__frontierFinanceDomBridge=true;
  const inFinance=target=>!!target?.closest?.('[data-frontieros-native-app="finance"]');
  const reopen=view,initiativeId)=>{
    if(initiativeId&&window.frontierFinanceSelectInitiative)return window.frontierFinanceSelectInitiative(initiativeId);
    if(view&&window.frontierFinanceSetView)return window.frontierFinanceSetView(view);
    return window.frontierFinanceOpen?.({view:view||'runway'});
  };
  document.addEventListener('click',event=>{
    if(!inFinance(event.target))return;
    const target=event.target;
    const view=target.closest('[data-fin-view]');
    if(view){event.stopImmediatePropagation();reopen(view.dataset.finView);return}
    const financing=target.closest('[data-fin-financing]');
    if(financing){event.stopImmediatePropagation();window.executeFinancing?.(financing.dataset.finFinancing);reopen('financing');return}
    const deal=target.closest('[data-fin-deal]');
    if(deal){event.stopImmediatePropagation();window.executeStrategicDeal?.(deal.dataset.finDeal);reopen('deals');return}
    if(target.closest('[data-fin-board-seat]')){event.stopImmediatePropagation();window.negotiateBoardSeat?.();reopen('runway');return}
    const proposal=target.closest('[data-fin-propose]');
    if(proposal){event.stopImmediatePropagation();window.proposeInitiative?.(proposal.dataset.finPropose);const snap=window.frontierFinanceSnapshot?.();const id=snap?.initiatives?.at?.(-1)?.id||snap?.initiatives?.[snap.initiatives.length-1]?.id||null;if(id)reopen('committee',id);else reopen('committee');window.frontierEmitEvent?.('finance.initiative.proposed',{initiativeId:id,key:proposal.dataset.finPropose},{source:'finance-dom-bridge'});return}
    const initiative=target.closest('[data-fin-initiative]');
    if(initiative){event.stopImmediatePropagation();reopen('committee',initiative.dataset.finInitiative);return}
    const debate=target.closest('[data-fin-debate]');
    if(debate){event.stopImmediatePropagation();window.runCommitteeDebate?.(debate.dataset.finDebate);reopen('committee',debate.dataset.finDebate);window.frontierEmitEvent?.('finance.committee.debated',{initiativeId:debate.dataset.finDebate},{source:'finance-dom-bridge'});return}
    const gate=target.closest('[data-fin-gate]');
    if(gate){event.stopImmediatePropagation();const [id,decision]=gate.dataset.finGate.split(':');window.gateInitiative?.(id,decision);reopen('committee',id);window.frontierEmitEvent?.('finance.gate.decided',{initiativeId:id,decision},{source:'finance-dom-bridge'});return}
  },true);
  document.addEventListener('change',event=>{
    if(!inFinance(event.target))return;
    const scenario=event.target.closest('[data-fin-scenario]');
    if(!scenario)return;
    event.stopImmediatePropagation();
    window.setScenarioProbability?.(scenario.dataset.finScenario,scenario.value);
    reopen('committee');
    window.frontierEmitEvent?.('finance.scenario.changed',{scenario:scenario.dataset.finScenario,value:Number(scenario.value)},{source:'finance-dom-bridge'});
  },true);
  window.frontierEmitEvent?.('finance.dom-bridge.ready',{schemaVersion:1},{source:'finance-dom-bridge'});
})();
