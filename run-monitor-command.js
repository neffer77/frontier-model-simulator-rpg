// P5.2.2 — canonical Training launch adapter owned by native Run Monitor.
(function(){
  'use strict';
  try{
    window.frontierRegisterCommand?.('navigation.training.open',payload=>window.frontierRunMonitorOpen?.(payload||{})||{ok:false,status:'run-monitor-unavailable'},{replace:true,source:'run-monitor-frontieros',description:'Open the native FrontierOS Run Monitor',idempotent:true});
    window.frontierEmitEvent?.('run-monitor.command.ready',{command:'navigation.training.open'},{source:'run-monitor-frontieros'});
  }catch(error){window.frontierEmitEvent?.('run-monitor.command.failed',{error:String(error?.message||error)},{source:'run-monitor-frontieros',severity:'error'});}
})();