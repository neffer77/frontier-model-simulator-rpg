// P5.2.11 — Native Company command
(function(){'use strict';if(typeof window.frontierRegisterCommand!=='function')return;frontierRegisterCommand('company.open',(payload={})=>window.frontierCompanyOpen?.(payload),{source:'company-frontieros',description:'Open native FrontierOS Company',replayable:true,idempotent:true});})();
