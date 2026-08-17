// P5.2.9 — read-only bridge for classic-script lexical project catalogs
(function(){'use strict';try{window.PROJECT_TEMPLATES=Object.freeze({...PROJECT_TEMPLATES});window.RECOVERY_ACTIONS=Object.freeze({...RECOVERY_ACTIONS});}catch(error){window.frontierEmitEvent?.('projects.catalog.error',{error:String(error?.message||error)},{source:'projects-frontieros',severity:'error'});}})();
