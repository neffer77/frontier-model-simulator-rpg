// P5.0.2 — FrontierOS Command + Event Bus
// One auditable action/event spine for the legacy simulator and future FrontierOS apps.
(function(){
  'use strict';

  const BUS_SCHEMA=1;
  const MAX_EVENTS=600;
  const MAX_TEXT=800;
  const registry=new Map();
  const subscribers=new Map();
  const journal=[];
  let sequence=0;
  let subscriberSequence=0;

  const sensitiveKey=/pass(word)?|secret|token|cookie|authorization|auth|api[_-]?key|session[_-]?cookie/i;

  function identity(){
    try{return window.frontierDiagnostics?.()||null}catch(e){return null}
  }
  function route(){return identity()?.route||'unknown'}
  function revision(){return Number(identity()?.state?.stateRevision)||0}
  function sessionId(){return identity()?.session?.sessionId||'session_unknown'}
  function buildId(){return identity()?.build?.buildId||'local'}
  function shortSession(){return sessionId().replace(/^sess_/,'').replace(/[^a-zA-Z0-9]/g,'').slice(0,10)||'unknown'}
  function now(){return new Date().toISOString()}
  function nextId(prefix){return `${prefix}_${shortSession()}_${String(++sequence).padStart(6,'0')}`}
  function trimText(value,max=MAX_TEXT){
    const text=String(value??'');
    return text.length>max?`${text.slice(0,max)}…`:text;
  }
  function safeValue(value,depth=0,key=''){
    if(sensitiveKey.test(String(key)))return '[REDACTED]';
    if(value==null||typeof value==='boolean'||typeof value==='number')return value;
    if(typeof value==='string')return trimText(value);
    if(typeof value==='function')return `[Function ${value.name||'anonymous'}]`;
    if(typeof value==='bigint')return String(value);
    if(depth>=4)return '[MAX_DEPTH]';
    if(Array.isArray(value))return value.slice(0,25).map((entry,index)=>safeValue(entry,depth+1,String(index)));
    if(typeof value==='object'){
      const out={};
      for(const [childKey,childValue] of Object.entries(value).slice(0,40))out[childKey]=safeValue(childValue,depth+1,childKey);
      return out;
    }
    return trimText(value);
  }
  function matches(pattern,type){
    if(pattern==='*')return true;
    if(pattern.endsWith('*'))return type.startsWith(pattern.slice(0,-1));
    return pattern===type;
  }
  function notify(event){
    for(const {pattern,handler} of subscribers.values()){
      if(!matches(pattern,event.type))continue;
      try{handler(event)}catch(error){
        // Subscriber failures must never destabilize gameplay or recursively emit.
        console.error('[FrontierOS bus subscriber error]',error);
      }
    }
    try{window.dispatchEvent(new CustomEvent('frontier:event',{detail:event}))}catch(e){}
  }
  function emit(type,data={},meta={}){
    const diag=identity();
    const event={
      schemaVersion:BUS_SCHEMA,
      sequence:sequence+1,
      eventId:nextId('evt'),
      type:String(type||'event.unknown'),
      timestamp:now(),
      buildId:buildId(),
      sessionId:sessionId(),
      route:meta.route||diag?.route||'unknown',
      stateRevision:Number.isFinite(meta.stateRevision)?meta.stateRevision:revision(),
      correlationId:meta.correlationId||null,
      commandId:meta.commandId||null,
      source:meta.source||'runtime',
      severity:meta.severity||'info',
      data:safeValue(data)
    };
    journal.push(event);
    if(journal.length>MAX_EVENTS)journal.splice(0,journal.length-MAX_EVENTS);
    notify(event);
    return event;
  }

  function registerCommand(name,handler,options={}){
    if(typeof name!=='string'||!name.trim())throw new TypeError('Command name is required');
    if(typeof handler!=='function')throw new TypeError(`Command ${name} requires a handler function`);
    const normalized=name.trim();
    if(registry.has(normalized)&&!options.replace)throw new Error(`Command already registered: ${normalized}`);
    registry.set(normalized,{
      name:normalized,
      handler,
      description:options.description||'',
      source:options.source||'runtime',
      replayable:options.replayable!==false,
      idempotent:!!options.idempotent,
      registeredAt:now()
    });
    emit('command.registered',{name:normalized,replayable:options.replayable!==false,idempotent:!!options.idempotent},{source:'command-bus'});
    return ()=>registry.delete(normalized);
  }

  async function dispatchCommand(name,payload={},meta={}){
    const normalized=String(name||'').trim();
    const spec=registry.get(normalized);
    const commandId=nextId('cmd');
    const correlationId=meta.correlationId||commandId;
    const startedAt=performance.now();
    const beforeRevision=revision();
    const commandContext={
      commandId,
      correlationId,
      name:normalized,
      source:meta.source||spec?.source||'runtime',
      route:route(),
      stateRevisionBefore:beforeRevision,
      sessionId:sessionId(),
      buildId:buildId()
    };

    emit('command.started',{name:normalized,payload,registered:!!spec,replayable:spec?.replayable??false},{...commandContext,source:commandContext.source,stateRevision:beforeRevision});

    if(!spec){
      const error=new Error(`Unknown command: ${normalized}`);
      emit('command.failed',{name:normalized,error:{name:error.name,message:error.message},durationMs:Math.round((performance.now()-startedAt)*100)/100},{...commandContext,severity:'error',stateRevision:revision()});
      throw error;
    }

    try{
      const result=await spec.handler(safeValue(payload),{
        ...commandContext,
        emit:(type,data={},eventMeta={})=>emit(type,data,{...eventMeta,commandId,correlationId,source:eventMeta.source||commandContext.source})
      });
      // save() is synchronous, but state identity emits its DOM event in a microtask.
      await Promise.resolve();
      const afterRevision=revision();
      const durationMs=Math.round((performance.now()-startedAt)*100)/100;
      emit('command.completed',{
        name:normalized,
        result:safeValue(result),
        durationMs,
        stateRevisionBefore:beforeRevision,
        stateRevisionAfter:afterRevision,
        stateChanged:afterRevision!==beforeRevision
      },{...commandContext,stateRevision:afterRevision});
      return result;
    }catch(error){
      await Promise.resolve();
      const afterRevision=revision();
      emit('command.failed',{
        name:normalized,
        error:{name:error?.name||'Error',message:trimText(error?.message||error),stack:trimText(error?.stack||'',1600)},
        durationMs:Math.round((performance.now()-startedAt)*100)/100,
        stateRevisionBefore:beforeRevision,
        stateRevisionAfter:afterRevision,
        stateChanged:afterRevision!==beforeRevision
      },{...commandContext,severity:'error',stateRevision:afterRevision});
      throw error;
    }
  }

  function subscribe(pattern,handler){
    if(typeof handler!=='function')throw new TypeError('Event subscriber requires a function');
    const id=`sub_${++subscriberSequence}`;
    subscribers.set(id,{pattern:String(pattern||'*'),handler});
    return ()=>subscribers.delete(id);
  }
  function events(filter={}){
    const since=Number(filter.sinceSequence)||0;
    const type=filter.type||null;
    const correlationId=filter.correlationId||null;
    const commandId=filter.commandId||null;
    const limit=Math.max(1,Math.min(Number(filter.limit)||MAX_EVENTS,MAX_EVENTS));
    return journal.filter(event=>event.sequence>since&&(!type||matches(type,event.type))&&(!correlationId||event.correlationId===correlationId)&&(!commandId||event.commandId===commandId)).slice(-limit).map(event=>structuredClone?structuredClone(event):JSON.parse(JSON.stringify(event)));
  }
  function commandRegistry(){
    return [...registry.values()].map(({handler,...spec})=>({...spec})).sort((a,b)=>a.name.localeCompare(b.name));
  }
  function snapshot(){
    return {
      schemaVersion:BUS_SCHEMA,
      buildId:buildId(),
      sessionId:sessionId(),
      capturedAt:now(),
      route:route(),
      stateRevision:revision(),
      commandCount:registry.size,
      eventCount:journal.length,
      commands:commandRegistry(),
      events:events()
    };
  }
  function clearJournal(){
    journal.splice(0,journal.length);
    emit('runtime.journal.cleared',{}, {source:'command-bus'});
  }

  // Bridge the P5.0.1 persistence boundary into the event journal so legacy
  // functions are observable before they are migrated to explicit commands.
  window.addEventListener('frontier:state-saved',event=>{
    const detail=event.detail||{};
    emit('state.saved',detail,{source:'state-identity',stateRevision:Number(detail.stateRevision)||revision()});
  });

  // Immediate legacy interaction visibility. Future FrontierOS controls should
  // dispatch explicit commands; this click event is intentionally observational.
  document.addEventListener('click',event=>{
    const target=event.target?.closest?.('button,a,[role="button"],[data-command]');
    if(!target)return;
    emit('ui.click',{
      tag:target.tagName?.toLowerCase()||null,
      id:target.id||null,
      classes:[...target.classList||[]].slice(0,8),
      label:trimText(target.getAttribute?.('aria-label')||target.textContent?.trim()||'',160),
      dataCommand:target.getAttribute?.('data-command')||null
    },{source:'dom'});
  },true);

  window.addEventListener('error',event=>emit('runtime.error',{message:event.message,filename:event.filename,lineno:event.lineno,colno:event.colno,error:{name:event.error?.name,message:event.error?.message,stack:event.error?.stack}},{source:'window',severity:'error'}));
  window.addEventListener('unhandledrejection',event=>emit('runtime.unhandledrejection',{reason:{name:event.reason?.name,message:event.reason?.message||String(event.reason),stack:event.reason?.stack}},{source:'window',severity:'error'}));
  window.addEventListener('online',()=>emit('runtime.network',{online:true},{source:'navigator'}));
  window.addEventListener('offline',()=>emit('runtime.network',{online:false},{source:'navigator',severity:'warn'}));
  document.addEventListener('visibilitychange',()=>emit('runtime.visibility',{state:document.visibilityState},{source:'document'}));

  window.frontierCommandBus={schemaVersion:BUS_SCHEMA,register:registerCommand,dispatch:dispatchCommand,emit,subscribe,events,commands:commandRegistry,snapshot,clear:clearJournal};
  window.frontierRegisterCommand=registerCommand;
  window.frontierDispatchCommand=dispatchCommand;
  window.frontierEmitEvent=emit;
  window.frontierSubscribeEvent=subscribe;
  window.frontierEventJournal=events;
  window.frontierCommandRegistry=commandRegistry;
  window.frontierCommandEventSnapshot=snapshot;

  emit('runtime.command-bus.ready',{schemaVersion:BUS_SCHEMA,maxEvents:MAX_EVENTS,identity:identity()},{source:'command-bus'});
})();
