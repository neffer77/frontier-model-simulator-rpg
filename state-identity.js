// P5.0.1 — State revision + build/session identity.
// Loaded before frontier-lab.js so every persisted simulator mutation is revisioned
// at the single localStorage boundary without requiring gameplay modules to change.
(function(){
  const SAVE_KEY='frontier-lab-v3';
  const IDENTITY_SCHEMA=1;
  const nativeSetItem=Storage.prototype.setItem;
  const nativeGetItem=Storage.prototype.getItem;
  let bootstrapNormalization=true;
  const writeTimeline=[];
  const session={
    schemaVersion:IDENTITY_SCHEMA,
    sessionId:createSessionId(),
    startedAt:new Date().toISOString()
  };

  function createSessionId(){
    try{if(globalThis.crypto?.randomUUID)return `sess_${crypto.randomUUID()}`}catch(e){}
    return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,12)}`;
  }
  function parse(raw){try{return raw?JSON.parse(raw):null}catch(e){return null}}
  function domainSnapshot(value){
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    const copy={...value};delete copy._frontier;
    try{return JSON.stringify(copy)}catch(e){return null}
  }
  function domainObject(value){
    if(!value||typeof value!=='object'||Array.isArray(value))return{};
    const copy={...value};delete copy._frontier;return copy;
  }
  function changedTopLevelKeys(previous,candidate){
    const a=domainObject(previous),b=domainObject(candidate),keys=new Set([...Object.keys(a),...Object.keys(b)]),changed=[];
    for(const key of keys){
      let av,bv;
      try{av=JSON.stringify(a[key]);bv=JSON.stringify(b[key])}catch(e){av=String(a[key]);bv=String(b[key])}
      if(av!==bv)changed.push(key);
    }
    return changed.sort();
  }
  function previousState(storage){
    try{return parse(nativeGetItem.call(storage,SAVE_KEY))}catch(e){return null}
  }
  function inferMutation(){
    try{
      const lines=String(new Error().stack||'').split('\n').slice(2);
      const line=lines.find(x=>!x.includes('state-identity.js')&&!x.includes('Storage.setItem')&&!/\bsave\b/.test(x));
      const match=line?.match(/at\s+(?:Object\.)?([^\s(]+)/);
      return match?.[1]||'save';
    }catch(e){return'save'}
  }
  function augmentSavedState(storage,value){
    const candidate=parse(value);
    if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))return value;
    const previous=previousState(storage);
    const previousMeta=previous?._frontier||null;
    const candidateRevision=Number(candidate._frontier?.stateRevision)||0;
    const priorRevision=Number(previousMeta?.stateRevision)||0;
    const domainChanged=!previous||domainSnapshot(candidate)!==domainSnapshot(previous);
    const caller=inferMutation();
    const changedKeys=previous?changedTopLevelKeys(previous,candidate):Object.keys(domainObject(candidate)).sort();
    // Existing saves are allowed to gain/migrate default fields while application
    // modules initialize. Those persistence writes are structural normalization,
    // not gameplay/user mutations, so they must not fabricate semantic revisions.
    const normalizedDuringBootstrap=Boolean(previous)&&bootstrapNormalization&&domainChanged;
    const semanticChanged=domainChanged&&!normalizedDuringBootstrap;
    const stateRevision=semanticChanged?Math.max(candidateRevision,priorRevision)+1:Math.max(candidateRevision,priorRevision);
    const now=new Date().toISOString();
    candidate._frontier={
      schemaVersion:IDENTITY_SCHEMA,
      stateRevision,
      saveFormatVersion:candidate.version??null,
      lastMutationAt:semanticChanged?now:(previousMeta?.lastMutationAt||null),
      lastMutation:semanticChanged?caller:(previousMeta?.lastMutation||null)
    };
    const writeEvidence={
      index:writeTimeline.length+1,
      at:now,
      caller,
      priorRevision,
      candidateRevision,
      stateRevision,
      domainChanged,
      semanticChanged,
      bootstrapNormalization:normalizedDuringBootstrap,
      bootstrapOpen:bootstrapNormalization,
      changedKeys
    };
    writeTimeline.push(writeEvidence);
    if(writeTimeline.length>100)writeTimeline.shift();
    queueMicrotask(()=>{
      try{window.dispatchEvent(new CustomEvent('frontier:state-saved',{detail:{...candidate._frontier,changed:semanticChanged,domainChanged,bootstrapNormalization:normalizedDuringBootstrap,caller,changedKeys,priorRevision,stateRevision}}))}catch(e){}
    });
    return JSON.stringify(candidate);
  }

  Storage.prototype.setItem=function(key,value){
    if(String(key)===SAVE_KEY){
      try{value=augmentSavedState(this,String(value))}catch(e){}
    }
    return nativeSetItem.call(this,key,value);
  };

  function savedState(){
    try{return parse(nativeGetItem.call(localStorage,SAVE_KEY))}catch(e){return null}
  }
  function liveState(){
    try{return typeof state!=='undefined'?state:null}catch(e){return null}
  }
  function route(){
    const s=liveState()||savedState()||{};
    if(s.selectedIncident)return `training/incident/${s.selectedIncident}`;
    if(s.view)return String(s.view);
    return s.started?'company/home':'founder/setup';
  }
  function deviceMode(){
    const width=Math.max(0,window.innerWidth||document.documentElement.clientWidth||0);
    const height=Math.max(0,window.innerHeight||document.documentElement.clientHeight||0);
    if(width<=600&&height>=width)return'phone-portrait';
    if(height<=600&&width>height&&width<=900)return'phone-landscape';
    if(width<=1100)return'tablet';
    if(width>=1800)return'wide-desktop';
    return'desktop';
  }
  function displayMode(){
    try{
      if(window.matchMedia?.('(display-mode: standalone)').matches)return'standalone';
      if(window.navigator?.standalone===true)return'standalone';
    }catch(e){}
    return'browser';
  }
  function build(){
    const b=window.__FRONTIER_BUILD__||{};
    return {
      schemaVersion:Number(b.schemaVersion)||1,
      buildId:b.buildId||'local',
      gitSha:b.gitSha||null,
      builtAt:b.builtAt||null,
      ref:b.ref||'local'
    };
  }
  function stateEnvelope(){
    const saved=savedState();
    const meta=saved?._frontier||null;
    return {
      schemaVersion:meta?.schemaVersion||IDENTITY_SCHEMA,
      stateRevision:Number(meta?.stateRevision)||0,
      saveFormatVersion:meta?.saveFormatVersion??saved?.version??liveState()?.version??null,
      lastMutationAt:meta?.lastMutationAt||null,
      lastMutation:meta?.lastMutation||null
    };
  }
  function diagnostics(){
    const viewport={width:window.innerWidth||0,height:window.innerHeight||0,devicePixelRatio:window.devicePixelRatio||1};
    return {
      schemaVersion:IDENTITY_SCHEMA,
      build:build(),
      session:{...session},
      state:stateEnvelope(),
      device:{mode:deviceMode(),displayMode:displayMode(),viewport},
      route:route(),
      online:typeof navigator.onLine==='boolean'?navigator.onLine:null,
      capturedAt:new Date().toISOString()
    };
  }
  function diagnosticsText(){
    const d=diagnostics();
    return [
      'FrontierOS Diagnostics',
      `Build       ${d.build.buildId}`,
      `Git SHA     ${d.build.gitSha||'local'}`,
      `Session     ${d.session.sessionId}`,
      `State rev   ${d.state.stateRevision}`,
      `Schema      ${d.state.schemaVersion}`,
      `Device      ${d.device.mode}`,
      `Viewport    ${d.device.viewport.width}×${d.device.viewport.height}`,
      `Route       ${d.route}`,
      `Last action ${d.state.lastMutation||'none'}`
    ].join('\n');
  }

  window.frontierIdentity=diagnostics;
  window.frontierDiagnostics=diagnostics;
  window.frontierDiagnosticsText=diagnosticsText;
  window.frontierStateEnvelope=stateEnvelope;
  window.frontierStateWriteTimeline=()=>writeTimeline.map(x=>({...x,changedKeys:[...x.changedKeys]}));
  window.frontierSessionIdentity=()=>({...session});
  window.frontierDeviceMode=deviceMode;
  const closeBootstrap=()=>{bootstrapNormalization=false};
  if(document.readyState==='complete')queueMicrotask(closeBootstrap);else addEventListener('load',()=>setTimeout(closeBootstrap,0),{once:true});
})();
