// P5.2.2 — canonical Training launch adapter owned by native Run Monitor.
(function(){
  'use strict';
  let reconciling=false;
  function trainingIsActive(){
    try{
      if(window.frontierMobileShellSnapshot?.().active)return window.frontierMobileShellSnapshot().currentApp==='training';
      if(window.frontierDesktopShellSnapshot?.().active)return window.frontierDesktopShellSnapshot().activeApp==='training';
      return window.frontierOsSessionSnapshot?.().current?.appId==='training';
    }catch(e){return false}
  }
  async function callNative(payload){
    try{return {result:await window.frontierRunMonitorOpen(payload||{}),legacyRenderError:null}}
    catch(error){
      // Incident initialization in the legacy workstation mutates/saves canonical state
      // before its old presentation render runs. If that presentation render fails on a
      // partial/migrated run, the second native open can use the now-initialized
      // workstation without depending on the obsolete legacy screen.
      window.frontierEmitEvent?.('run-monitor.legacy-render-bypassed',{error:String(error?.message||error),detail:payload?.detail||null},{source:'run-monitor-frontieros',severity:'warn'});
      return {result:await window.frontierRunMonitorOpen(payload||{}),legacyRenderError:String(error?.message||error)};
    }
  }
  async function openNative(payload={}){
    const open=window.frontierRunMonitorOpen;
    if(typeof open!=='function')return {ok:false,status:'run-monitor-unavailable'};
    const first=await callNative(payload);
    const result=first.result;
    // Legacy render wrappers can finish in the same turn after incident setup. Verify
    // the native app still owns #app and deterministically restore it if necessary.
    await Promise.resolve();
    if(!document.querySelector('[data-frontieros-native-app="training"]'))await open(payload||{});
    await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
    if(!document.querySelector('[data-frontieros-native-app="training"]'))await open(payload||{});
    const visible=!!document.querySelector('[data-frontieros-native-app="training"]');
    window.frontierEmitEvent?.('run-monitor.command.render-verified',{visible,detail:payload?.detail||null,incidentId:payload?.incidentId||null,view:payload?.view||null,legacyRenderError:first.legacyRenderError},{source:'run-monitor-frontieros',severity:visible?'info':'error'});
    return visible?{...result,ok:true,status:'opened'}:{...result,ok:false,status:'render-missing'};
  }
  async function reconcileAfterLegacyRender(){
    if(reconciling||!trainingIsActive()||document.querySelector('[data-frontieros-native-app="training"]'))return;
    reconciling=true;
    try{
      const snap=window.frontierRunMonitorSnapshot?.();
      await window.frontierRunMonitorOpen?.({incidentId:snap?.incidentId||undefined,view:snap?.view||'overview'});
      window.frontierEmitEvent?.('run-monitor.render.reconciled',{incidentId:snap?.incidentId||null,view:snap?.view||'overview'},{source:'run-monitor-frontieros'});
    }catch(error){window.frontierEmitEvent?.('run-monitor.render.reconcile-failed',{error:String(error?.message||error)},{source:'run-monitor-frontieros',severity:'error'});}
    finally{reconciling=false}
  }
  try{
    window.frontierRegisterCommand?.('navigation.training.open',openNative,{replace:true,source:'run-monitor-frontieros',description:'Open and verify the native FrontierOS Run Monitor',idempotent:true});
    window.addEventListener('frontier:state-saved',()=>queueMicrotask(reconcileAfterLegacyRender));
    window.frontierEmitEvent?.('run-monitor.command.ready',{command:'navigation.training.open'},{source:'run-monitor-frontieros'});
  }catch(error){window.frontierEmitEvent?.('run-monitor.command.failed',{error:String(error?.message||error)},{source:'run-monitor-frontieros',severity:'error'});}
})();