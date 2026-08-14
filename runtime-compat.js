// Runtime compatibility bridge for Phase 4D modules composed across naming migrations.
// This keeps old callers alive while canonical state remains owned by the current modules.
(function(){
  const g=window;
  const call=(name,args=[])=>typeof g[name]==='function'?g[name](...args):undefined;

  // Function-name migrations. Resolve targets at call time because this file loads early.
  g.ensureOperationsState=()=>call('ensureOpsState');
  g.ensureFinancingState=()=>call('ensureFinanceStrategyState');
  g.ensureExecutivePoliticsState=()=>call('ensureExecutivePolitics');
  g.ensureTalentState=()=>call('ensureTalentMemoryState');

  // This is a single-page simulator, so browser scroll position otherwise survives view
  // changes. Reset to the top whenever state.view changes, after the new view has rendered.
  let lastView;
  g.addEventListener('load',()=>{
    lastView=typeof state!=='undefined'?state.view:undefined;
    const watch=()=>{
      const next=typeof state!=='undefined'?state.view:undefined;
      if(next!==lastView){lastView=next;requestAnimationFrame(()=>g.scrollTo({top:0,left:0,behavior:'instant'}));}
      requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
  });

  if(typeof state==='undefined'||!state)return;

  // State-name migrations where the old and new concepts are the same system.
  if(!Object.getOwnPropertyDescriptor(state,'executivePolitics'))Object.defineProperty(state,'executivePolitics',{configurable:true,enumerable:false,get(){return state.execPolitics},set(v){state.execPolitics=v}});
  if(!Object.getOwnPropertyDescriptor(state,'talent'))Object.defineProperty(state,'talent',{configurable:true,enumerable:false,get(){return state.talentMemory},set(v){state.talentMemory=v}});

  // Quarterly modules moved board fields under quarterlyBoard.board. Expose the legacy
  // state.quarterly surface as a proxy so older finance/governance code sees one source.
  if(!Object.getOwnPropertyDescriptor(state,'quarterly'))Object.defineProperty(state,'quarterly',{configurable:true,enumerable:false,get(){
    const q=state.quarterlyBoard;if(!q)return undefined;q.board ||= {confidence:.8,valuationM:850,investorPatience:.78};
    return new Proxy(q,{get(t,p){if(p==='valuationM')return t.board.valuationM;if(p==='investorPatience')return t.board.investorPatience;if(p==='boardConfidence')return t.board.confidence;return t[p]},set(t,p,v){if(p==='valuationM'){t.board.valuationM=v;return true}if(p==='investorPatience'){t.board.investorPatience=v;return true}if(p==='boardConfidence'){t.board.confidence=v;return true}t[p]=v;return true}})
  }});

  // Financing renamed to financeStrategy and several field labels changed. Translate the
  // legacy API used by Macro/Governance without creating a second source of truth.
  if(!Object.getOwnPropertyDescriptor(state,'financing'))Object.defineProperty(state,'financing',{configurable:true,enumerable:false,get(){
    const f=state.financeStrategy;if(!f)return undefined;
    f.ownership ||= {founders:.68,employees:.14,investors:.18};
    f.boardSeats ||= {founders:3,investors:1,strategic:0};
    const board=new Proxy(f.boardSeats,{get(t,p){if(p==='founder')return t.founders||0;if(p==='investor')return t.investors||0;return t[p]},set(t,p,v){if(p==='founder'){t.founders=v;return true}if(p==='investor'){t.investors=v;return true}t[p]=v;return true}});
    return new Proxy(f,{get(t,p){if(p==='capTable')return t.ownership;if(p==='board')return board;if(p==='debtServiceM')return t.monthlyDebtServiceM||0;if(p==='runwayCrisis')return t.crisis;if(p==='liquidationPreference')return t.liquidationPreference||1;if(p==='covenantPressure')return t.covenantPressure||0;return t[p]},set(t,p,v){if(p==='capTable'){t.ownership=v;return true}if(p==='board'){t.boardSeats=v;return true}if(p==='debtServiceM'){t.monthlyDebtServiceM=v;return true}if(p==='runwayCrisis'){t.crisis=v;return true}t[p]=v;return true}})
  }});
})();