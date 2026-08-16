// P5.1.2 — Mobile FrontierOS Home
(function(){
  'use strict';
  const state={active:false,view:'home',currentApp:null,toastTimer:null};
  const qs=()=>new URLSearchParams(location.search);
  function isPhone(){
    if(qs().get('frontieros')==='0')return false;
    if(qs().get('frontieros')==='1')return true;
    const touch=(navigator.maxTouchPoints||0)>0||matchMedia('(pointer:coarse)').matches;
    return touch&&Math.min(innerWidth,screen?.width||innerWidth)<=900;
  }
  function timeText(){return new Intl.DateTimeFormat([], {hour:'numeric',minute:'2-digit'}).format(new Date())}
  function shell(){return document.querySelector('.frontieros-phone-shell')}
  function appbar(){return document.querySelector('.frontieros-mobile-appbar')}
  function safeText(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
  function appButton(app){
    const badge=Number(app.badge)||0;
    const stateMark=app.launchState==='planned'?'SOON':app.launchState==='locked'?'LOCK':'';
    return `<button class="frontieros-app-icon" data-app-id="${safeText(app.id)}" data-state="${safeText(app.launchState)}" aria-label="${safeText(app.label)}${stateMark?`, ${stateMark.toLowerCase()}`:''}"><span class="frontieros-app-iconbox" aria-hidden="true">${safeText(app.icon)}</span>${badge?`<span class="frontieros-app-badge">${badge>99?'99+':badge}</span>`:''}${stateMark?`<span class="frontieros-app-state">${stateMark}</span>`:''}<span class="frontieros-app-name">${safeText(app.shortLabel||app.label)}</span></button>`;
  }
  function ensureDom(){
    if(shell())return;
    const root=document.createElement('section');
    root.className='frontieros-phone-shell';root.hidden=true;root.setAttribute('aria-label','FrontierOS Home');
    root.innerHTML=`<header class="frontieros-phone-status"><span data-os-time></span><span>FRONTIER LAB · <span data-os-build></span></span></header><section class="frontieros-phone-brand"><strong>FrontierOS</strong><span>Company workstation · tap an app to begin</span></section><main class="frontieros-app-grid" data-os-grid></main><footer class="frontieros-phone-dock"><div class="frontieros-dock-inner"><button class="frontieros-dock-btn" data-os-home><strong>⌂</strong><span>Home</span></button><button class="frontieros-dock-btn" data-os-alerts><strong>!</strong><span>Pager</span></button><button class="frontieros-dock-btn" data-os-system><strong>⚙</strong><span>System</span></button></div></footer><div class="frontieros-phone-toast" role="status" aria-live="polite" hidden></div>`;
    document.body.appendChild(root);
    const bar=document.createElement('nav');bar.className='frontieros-mobile-appbar';bar.hidden=true;bar.setAttribute('aria-label','FrontierOS app navigation');
    bar.innerHTML=`<button type="button" data-os-app-home>⌂ Home</button><span class="frontieros-mobile-appbar-title" data-os-app-title>FrontierOS</span>`;
    document.body.appendChild(bar);
    root.addEventListener('click',async event=>{
      const app=event.target.closest('[data-app-id]');if(app){await openApp(app.dataset.appId);return}
      if(event.target.closest('[data-os-home]'))openHome();
      if(event.target.closest('[data-os-alerts]'))await openApp('pager');
      if(event.target.closest('[data-os-system]'))await openApp('settings');
    });
    bar.addEventListener('click',event=>{if(event.target.closest('[data-os-app-home]'))openHome()});
  }
  function refreshHome(){
    ensureDom();const root=shell();
    const apps=window.frontierApps?.({surface:'phone'})||[];
    root.querySelector('[data-os-grid]').innerHTML=apps.map(appButton).join('');
    root.querySelector('[data-os-time]').textContent=timeText();
    root.querySelector('[data-os-build]').textContent=window.frontierDiagnostics?.().build?.buildId||'local';
  }
  function showToast(message){
    ensureDom();const el=shell().querySelector('.frontieros-phone-toast');el.textContent=message;el.hidden=false;
    clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>{el.hidden=true},3200);
  }
  function applyView(){
    ensureDom();const home=state.active&&state.view==='home';const open=state.active&&state.view==='app';
    shell().hidden=!home;appbar().hidden=!open;
    document.documentElement.classList.toggle('frontieros-mobile-home',home);
    document.documentElement.classList.toggle('frontieros-mobile-app-open',open);
    if(open){const app=window.frontierApp?.(state.currentApp);appbar().querySelector('[data-os-app-title]').textContent=app?.label||'FrontierOS'}
  }
  function openHome(){
    if(!state.active)return false;state.view='home';state.currentApp=null;refreshHome();applyView();scrollTo(0,0);
    window.frontierEmitEvent?.('os.mobile.home.opened',{appCount:(window.frontierApps?.({surface:'phone'})||[]).length},{source:'mobile-frontieros'});return true;
  }
  async function openApp(id,options={}){
    const app=window.frontierApp?.(id);
    if(!app){showToast('Unknown application.');return {ok:false,status:'unknown'};}
    if(app.launchState!=='ready'){
      const msg=app.launchState==='planned'?`${app.label} is coming in a later FrontierOS phase.`:`${app.label} is locked${app.lockReason?`: ${app.lockReason}`:'.'}`;
      showToast(msg);window.frontierEmitEvent?.('os.mobile.app.blocked',{appId:app.id,status:app.launchState,reason:app.lockReason},{source:'mobile-frontieros'});return {ok:false,status:app.launchState};
    }
    const payload=options.payload||((options.detail!=null)?{detail:options.detail}:{});
    const result=await window.frontierLaunchApp?.(app.id,{surface:'phone',source:options.source||'mobile-frontieros',payload,correlationId:options.correlationId});
    if(result?.ok){state.view='app';state.currentApp=app.id;applyView();scrollTo(0,0);window.frontierEmitEvent?.('os.mobile.app.opened',{appId:app.id,via:result.via,detail:payload.detail??null},{source:'mobile-frontieros'});}else showToast(`${app.label} could not be opened.`);
    return result;
  }
  function activate(force=false){
    if(state.active)return true;if(!force&&!isPhone())return false;
    state.active=true;ensureDom();openHome();document.documentElement.dataset.frontierOsSurface='phone';
    window.frontierEmitEvent?.('os.mobile.shell.ready',{surface:'phone',viewport:{width:innerWidth,height:innerHeight}},{source:'mobile-frontieros'});return true;
  }
  function deactivate(){state.active=false;state.view='legacy';state.currentApp=null;applyView();document.documentElement.removeAttribute('data-frontier-os-surface');return true}
  function snapshot(){return {schemaVersion:1,active:state.active,view:state.view,currentApp:state.currentApp,phone:isPhone(),apps:(window.frontierApps?.({surface:'phone'})||[]).map(x=>({id:x.id,state:x.launchState,badge:x.badge}))}}
  window.frontierMobileHomeOpen=openHome;
  window.frontierMobileAppOpen=openApp;
  window.frontierMobileShellActivate=()=>activate(true);
  window.frontierMobileShellDeactivate=deactivate;
  window.frontierMobileShellSnapshot=snapshot;
  addEventListener('resize',()=>{if(state.active){refreshHome();applyView()}else activate(false)});
  addEventListener('frontier:state-saved',()=>{if(state.active&&state.view==='home')refreshHome()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>activate(false));else queueMicrotask(()=>activate(false));
})();