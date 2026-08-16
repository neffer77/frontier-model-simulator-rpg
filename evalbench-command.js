// P5.2.3 — canonical EvalBench launch adapter.
(function(){
  'use strict';
  try{
    window.frontierRegisterCommand?.('evalbench.open',payload=>window.frontierEvalBenchOpen?.(payload||{})||{ok:false,status:'evalbench-unavailable'},{replace:true,source:'evalbench-frontieros',description:'Open the native FrontierOS EvalBench',idempotent:true});
    window.frontierEmitEvent?.('evalbench.command.ready',{command:'evalbench.open'},{source:'evalbench-frontieros'});
  }catch(error){window.frontierEmitEvent?.('evalbench.command.failed',{error:String(error?.message||error)},{source:'evalbench-frontieros',severity:'error'});}
})();
