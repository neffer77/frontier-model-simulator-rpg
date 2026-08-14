(function(){
  let installEvent=null;
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installEvent=event;document.documentElement.classList.add('pwa-installable');window.dispatchEvent(new CustomEvent('frontier-installable'))});
  window.frontierInstallApp=async function(){if(!installEvent)return false;installEvent.prompt();const result=await installEvent.userChoice;installEvent=null;document.documentElement.classList.remove('pwa-installable');return result.outcome==='accepted'};
  window.addEventListener('appinstalled',()=>{installEvent=null;document.documentElement.classList.remove('pwa-installable')});
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(err=>console.warn('Service worker registration failed',err)));
})();