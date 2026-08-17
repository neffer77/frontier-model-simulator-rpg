// P5.2.10 — Shell-safe delegated interactions for native FrontierOS Finance
(function(){
  'use strict';
  if(window.__frontierFinanceDomBridge)return;
  window.__frontierFinanceDomBridge=true;

  const directlyBound=new WeakSet();
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

  function directClick(element,name,value){
    if(directlyBound.has(element))return;
    directlyBound.add(element);
    element.addEventListener('click',event=>{
      event.stopPropagation();
      window.frontierFinanceUiAction(name,typeof value==='function'?value(element):value);
    });
  }
  function bindDirect(root=document){
    const scope=root?.querySelectorAll?root:document;
    scope.querySelectorAll('[data-fin-view]').forEach(el=>directClick(el,'view',node=>node.dataset.finView));
    scope.querySelectorAll('[data-fin-financing]').forEach(el=>directClick(el,'financing',node=>node.dataset.finFinancing));
    scope.querySelectorAll('[data-fin-deal]').forEach(el=>directClick(el,'deal',node=>node.dataset.finDeal));
    scope.querySelectorAll('[data-fin-board-seat]').forEach(el=>directClick(el,'board-seat'));
    scope.querySelectorAll('[data-fin-propose]').forEach(el=>directClick(el,'proposal',node=>node.dataset.finPropose));
    scope.querySelectorAll('[data-fin-initiative]').forEach(el=>directClick(el,'initiative',node=>node.dataset.finInitiative));
    scope.querySelectorAll('[data-fin-debate]').forEach(el=>directClick(el,'debate',node=>node.dataset.finDebate));
    scope.querySelectorAll('[data-fin-gate]').forEach(el=>directClick(el,'gate',node=>node.dataset.finGate));
    scope.querySelectorAll('[data-fin-scenario]').forEach(el=>{
      if(directlyBound.has(el))return;
      directlyBound.add(el);
      el.addEventListener('change',event=>{
        event.stopPropagation();
        window.frontierFinanceUiAction('scenario',el.dataset.finScenario,el.value);
      });
    });
    return true;
  }
  window.frontierFinanceBindControls=bindDirect;

  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node.nodeType===1)bindDirect(node);
      }
    }
  });
  const startObserver=()=>{
    bindDirect(document);
    if(document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});
  else startObserver();

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

  window.frontierEmitEvent?.('finance.dom-bridge.ready',{schemaVersion:3,dispatcher:true,directBinding:true},{source:'finance-dom-bridge'});
})();
