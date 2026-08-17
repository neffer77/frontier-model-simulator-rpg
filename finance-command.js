// P5.2.10 — Native Finance command
(function(){'use strict';if(typeof window.frontierRegisterCommand!=='function')return;frontierRegisterCommand('finance.open',(payload={})=>window.frontierFinanceOpen?.(payload),{source:'finance-frontieros',description:'Open native FrontierOS Finance',replayable:true,idempotent:true});})();
