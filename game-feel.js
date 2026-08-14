// Item 8 — lightweight game-feel runtime. No external audio/assets required.
(function(){
 const g=window;let lastStage,lastProgress=-1,toastTimer;
 function haptic(ms=10){try{navigator.vibrate?.(ms)}catch{}}
 function toast(kicker,text,tone=''){
   document.querySelector('.feel-toast')?.remove();const el=document.createElement('div');el.className=`feel-toast ${tone}`;el.innerHTML=`<b>${kicker}</b><span>${text}</span>`;document.body.appendChild(el);clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.remove(),2200)
 }
 function milestone(title,body){
   if(document.querySelector('.feel-milestone'))return;haptic([20,35,30]);const el=document.createElement('div');el.className='feel-milestone';el.innerHTML=`<div class="feel-milestone-card"><div class="eyebrow">MILESTONE</div><h2>${title}</h2><p>${body}</p><button>Continue</button></div>`;el.querySelector('button').onclick=()=>el.remove();document.body.appendChild(el)
 }
 g.gameFeelToast=toast;g.gameFeelMilestone=milestone;
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;haptic(8)},true);
 function decorateRun(){const r=state?.activeRun;if(!r)return;const host=document.querySelector('.gameplay-guidance');if(!host||host.querySelector('.feel-training'))return;const p=Math.max(0,Math.min(100,Number(r.progress||0)));const bar=document.createElement('div');bar.className='feel-training';bar.setAttribute('aria-label',`Training progress ${Math.round(p)}%`);bar.innerHTML=`<i style="width:${p}%"></i>`;host.appendChild(bar)}
 function observe(){
   if(!state?.started)return;const stage=g.campaignCurrentStage?.();if(stage&&lastStage&&stage.id!==lastStage){const messages={failure:['Something broke','The lab has its first real incident. Read the evidence before you react.'],firstModel:['MODEL SHIPPED','Your first model now exists as a real artifact with history and consequences.'],firstHire:['THE LAB IS GROWING','You can now turn a technical bottleneck into an organizational decision.'],tradeoff:['COMPANY INFLECTION POINT','The lab is becoming a company. Your next choice changes what it optimizes for.'],graduated:['EARLY GAME COMPLETE','The full frontier-model company simulator is now open.']};const m=messages[stage.id];if(m)milestone(m[0],m[1])}if(stage)lastStage=stage.id;
   const p=Number(state.activeRun?.progress??-1);if(p>=0&&p!==lastProgress){if(lastProgress>=0&&Math.floor(p/25)>Math.floor(lastProgress/25))toast('TRAINING RUN',`${Math.round(p)}% complete`);lastProgress=p}decorateRun()
 }
 const base=g.render;if(typeof base==='function')g.render=function(){const out=base();requestAnimationFrame(observe);return out};requestAnimationFrame(observe)
})();