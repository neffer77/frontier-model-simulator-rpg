// Compatibility bridge for late-phase module names during the Phase 4D/5 integration pass.
// Keep legacy callers alive while modules converge on canonical function/state names.
window.ensurePublicComms = function(){ return typeof ensureComms === 'function' ? ensureComms() : undefined; };
window.ensureSecurityGov = function(){ return typeof ensureSecurity === 'function' ? ensureSecurity() : undefined; };

(function bridgeStateAliases(){
  if(typeof state === 'undefined' || !state) return;
  const aliases = {
    publicComms: 'comms',
    securityGovernance: 'securityGov',
    aiSafetyGovernance: 'aiSafety',
    enterpriseRiskManagement: 'erm',
    operationalResilience: 'resilience'
  };
  for(const [legacy, canonical] of Object.entries(aliases)){
    if(Object.prototype.hasOwnProperty.call(state, legacy)) continue;
    Object.defineProperty(state, legacy, {
      configurable: true,
      enumerable: false,
      get(){ return state[canonical]; },
      set(value){ state[canonical] = value; }
    });
  }
})();