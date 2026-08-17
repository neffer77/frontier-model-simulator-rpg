// P5.2.10 — explicit bridges for classic-script finance catalogs and actions
(function(){
  'use strict';
  window.frontierFinancingOptions=()=>typeof FINANCING_OPTIONS!=='undefined'?FINANCING_OPTIONS:{};
  window.frontierStrategicDeals=()=>typeof STRATEGIC_DEALS!=='undefined'?STRATEGIC_DEALS:{};
  window.frontierFinanceScenarios=()=>typeof SCENARIOS!=='undefined'?SCENARIOS:{};
  window.frontierInitiativeTemplates=()=>typeof INITIATIVE_TEMPLATES!=='undefined'?INITIATIVE_TEMPLATES:{};
  window.frontierExecuteFinancing=type=>{if(typeof executeFinancing!=='function')return false;executeFinancing(type);return true};
  window.frontierExecuteStrategicDeal=type=>{if(typeof executeStrategicDeal!=='function')return false;executeStrategicDeal(type);return true};
  window.frontierNegotiateBoardSeat=()=>{if(typeof negotiateBoardSeat!=='function')return false;negotiateBoardSeat();return true};
  window.frontierProposeInitiative=key=>{if(typeof proposeInitiative!=='function')return false;proposeInitiative(key);return true};
  window.frontierRunCommitteeDebate=id=>{if(typeof runCommitteeDebate!=='function')return false;runCommitteeDebate(id);return true};
  window.frontierGateInitiative=(id,decision)=>{if(typeof gateInitiative!=='function')return false;gateInitiative(id,decision);return true};
  window.frontierSetScenarioProbability=(id,value)=>{if(typeof setScenarioProbability!=='function')return false;setScenarioProbability(id,value);return true};
})();
