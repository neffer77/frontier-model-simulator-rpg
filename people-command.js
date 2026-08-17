// P5.2.8 — Native People command
(function(){'use strict';if(typeof window.frontierRegisterCommand!=='function')return;frontierRegisterCommand('people.open',(payload={})=>window.frontierPeopleOpen?.(payload),{source:'people-frontieros',description:'Open native FrontierOS People',replayable:true,idempotent:true});})();
