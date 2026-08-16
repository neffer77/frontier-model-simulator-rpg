// P5.2.4 — Native Model Lab command ownership
(function(){
  'use strict';
  if(typeof window.frontierRegisterCommand!=='function')return;
  frontierRegisterCommand('model.lab.native.open',(payload={})=>window.frontierModelLabOpen?.(payload),{source:'model-lab-frontieros',description:'Open the native FrontierOS Model Lab',idempotent:true});
})();
