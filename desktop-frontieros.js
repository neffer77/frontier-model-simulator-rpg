// P5.1.3 — Desktop FrontierOS Shell
(function(){
  'use strict';
  const runtime={active:false,startOpen:false,activeApp:null,z:20,windows:new Map(),parking:null,clockTimer:null};
  const qs=()=>new URLSearchParams(location.search);
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function requested(){return qs().get('frontieros')==='desktop'||localStorage.getItem('frontieros.desktop')==='1'}
  function disabled(){return qs().get('frontieros')==='0'}
  function eligible(){return !disabled()&&innerWidth>=1000&&!matchMedia('(pointer:coarse)').matches}
  function shell(){return $('.frontieros-desktop')}
  function workspace(){return $('.frontieros-desktop-workspace')}
  function taskStrip(){return $('[data-os-task-strip]')}
  function liveApp(){return document.getElementById('app')}
  function now(){return new Intl.DateTimeFormat([], {hour:'numeric',minute:'2-digit'}).format(new Date())}
  function ensureParking(){
    if(runtime.parking?.isConnected)return runtime.parking;
    const p=document.createElement('div');p.className='frontieros-app-parking';p.hidden=true;document.body.appendChild(p);runtime.parking=p;return p;
  }
  function iconMarkup(app){const mark=app.launchState==='planned'?'SOON':app.launchState==='locked'?'LOCK':'';return `<button class="frontieros-desktop-icon" data-os-desktop-app="${esc(app.id)}" data-state="${esc(app.launchState)}"><span class="frontieros-desktop-iconbox" aria-hidden="true">${esc(app.icon)}</span>${Number(app.badge)?`<span class="frontieros-desktop-badge">${Number(app.badge)>99?'99+':Number(app.badge)}</span>`:''}<span class="frontieros-desktop-icon-name">${esc(app.shortLabel||app.label)}</span>${mark?`<small>${mark}</small>`:''}</button>`}
  function buildShell(){
    if(shell())return;
    ensureParking();
    const root=document.createElement('section');root.className='frontieros-desktop';root.hidden=true;root.setAttribute('aria-label','FrontierOS Desktop');
    root.innerHTML=`<header class="frontieros-desktop-menubar"><strong>FrontierOS</strong><span>FRONTIER LAB · <span data-os-desktop-build></span></span></header><main class="frontieros-desktop-workspace"><div class="frontieros-desktop-icons" data-os-desktop-icons></div><div class="frontieros-window-layer" data-os-window-layer></div></main><footer class="frontieros-taskbar"><button type="button" class="frontieros-start-button" data-os-start>▣ Start</button><div class="frontieros-task-strip" data-os-task-strip></div><div class="frontieros-tray"><button type="button" data-os-system aria-label="Open System">⚙</button><span data-os-desktop-clock></span></div></footer><section class="frontieros-start-menu" data-os-start-menu hidden><header><strong>FrontierOS</strong><span>Applications</span></header><div data-os-start-apps></div></section><div class="frontieros-desktop-toast" role="status" aria-live="polite" hidden></div>`;
    document.body.appendChild(root);
    root.addEventListener('click',onShellClick);
    root.addEventListener('dblclick',event=>{const b=event.target.closest('[data-os-desktop-app]');if(b)openApp(b.dataset.osDesktopApp)});
    root.addEventListener('pointerdown',event=>{const win=event.target.closest('.frontieros-window');if(win)focusWindow(win.dataset.appId,false)});
    document.addEventListener('pointerdown',beginDrag);
  }
  function refreshShell(){
    buildShell();
    const apps=window.frontierApps?.({surface:'desktop'})||[];
    $('[data-os-desktop-icons]',shell()).innerHTML=apps.map(iconMarkup).join('');
    $('[data-os-start-apps]',shell()).innerHTML=apps.map(app=>`<button type="button" data-os-desktop-app="${esc(app.id)}"><span>${esc(app.icon)}</span><span><strong>${esc(app.label)}</strong><small>${esc(app.description)}</small></span><em>${esc(app.launchState)}</em></button>`).join('');
    $('[data-os-desktop-build]',shell()).textContent=window.frontierDiagnostics?.().build?.buildId||'local';
    $('[data-os-desktop-clock]',shell()).textContent=now();renderTasks();
  }
  function showToast(message){const el=$('.frontieros-desktop-toast',shell());el.textContent=message;el.hidden=false;clearTimeout(el._t);el._t=setTimeout(()=>el.hidden=true,2800)}
  function windowRecord(id){return runtime.windows.get(id)||null}
  function makeWindow(app){
    const area=workspace().getBoundingClientRect();const pref=app.window||{};const index=runtime.windows.size;
    const width=Math.min(pref.width||900,Math.max(520,area.width-80));const height=Math.min(pref.height||650,Math.max(380,area.height-80));
    const left=Math.max(18,Math.min(70+index*34,area.width-width-18));const top=Math.max(18,Math.min(48+index*28,area.height-height-18));
    const el=document.createElement('section');el.className='frontieros-window';el.dataset.appId=app.id;el.setAttribute('role','dialog');el.setAttribute('aria-label',app.label);
    el.style.cssText=`left:${left}px;top:${top}px;width:${width}px;height:${height}px;z-index:${++runtime.z}`;
    el.innerHTML=`<header class="frontieros-window-titlebar" data-os-drag-handle><span class="frontieros-window-title"><b aria-hidden="true">${esc(app.icon)}</b>${esc(app.label)}</span><span class="frontieros-window-controls"><button type="button" data-os-minimize="${esc(app.id)}" aria-label="Minimize ${esc(app.label)}">_</button><button type="button" data-os-close="${esc(app.id)}" aria-label="Close ${esc(app.label)}">×</button></span></header><div class="frontieros-window-body"><div class="frontieros-window-suspended"><strong>${esc(app.label)}</strong><span>Application suspended. Select this window to resume.</span></div></div><footer class="frontieros-window-status"><span>${esc(app.route)}</span><span data-os-window-state>ready</span></footer>`;
    $('[data-os-window-layer]',shell()).appendChild(el);
    const rec={appId:app.id,el,minimized:false};runtime.windows.set(app.id,rec);renderTasks();return rec;
  }
  function suspendCurrent(){
    if(!runtime.activeApp)return;const rec=windowRecord(runtime.activeApp);if(!rec)return;const body=$('.frontieros-window-body',rec.el);const app=liveApp();if(app&&body.contains(app)){ensureParking().appendChild(app);body.innerHTML=`<div class="frontieros-window-suspended"><strong>${esc(window.frontierApp?.(rec.appId)?.label||rec.appId)}</strong><span>Application suspended. Select this window to resume.</span></div>`}
  }
  async function focusWindow(id,relaunch=true){
    const rec=windowRecord(id);if(!rec)return false;if(rec.minimized){rec.minimized=false;rec.el.hidden=false}
    if(runtime.activeApp!==id){suspendCurrent();runtime.activeApp=id}
    rec.el.style.zIndex=++runtime.z;$$('.frontieros-window',shell()).forEach(x=>x.classList.toggle('is-active',x===rec.el));
    if(relaunch){const result=await window.frontierLaunchApp?.(id,{surface:'desktop',source:'desktop-frontieros'});if(!result?.ok){showToast(`${window.frontierApp?.(id)?.label||id} could not be resumed.`);return false}}
    const app=liveApp();const body=$('.frontieros-window-body',rec.el);if(app){body.innerHTML='';body.appendChild(app);app.hidden=false}
    $('[data-os-window-state]',rec.el).textContent='active';renderTasks();window.frontierEmitEvent?.('os.desktop.window.focused',{appId:id},{source:'desktop-frontieros'});return true;
  }
  async function openApp(id){
    const app=window.frontierApp?.(id);if(!app){showToast('Unknown application.');return {ok:false,status:'unknown'}};
    if(app.launchState!=='ready'){showToast(app.launchState==='planned'?`${app.label} is planned for a later FrontierOS phase.`:`${app.label} is locked${app.lockReason?`: ${app.lockReason}`:''}.`);window.frontierEmitEvent?.('os.desktop.app.blocked',{appId:id,status:app.launchState,reason:app.lockReason},{source:'desktop-frontieros'});return {ok:false,status:app.launchState}}
    closeStart();let rec=windowRecord(id);if(!rec)rec=makeWindow(app);
    const result=await window.frontierLaunchApp?.(id,{surface:'desktop',source:'desktop-frontieros'});if(!result?.ok){showToast(`${app.label} could not be opened.`);return result}
    suspendCurrent();runtime.activeApp=id;rec.minimized=false;rec.el.hidden=false;rec.el.style.zIndex=++runtime.z;$$('.frontieros-window',shell()).forEach(x=>x.classList.toggle('is-active',x===rec.el));
    const body=$('.frontieros-window-body',rec.el);const live=liveApp();if(live){body.innerHTML='';body.appendChild(live);live.hidden=false}$('[data-os-window-state]',rec.el).textContent='active';renderTasks();window.frontierEmitEvent?.('os.desktop.app.opened',{appId:id,via:result.via,windowCount:runtime.windows.size},{source:'desktop-frontieros'});return result;
  }
  function minimize(id){const rec=windowRecord(id);if(!rec)return false;if(runtime.activeApp===id){suspendCurrent();runtime.activeApp=null}rec.minimized=true;rec.el.hidden=true;renderTasks();window.frontierEmitEvent?.('os.desktop.window.minimized',{appId:id},{source:'desktop-frontieros'});return true}
  function closeWindow(id){const rec=windowRecord(id);if(!rec)return false;if(runtime.activeApp===id){suspendCurrent();runtime.activeApp=null}rec.el.remove();runtime.windows.delete(id);renderTasks();window.frontierEmitEvent?.('os.desktop.window.closed',{appId:id,windowCount:runtime.windows.size},{source:'desktop-frontieros'});return true}
  function renderTasks(){if(!taskStrip())return;taskStrip().innerHTML=[...runtime.windows.values()].map(rec=>{const app=window.frontierApp?.(rec.appId);return `<button type="button" data-os-task="${esc(rec.appId)}" class="${runtime.activeApp===rec.appId&&!rec.minimized?'is-active':''}"><span>${esc(app?.icon||'□')}</span>${esc(app?.shortLabel||rec.appId)}</button>`}).join('')}
  function toggleStart(){runtime.startOpen=!runtime.startOpen;$('[data-os-start-menu]',shell()).hidden=!runtime.startOpen;$('[data-os-start]',shell()).classList.toggle('is-open',runtime.startOpen);window.frontierEmitEvent?.('os.desktop.start.toggled',{open:runtime.startOpen},{source:'desktop-frontieros'})}
  function closeStart(){runtime.startOpen=false;if(shell()){$('[data-os-start-menu]',shell()).hidden=true;$('[data-os-start]',shell()).classList.remove('is-open')}}
  function onShellClick(event){
    const start=event.target.closest('[data-os-start]');if(start){toggleStart();return}
    const app=event.target.closest('[data-os-desktop-app]');if(app){openApp(app.dataset.osDesktopApp);return}
    const task=event.target.closest('[data-os-task]');if(task){const rec=windowRecord(task.dataset.osTask);if(rec?.minimized||runtime.activeApp!==rec.appId)focusWindow(rec.appId,true);else minimize(rec.appId);return}
    const min=event.target.closest('[data-os-minimize]');if(min){minimize(min.dataset.osMinimize);return}
    const close=event.target.closest('[data-os-close]');if(close){closeWindow(close.dataset.osClose);return}
    if(event.target.closest('[data-os-system]'))openApp('settings');
  }
  function beginDrag(event){
    if(!runtime.active||event.button!==0)return;const handle=event.target.closest?.('[data-os-drag-handle]');if(!handle||event.target.closest('button'))return;const win=handle.closest('.frontieros-window');if(!win)return;
    const ws=workspace().getBoundingClientRect();const r=win.getBoundingClientRect();const dx=event.clientX-r.left,dy=event.clientY-r.top;win.setPointerCapture?.(event.pointerId);focusWindow(win.dataset.appId,false);
    const move=e=>{const maxX=Math.max(0,ws.width-r.width),maxY=Math.max(0,ws.height-r.height);win.style.left=`${Math.max(0,Math.min(e.clientX-ws.left-dx,maxX))}px`;win.style.top=`${Math.max(0,Math.min(e.clientY-ws.top-dy,maxY))}px`};
    const up=e=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);window.frontierEmitEvent?.('os.desktop.window.moved',{appId:win.dataset.appId,left:parseFloat(win.style.left),top:parseFloat(win.style.top)},{source:'desktop-frontieros'})};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true});event.preventDefault();
  }
  function activate(force=false){
    if(runtime.active)return true;if(!force&&!(requested()&&eligible()))return false;buildShell();runtime.active=true;refreshShell();shell().hidden=false;document.documentElement.classList.add('frontieros-desktop-active');document.documentElement.dataset.frontierOsSurface='desktop';ensureParking().appendChild(liveApp());
    runtime.clockTimer=setInterval(()=>{const c=$('[data-os-desktop-clock]',shell());if(c)c.textContent=now()},30000);window.frontierEmitEvent?.('os.desktop.shell.ready',{surface:'desktop',viewport:{width:innerWidth,height:innerHeight},apps:(window.frontierApps?.({surface:'desktop'})||[]).length},{source:'desktop-frontieros'});return true
  }
  function deactivate(){if(!runtime.active)return true;suspendCurrent();runtime.active=false;clearInterval(runtime.clockTimer);runtime.windows.forEach(r=>r.el.remove());runtime.windows.clear();runtime.activeApp=null;shell().hidden=true;document.documentElement.classList.remove('frontieros-desktop-active');document.documentElement.removeAttribute('data-frontier-os-surface');const app=liveApp();if(app)document.body.insertBefore(app,shell());return true}
  function snapshot(){return {schemaVersion:1,active:runtime.active,eligible:eligible(),requested:requested(),activeApp:runtime.activeApp,startOpen:runtime.startOpen,windows:[...runtime.windows.values()].map(r=>({appId:r.appId,minimized:r.minimized,zIndex:Number(r.el.style.zIndex),left:r.el.style.left,top:r.el.style.top,width:r.el.style.width,height:r.el.style.height})),apps:(window.frontierApps?.({surface:'desktop'})||[]).map(a=>({id:a.id,state:a.launchState,badge:a.badge}))}}
  window.frontierDesktopShellActivate=()=>activate(true);window.frontierDesktopShellDeactivate=deactivate;window.frontierDesktopAppOpen=openApp;window.frontierDesktopWindowFocus=id=>focusWindow(id,true);window.frontierDesktopWindowMinimize=minimize;window.frontierDesktopWindowClose=closeWindow;window.frontierDesktopShellSnapshot=snapshot;
  addEventListener('resize',()=>{if(runtime.active)refreshShell()});addEventListener('frontier:state-saved',()=>{if(runtime.active)refreshShell()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>activate(false));else queueMicrotask(()=>activate(false));
})();