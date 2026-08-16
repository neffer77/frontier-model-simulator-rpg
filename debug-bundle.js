// P5.0.3 — FrontierOS Debug Bundle + Diagnostics
// Builds a privacy-safe, deterministic support snapshot from P5.0.1 identity and
// P5.0.2 command/event evidence. This is intentionally dependency-free.
(function(){
  'use strict';

  const DEBUG_SCHEMA=1;
  const MAX_EVENTS=240;
  const MAX_STRING=2400;
  const MAX_ARRAY=120;
  const MAX_KEYS=160;
  const sensitiveKey=/pass(word)?|secret|token|cookie|authorization|auth|api[_-]?key|session[_-]?cookie|credential|private[_-]?key/i;
  let openPanel=null;

  function now(){return new Date().toISOString()}
  function randomId(){
    try{if(globalThis.crypto?.randomUUID)return crypto.randomUUID()}catch(e){}
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`;
  }
  function safeText(value,max=MAX_STRING){const text=String(value??'');return text.length>max?`${text.slice(0,max)}…`:text}
  function sanitize(value,depth=0,key=''){
    if(sensitiveKey.test(String(key)))return '[REDACTED]';
    if(value==null||typeof value==='boolean'||typeof value==='number')return value;
    if(typeof value==='string')return safeText(value);
    if(typeof value==='bigint')return String(value);
    if(typeof value==='function')return `[Function ${value.name||'anonymous'}]`;
    if(depth>=8)return '[MAX_DEPTH]';
    if(Array.isArray(value))return value.slice(0,MAX_ARRAY).map((entry,index)=>sanitize(entry,depth+1,String(index)));
    if(typeof value==='object'){
      const out={};
      for(const [childKey,childValue] of Object.entries(value).slice(0,MAX_KEYS))out[childKey]=sanitize(childValue,depth+1,childKey);
      return out;
    }
    return safeText(value);
  }
  function clone(value){try{return structuredClone(value)}catch(e){try{return JSON.parse(JSON.stringify(value))}catch(inner){return null}}}
  function identity(){try{return sanitize(window.frontierDiagnostics?.()||{})}catch(e){return{error:safeText(e.message)}}}
  function eventSnapshot(){
    try{
      const snapshot=window.frontierCommandEventSnapshot?.()||{};
      return sanitize({...snapshot,events:(snapshot.events||[]).slice(-MAX_EVENTS)});
    }catch(e){return{error:safeText(e.message),events:[]}}
  }
  function stateSnapshot(){
    try{
      const live=typeof state!=='undefined'?state:null;
      if(live)return sanitize(clone(live));
    }catch(e){}
    try{
      const raw=localStorage.getItem('frontier-lab-v3');
      return sanitize(raw?JSON.parse(raw):null);
    }catch(e){return{error:safeText(e.message)}}
  }
  function safeUrl(){
    try{return `${location.origin}${location.pathname}`}catch(e){return null}
  }
  function activeElement(){
    try{
      const el=document.activeElement;
      if(!el)return null;
      return sanitize({tag:el.tagName?.toLowerCase()||null,id:el.id||null,classes:[...el.classList||[]].slice(0,8),role:el.getAttribute?.('role')||null,ariaLabel:el.getAttribute?.('aria-label')||null,text:safeText(el.textContent?.trim()||'',160)});
    }catch(e){return null}
  }
  function domContext(){
    try{
      const app=document.getElementById('app');
      const dialogs=[...document.querySelectorAll('[role="dialog"],[role="alertdialog"],dialog,.overlay,.modal')].slice(0,20).map(el=>({tag:el.tagName.toLowerCase(),id:el.id||null,classes:[...el.classList].slice(0,8),role:el.getAttribute('role'),visible:!!(el.offsetWidth||el.offsetHeight||el.getClientRects().length)}));
      return sanitize({
        title:document.title,
        readyState:document.readyState,
        visibilityState:document.visibilityState,
        activeElement:activeElement(),
        scroll:{x:Math.round(scrollX||0),y:Math.round(scrollY||0)},
        app:{exists:!!app,childCount:app?.children?.length||0,textLength:app?.textContent?.length||0,htmlLength:app?.innerHTML?.length||0},
        dialogs,
        buttons:document.querySelectorAll('button,[role="button"]').length,
        links:document.querySelectorAll('a[href]').length,
        inputs:document.querySelectorAll('input,select,textarea').length
      });
    }catch(e){return{error:safeText(e.message)}}
  }
  function environment(){
    const nav=navigator||{};
    const screenInfo=window.screen||{};
    return sanitize({
      url:safeUrl(),
      userAgent:nav.userAgent,
      language:nav.language,
      languages:nav.languages,
      platform:nav.userAgentData?.platform||nav.platform||null,
      mobile:nav.userAgentData?.mobile??null,
      hardwareConcurrency:nav.hardwareConcurrency||null,
      deviceMemory:nav.deviceMemory||null,
      maxTouchPoints:nav.maxTouchPoints||0,
      online:typeof nav.onLine==='boolean'?nav.onLine:null,
      screen:{width:screenInfo.width||0,height:screenInfo.height||0,availWidth:screenInfo.availWidth||0,availHeight:screenInfo.availHeight||0,colorDepth:screenInfo.colorDepth||null},
      viewport:{width:innerWidth||0,height:innerHeight||0,devicePixelRatio:devicePixelRatio||1},
      timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||null
    });
  }
  function performanceSnapshot(){
    try{
      const nav=performance.getEntriesByType?.('navigation')?.[0];
      const resources=performance.getEntriesByType?.('resource')||[];
      const slow=resources.filter(r=>Number.isFinite(r.duration)).sort((a,b)=>b.duration-a.duration).slice(0,12).map(r=>({name:safeText(new URL(r.name,location.href).pathname,240),initiatorType:r.initiatorType,durationMs:Math.round(r.duration*100)/100,transferSize:r.transferSize||0}));
      return sanitize({
        timeOrigin:performance.timeOrigin||null,
        navigation:nav?{type:nav.type,durationMs:Math.round(nav.duration*100)/100,domContentLoadedMs:Math.round(nav.domContentLoadedEventEnd*100)/100,loadMs:Math.round(nav.loadEventEnd*100)/100,transferSize:nav.transferSize||0}:null,
        resources:{count:resources.length,slowest:slow},
        memory:performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize,totalJSHeapSize:performance.memory.totalJSHeapSize,jsHeapSizeLimit:performance.memory.jsHeapSizeLimit}:null
      });
    }catch(e){return{error:safeText(e.message)}}
  }
  async function storageSnapshot(){
    const result={localStorage:{keys:[],bytesApprox:0},sessionStorage:{keys:[],bytesApprox:0},estimate:null};
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);if(!key)continue;
        const value=localStorage.getItem(key)||'';
        result.localStorage.keys.push(sensitiveKey.test(key)?'[REDACTED_KEY]':key);
        result.localStorage.bytesApprox+=key.length+value.length;
      }
    }catch(e){result.localStorage.error=safeText(e.message)}
    try{
      for(let i=0;i<sessionStorage.length;i++){
        const key=sessionStorage.key(i);if(!key)continue;
        const value=sessionStorage.getItem(key)||'';
        result.sessionStorage.keys.push(sensitiveKey.test(key)?'[REDACTED_KEY]':key);
        result.sessionStorage.bytesApprox+=key.length+value.length;
      }
    }catch(e){result.sessionStorage.error=safeText(e.message)}
    try{if(navigator.storage?.estimate)result.estimate=sanitize(await navigator.storage.estimate())}catch(e){result.estimate={error:safeText(e.message)}}
    return sanitize(result);
  }
  async function serviceWorkerSnapshot(){
    const result={supported:'serviceWorker'in navigator,controller:null,registrations:[]};
    if(!result.supported)return result;
    try{result.controller=navigator.serviceWorker.controller?{scriptURL:new URL(navigator.serviceWorker.controller.scriptURL).pathname,state:navigator.serviceWorker.controller.state}:null}catch(e){}
    try{
      const regs=await navigator.serviceWorker.getRegistrations();
      result.registrations=regs.slice(0,10).map(reg=>({scope:new URL(reg.scope).pathname,active:reg.active?{scriptURL:new URL(reg.active.scriptURL).pathname,state:reg.active.state}:null,waiting:reg.waiting?{scriptURL:new URL(reg.waiting.scriptURL).pathname,state:reg.waiting.state}:null,installing:reg.installing?{scriptURL:new URL(reg.installing.scriptURL).pathname,state:reg.installing.state}:null}));
    }catch(e){result.error=safeText(e.message)}
    return sanitize(result);
  }
  async function cacheSnapshot(){
    const result={supported:typeof caches!=='undefined',caches:[]};
    if(!result.supported)return result;
    try{
      const names=await caches.keys();
      for(const name of names.slice(0,12)){
        try{const cache=await caches.open(name);const keys=await cache.keys();result.caches.push({name:safeText(name,120),entryCount:keys.length,paths:keys.slice(0,25).map(req=>{try{return new URL(req.url).pathname}catch(e){return safeText(req.url,180)}})})}catch(e){result.caches.push({name:safeText(name,120),error:safeText(e.message)})}
      }
    }catch(e){result.error=safeText(e.message)}
    return sanitize(result);
  }
  function actionTrail(events){
    const useful=(events||[]).filter(event=>['ui.click','command.started','command.completed','command.failed','state.saved','runtime.error','runtime.unhandledrejection','runtime.network'].includes(event.type)).slice(-80);
    return useful.map(event=>sanitize({sequence:event.sequence,type:event.type,timestamp:event.timestamp,route:event.route,stateRevision:event.stateRevision,correlationId:event.correlationId,commandId:event.commandId,severity:event.severity,data:event.data}));
  }
  function reproduction(events){
    const steps=[];
    for(const event of (events||[]).slice(-120)){
      if(event.type==='command.started')steps.push({kind:'command',name:event.data?.name||'unknown',payload:event.data?.payload||{},route:event.route,stateRevision:event.stateRevision,correlationId:event.correlationId});
      else if(event.type==='ui.click')steps.push({kind:'click',label:event.data?.label||event.data?.id||event.data?.tag||'control',id:event.data?.id||null,dataCommand:event.data?.dataCommand||null,route:event.route,stateRevision:event.stateRevision});
    }
    return sanitize({generated:true,steps:steps.slice(-40),note:'Replay commands only when their registry metadata marks them replayable. Redacted payload fields require manual replacement.'});
  }
  function errorSummary(events){return sanitize((events||[]).filter(event=>event.severity==='error'||event.type==='runtime.error'||event.type==='runtime.unhandledrejection'||event.type==='command.failed').slice(-40))}

  async function createBundle(options={}){
    const ident=identity();
    const commandEvent=eventSnapshot();
    const bundle={
      schemaVersion:DEBUG_SCHEMA,
      item:'P5.0.3',
      bundleId:`dbg_${randomId()}`,
      capturedAt:now(),
      reason:safeText(options.reason||'manual',200),
      identity:ident,
      environment:environment(),
      state:stateSnapshot(),
      commandEvent,
      actionTrail:actionTrail(commandEvent.events),
      errors:errorSummary(commandEvent.events),
      reproduction:reproduction(commandEvent.events),
      dom:domContext(),
      performance:performanceSnapshot(),
      storage:await storageSnapshot(),
      serviceWorker:await serviceWorkerSnapshot(),
      cacheStorage:await cacheSnapshot(),
      evidence:{screenshot:'not captured by in-browser bundle; CI/browser automation attaches screenshots separately',trace:'CI/browser automation attaches Playwright traces separately'}
    };
    try{window.frontierEmitEvent?.('debug.bundle.created',{bundleId:bundle.bundleId,reason:bundle.reason,eventCount:bundle.commandEvent?.events?.length||0,errorCount:bundle.errors?.length||0},{source:'debug-bundle'})}catch(e){}
    return sanitize(bundle);
  }
  function summarize(bundle){
    const b=bundle||{};const id=b.identity||{};const env=b.environment||{};
    return [
      'FrontierOS Debug Bundle',
      `Bundle      ${b.bundleId||'unknown'}`,
      `Build       ${id.build?.buildId||'unknown'}`,
      `Git SHA     ${id.build?.gitSha||'unknown'}`,
      `Session     ${id.session?.sessionId||'unknown'}`,
      `State rev   ${id.state?.stateRevision??'unknown'}`,
      `Route       ${id.route||'unknown'}`,
      `Device      ${id.device?.mode||'unknown'} / ${id.device?.displayMode||'unknown'}`,
      `Viewport    ${env.viewport?.width||0}×${env.viewport?.height||0} @ ${env.viewport?.devicePixelRatio||1}x`,
      `Events      ${b.commandEvent?.events?.length||0}`,
      `Errors      ${b.errors?.length||0}`,
      `Online      ${env.online}`,
      `Captured    ${b.capturedAt||'unknown'}`
    ].join('\n');
  }
  async function downloadBundle(options={}){
    const bundle=await createBundle(options);
    const blob=new Blob([JSON.stringify(bundle,null,2)+'\n'],{type:'application/json'});
    const href=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const build=bundle.identity?.build?.buildId||'local';
    a.href=href;a.download=`frontier-debug-${build}-${Date.now()}.json`;a.style.display='none';document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(href),1000);
    return bundle;
  }
  async function copySummary(){
    const bundle=await createBundle({reason:'copy-summary'});const text=summarize(bundle);
    try{await navigator.clipboard.writeText(text)}catch(e){
      const area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();document.execCommand?.('copy');area.remove();
    }
    return text;
  }
  function escapeHtml(value){return String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
  async function openDiagnostics(){
    if(openPanel?.isConnected){openPanel.focus();return openPanel}
    const bundle=await createBundle({reason:'diagnostics-panel'});
    const panel=document.createElement('section');
    panel.className='frontier-debug-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','FrontierOS diagnostics');panel.tabIndex=-1;
    const summary=summarize(bundle);
    const eventRows=(bundle.actionTrail||[]).slice(-12).reverse().map(event=>`<li><code>${escapeHtml(event.type)}</code><span>r${escapeHtml(event.stateRevision)}</span><small>${escapeHtml(event.data?.name||event.data?.label||event.route||'')}</small></li>`).join('');
    panel.innerHTML=`<div class="frontier-debug-window"><header><div><strong>FrontierOS Diagnostics</strong><small>P5.0.3 support console</small></div><button type="button" data-debug-close aria-label="Close diagnostics">×</button></header><div class="frontier-debug-grid"><section><h2>Identity</h2><pre>${escapeHtml(summary)}</pre></section><section><h2>Recent trail</h2><ol>${eventRows||'<li>No actions recorded yet.</li>'}</ol></section></div><footer><button type="button" data-debug-download>Download debug bundle</button><button type="button" data-debug-copy>Copy summary</button><button type="button" data-debug-refresh>Refresh</button></footer></div>`;
    document.body.appendChild(panel);openPanel=panel;
    const close=()=>{panel.remove();if(openPanel===panel)openPanel=null};
    panel.querySelector('[data-debug-close]')?.addEventListener('click',close);
    panel.querySelector('[data-debug-download]')?.addEventListener('click',()=>downloadBundle({reason:'diagnostics-download'}));
    panel.querySelector('[data-debug-copy]')?.addEventListener('click',async event=>{await copySummary();event.currentTarget.textContent='Copied';setTimeout(()=>{if(event.currentTarget?.isConnected)event.currentTarget.textContent='Copy summary'},1200)});
    panel.querySelector('[data-debug-refresh]')?.addEventListener('click',()=>{close();openDiagnostics()});
    panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close()}});
    panel.focus();
    return panel;
  }
  function closeDiagnostics(){if(openPanel?.isConnected)openPanel.remove();openPanel=null}
  document.addEventListener('keydown',event=>{
    if((event.metaKey||event.ctrlKey)&&event.shiftKey&&String(event.key).toLowerCase()==='d'){
      event.preventDefault();openDiagnostics();
    }
  });

  window.frontierCreateDebugBundle=createBundle;
  window.frontierDebugBundleSummary=summarize;
  window.frontierDownloadDebugBundle=downloadBundle;
  window.frontierCopyDebugSummary=copySummary;
  window.frontierOpenDiagnostics=openDiagnostics;
  window.frontierCloseDiagnostics=closeDiagnostics;
  window.frontierDebugSanitize=sanitize;
  try{window.frontierRegisterCommand?.('diagnostics.open',()=>openDiagnostics(),{source:'debug-bundle',description:'Open the FrontierOS diagnostics console',replayable:false,idempotent:true})}catch(e){}
  try{window.frontierRegisterCommand?.('diagnostics.bundle',payload=>createBundle(payload||{}),{source:'debug-bundle',description:'Create a privacy-safe support bundle',replayable:false,idempotent:true})}catch(e){}
  try{window.frontierEmitEvent?.('runtime.debug-bundle.ready',{schemaVersion:DEBUG_SCHEMA},{source:'debug-bundle'})}catch(e){}
})();
