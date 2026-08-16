// P5.1.4 — FrontierOS Navigation, Notifications & Session Layer
(function(){
  'use strict';
  const SCHEMA=1,SESSION_KEY='frontieros.session.v1',MAX_HISTORY=80,MAX_RECENTS=10,MAX_NOTIFICATIONS=80;
  const runtime={history:[],index:-1,recents:[],notifications:[],surface:null,restoring:false,centerOpen:false};
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const now=()=>new Date().toISOString();
  const id=(p='nav')=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  function detectSurface(){const explicit=document.documentElement.dataset.frontierOsSurface;if(explicit)return explicit;return window.frontierMobileShellSnapshot?.().active?'phone':window.frontierDesktopShellSnapshot?.().active?'desktop':'legacy'}
  function safeRead(){try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch(e){return null}}
  function persist(){try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(snapshot(false)))}catch(e){} }
  function appState(appId){return window.frontierApp?.(appId)||null}
  function routeFor(appId,detail=null){const app=appState(appId);return app?`${app.route}${detail?`/${String(detail).replace(/^\/+|\/+$/g,'')}`:''}`:null}
  function entry(appId,detail=null,meta={}){const app=appState(appId);return {id:id('hist'),appId,route:routeFor(appId,detail),detail:detail||null,label:app?.label||appId,surface:meta.surface||detectSurface(),timestamp:now(),source:meta.source||'navigation'}}
  function pushHistory(appId,detail=null,meta={}){
    if(!appId)return null;const next=entry(appId,detail,meta);const current=runtime.history[runtime.index];
    if(current&&current.appId===next.appId&&current.detail===next.detail){current.timestamp=next.timestamp;current.surface=next.surface;persist();return current}
    runtime.history=runtime.history.slice(0,runtime.index+1);runtime.history.push(next);if(runtime.history.length>MAX_HISTORY)runtime.history.shift();runtime.index=runtime.history.length-1;
    touchRecent(appId,detail);persist();window.frontierEmitEvent?.('os.navigation.changed',{direction:'push',entry:next,index:runtime.index,length:runtime.history.length},{source:'frontieros-session'});return next;
  }
  function touchRecent(appId,detail=null){const app=appState(appId);if(!app)return;runtime.recents=runtime.recents.filter(x=>x.appId!==appId);runtime.recents.unshift({appId,detail:detail||null,label:app.label,icon:app.icon,route:routeFor(appId,detail),lastOpenedAt:now()});runtime.recents=runtime.recents.slice(0,MAX_RECENTS)}
  async function openOnSurface(appId,detail=null,options={}){
    const surface=options.surface||detectSurface();let result;
    if(surface==='phone'&&typeof window.frontierMobileAppOpen==='function')result=await window.frontierMobileAppOpen(appId);
    else if(surface==='desktop'&&typeof window.frontierDesktopAppOpen==='function')result=await window.frontierDesktopAppOpen(appId);
    else result=await window.frontierLaunchApp?.(appId,{surface,source:'frontieros-session',payload:{detail}});
    if(result?.ok&&options.record!==false)pushHistory(appId,detail,{surface,source:options.source||'navigate'});return result||{ok:false,status:'unavailable'};
  }
  async function navigate(target,options={}){
    const parsed=window.frontierParseDeepLink?.(target)||null;const appId=parsed?.appId||window.frontierResolveApp?.(target)?.id||String(target||'');const detail=options.detail??parsed?.detail??null;
    const app=appState(appId);if(!app)return {ok:false,status:'unknown',target:String(target||'')};
    const result=await openOnSurface(appId,detail,{...options,source:options.source||'frontierOsNavigate'});
    window.frontierEmitEvent?.('os.navigation.requested',{target:String(target||''),appId,detail,surface:options.surface||detectSurface(),result:{ok:!!result?.ok,status:result?.status}},{source:'frontieros-session'});return result;
  }
  async function travel(delta){
    const nextIndex=runtime.index+delta;if(nextIndex<0||nextIndex>=runtime.history.length)return {ok:false,status:'boundary'};
    const next=runtime.history[nextIndex];runtime.index=nextIndex;const result=await openOnSurface(next.appId,next.detail,{surface:detectSurface(),record:false,source:delta<0?'back':'forward'});persist();
    window.frontierEmitEvent?.('os.navigation.changed',{direction:delta<0?'back':'forward',entry:next,index:runtime.index,length:runtime.history.length,result:{ok:!!result?.ok,status:result?.status}},{source:'frontieros-session'});renderCenter();return result;
  }
  function back(){return travel(-1)}function forward(){return travel(1)}
  function home(){const surface=detectSurface();if(surface==='phone')return window.frontierMobileHomeOpen?.();if(surface==='desktop'){const desktop=window.frontierDesktopShellSnapshot?.();if(desktop?.activeApp)window.frontierDesktopWindowMinimize?.(desktop.activeApp);return true}return window.gameplayGoHome?.()}
  function notify(input={}){
    const item={id:input.id||id('note'),title:String(input.title||'FrontierOS'),body:String(input.body||''),appId:input.appId||window.frontierParseDeepLink?.(input.deepLink)?.appId||null,deepLink:input.deepLink||null,severity:input.severity||'info',createdAt:input.createdAt||now(),read:false,dismissed:false,source:input.source||'runtime',sticky:!!input.sticky};
    runtime.notifications.unshift(item);runtime.notifications=runtime.notifications.slice(0,MAX_NOTIFICATIONS);persist();updateBadges();renderCenter();window.frontierEmitEvent?.('os.notification.created',item,{source:'frontieros-session',severity:item.severity});return {...item};
  }
  function notifications(options={}){return runtime.notifications.filter(n=>(options.includeDismissed||!n.dismissed)&&(options.unreadOnly?(!n.read&&!n.dismissed):true)).map(n=>({...n}))}
  function markRead(noteId){const n=runtime.notifications.find(x=>x.id===noteId);if(!n)return false;n.read=true;persist();updateBadges();renderCenter();window.frontierEmitEvent?.('os.notification.read',{notificationId:noteId},{source:'frontieros-session'});return true}
  function dismiss(noteId){const n=runtime.notifications.find(x=>x.id===noteId);if(!n)return false;n.dismissed=true;n.read=true;persist();updateBadges();renderCenter();window.frontierEmitEvent?.('os.notification.dismissed',{notificationId:noteId},{source:'frontieros-session'});return true}
  async function openNotification(noteId){const n=runtime.notifications.find(x=>x.id===noteId);if(!n)return {ok:false,status:'unknown-notification'};markRead(noteId);let result={ok:true,status:'read'};if(n.deepLink||n.appId)result=await navigate(n.deepLink||n.appId,{source:'notification'});closeCenter();window.frontierEmitEvent?.('os.notification.opened',{notificationId:noteId,appId:n.appId,deepLink:n.deepLink,result:{ok:!!result?.ok,status:result?.status}},{source:'frontieros-session'});return result}
  function ensureCenter(){
    let root=document.querySelector('.frontieros-notification-center');if(root)return root;root=document.createElement('aside');root.className='frontieros-notification-center';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','FrontierOS notifications');
    root.innerHTML=`<header><div><strong>Notifications</strong><span data-os-note-count></span></div><button type="button" data-os-note-close aria-label="Close notifications">×</button></header><section class="frontieros-session-nav"><button type="button" data-os-back>← Back</button><button type="button" data-os-forward>Forward →</button><button type="button" data-os-home>⌂ Home</button></section><section class="frontieros-recent-apps"><h3>Recent apps</h3><div data-os-recents></div></section><section class="frontieros-notifications-list" data-os-notes></section>`;document.body.appendChild(root);
    root.addEventListener('click',event=>{const open=event.target.closest('[data-note-open]');if(open){openNotification(open.dataset.noteOpen);return}const dis=event.target.closest('[data-note-dismiss]');if(dis){dismiss(dis.dataset.noteDismiss);return}const recent=event.target.closest('[data-recent-app]');if(recent){navigate(recent.dataset.recentApp,{source:'recent'});closeCenter();return}if(event.target.closest('[data-os-note-close]'))closeCenter();if(event.target.closest('[data-os-back]'))back();if(event.target.closest('[data-os-forward]'))forward();if(event.target.closest('[data-os-home]')){home();closeCenter()}});return root;
  }
  function renderCenter(){const root=ensureCenter();const notes=notifications();root.querySelector('[data-os-note-count]').textContent=`${notes.filter(n=>!n.read).length} unread`;
    root.querySelector('[data-os-back]').disabled=runtime.index<=0;root.querySelector('[data-os-forward]').disabled=runtime.index<0||runtime.index>=runtime.history.length-1;
    root.querySelector('[data-os-recents]').innerHTML=runtime.recents.length?runtime.recents.map(r=>`<button type="button" data-recent-app="${esc(r.appId)}"><span>${esc(r.icon)}</span><span>${esc(r.label)}</span></button>`).join(''):'<p>No recent apps yet.</p>';
    root.querySelector('[data-os-notes]').innerHTML=notes.length?notes.map(n=>`<article class="frontieros-notification ${n.read?'is-read':'is-unread'}" data-severity="${esc(n.severity)}"><button type="button" class="frontieros-notification-main" data-note-open="${esc(n.id)}"><strong>${esc(n.title)}</strong><span>${esc(n.body)}</span><small>${esc(n.appId?`Open ${appState(n.appId)?.label||n.appId}`:'Notification')}</small></button><button type="button" data-note-dismiss="${esc(n.id)}" aria-label="Dismiss ${esc(n.title)}">×</button></article>`).join(''):'<div class="frontieros-notification-empty">No notifications.</div>';
  }
  function openCenter(){runtime.centerOpen=true;const root=ensureCenter();renderCenter();root.hidden=false;document.documentElement.classList.add('frontieros-notifications-open');root.querySelector('button')?.focus();window.frontierEmitEvent?.('os.notification-center.opened',{unread:notifications({unreadOnly:true}).length},{source:'frontieros-session'});return true}
  function closeCenter(){runtime.centerOpen=false;const root=ensureCenter();root.hidden=true;document.documentElement.classList.remove('frontieros-notifications-open');window.frontierEmitEvent?.('os.notification-center.closed',{}, {source:'frontieros-session'});return true}
  function updateBadges(){const count=notifications({unreadOnly:true}).length;document.querySelectorAll('[data-os-notification-count]').forEach(el=>{el.textContent=count?String(Math.min(count,99)):'';el.hidden=!count});document.documentElement.dataset.frontierOsUnread=String(count)}
  function attachShellControls(){
    const phone=document.querySelector('.frontieros-phone-dock .frontieros-dock-inner');if(phone&&!phone.querySelector('[data-os-notifications]')){const b=document.createElement('button');b.className='frontieros-dock-btn';b.dataset.osNotifications='';b.innerHTML='<strong>●</strong><span>Alerts</span><em data-os-notification-count hidden></em>';b.addEventListener('click',openCenter);phone.insertBefore(b,phone.lastElementChild)}
    const tray=document.querySelector('.frontieros-tray');if(tray&&!tray.querySelector('[data-os-notifications]')){const b=document.createElement('button');b.type='button';b.dataset.osNotifications='';b.setAttribute('aria-label','Open notifications');b.innerHTML='● <span data-os-notification-count hidden></span>';b.addEventListener('click',openCenter);tray.insertBefore(b,tray.firstChild)}updateBadges();
  }
  function observeShellEvents(event){const e=event.detail||event;if(!e?.type)return;runtime.surface=detectSurface();const d=e.data||{};
    if(e.type==='os.mobile.app.opened'||e.type==='os.desktop.app.opened'||e.type==='os.desktop.window.focused'){if(d.appId&&!runtime.restoring)pushHistory(d.appId,null,{surface:runtime.surface,source:e.type})}
    if(e.type==='os.mobile.shell.ready'||e.type==='os.desktop.shell.ready'){attachShellControls();queueMicrotask(()=>restore())}
  }
  function restore(){if(runtime.restoring)return false;const saved=safeRead();if(!saved||saved.schemaVersion!==SCHEMA)return false;runtime.restoring=true;runtime.history=Array.isArray(saved.history)?saved.history.slice(-MAX_HISTORY):[];runtime.index=Math.min(Number(saved.index)||0,runtime.history.length-1);runtime.recents=Array.isArray(saved.recents)?saved.recents.slice(0,MAX_RECENTS):[];runtime.notifications=Array.isArray(saved.notifications)?saved.notifications.slice(0,MAX_NOTIFICATIONS):[];runtime.restoring=false;updateBadges();renderCenter();window.frontierEmitEvent?.('os.session.restored',{history:runtime.history.length,index:runtime.index,recents:runtime.recents.length,notifications:runtime.notifications.length},{source:'frontieros-session'});return true}
  function snapshot(includeNotifications=true){return {schemaVersion:SCHEMA,capturedAt:now(),surface:detectSurface(),history:runtime.history.map(x=>({...x})),index:runtime.index,current:runtime.history[runtime.index]||null,canBack:runtime.index>0,canForward:runtime.index>=0&&runtime.index<runtime.history.length-1,recents:runtime.recents.map(x=>({...x})),notifications:includeNotifications?runtime.notifications.map(x=>({...x})):runtime.notifications.map(({body,...x})=>x),unread:notifications({unreadOnly:true}).length,notificationCenterOpen:runtime.centerOpen}}
  window.frontierOsNavigate=navigate;window.frontierOsBack=back;window.frontierOsForward=forward;window.frontierOsHome=home;window.frontierOsRecentApps=()=>runtime.recents.map(x=>({...x}));window.frontierOsNotify=notify;window.frontierOsNotifications=notifications;window.frontierOsNotificationOpen=openNotification;window.frontierOsNotificationDismiss=dismiss;window.frontierOsOpenNotificationCenter=openCenter;window.frontierOsCloseNotificationCenter=closeCenter;window.frontierOsSessionSnapshot=()=>snapshot(true);window.frontierOsSessionRestore=restore;
  window.frontierSubscribeEvent?.('os.*',observeShellEvents);document.addEventListener('keydown',event=>{if(event.key==='Escape'&&runtime.centerOpen)closeCenter();if((event.altKey||event.metaKey)&&event.key==='ArrowLeft'){event.preventDefault();back()}if((event.altKey||event.metaKey)&&event.key==='ArrowRight'){event.preventDefault();forward()}});
  const boot=()=>{restore();ensureCenter();attachShellControls();new MutationObserver(attachShellControls).observe(document.body,{childList:true,subtree:true});window.frontierEmitEvent?.('os.session.ready',{schemaVersion:SCHEMA,sessionKey:SESSION_KEY},{source:'frontieros-session'})};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else queueMicrotask(boot);
})();
