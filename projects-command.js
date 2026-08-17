// P5.2.9 — Native Projects command
(function(){'use strict';if(typeof window.frontierRegisterCommand!=='function')return;frontierRegisterCommand('projects.open',(payload={})=>window.frontierProjectsOpen?.(payload),{source:'projects-frontieros',description:'Open native FrontierOS Projects',replayable:true,idempotent:true});})();
