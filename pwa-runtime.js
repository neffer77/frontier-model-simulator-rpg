(function(){
  let installEvent=null;
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installEvent=event;document.documentElement.classList.add('pwa-installable');window.dispatchEvent(new CustomEvent('frontier-installable'))});
  if(isiOS&&!standalone)document.documentElement.classList.add('pwa-installable','pwa-ios-manual');
  window.frontierInstallApp=async function(){
    if(installEvent){installEvent.prompt();const result=await installEvent.userChoice;installEvent=null;document.documentElement.classList.remove('pwa-installable');return result.outcome==='accepted'}
    if(isiOS&&!standalone){alert('On iPhone/iPad: tap the Share button in Safari, then choose “Add to Home Screen” to install Frontier Lab.');return true}
    return false;
  };
  window.addEventListener('appinstalled',()=>{installEvent=null;document.documentElement.classList.remove('pwa-installable','pwa-ios-manual')});
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(err=>console.warn('Service worker registration failed',err)));
})();