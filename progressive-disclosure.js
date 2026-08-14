(function(){
  const mobile=()=>matchMedia('(max-width: 720px)').matches;
  const denseViews=new Set(['hiring','workforce','policy','modelLab','dataEvals','portfolio','criticalPath','program','programLearning','portfolioStrategy','investmentCommittee','competitive','ecosystem','communications','governance','financeStrategy','slo','releaseGov','roadmapPressure']);
  const stateKey=()=>`frontier-disclosure:${state?.view||'unknown'}`;
  function saved(){try{return JSON.parse(sessionStorage.getItem(stateKey())||'{}')}catch{return {}}}
  function persist(map){try{sessionStorage.setItem(stateKey(),JSON.stringify(map))}catch{}}
  function titleFor(section,i){return section.querySelector('h1,h2,h3')?.textContent?.trim()||section.querySelector('.eyebrow')?.textContent?.trim()||`Section ${i+1}`}
  function decorate(){
    if(!mobile()||!state?.started||!denseViews.has(state.view))return;
    const app=document.getElementById('app');if(!app)return;
    const root=[...app.children].find(x=>!x.classList.contains('gameplay-guidance'))||app;
    const candidates=[...root.querySelectorAll(':scope > section, :scope > div > section')].filter(s=>!s.closest('.gameplay-guidance')&&!s.classList.contains('pd-enhanced'));
    const memory=saved();
    candidates.forEach((section,i)=>{
      if(i===0)return;
      section.classList.add('pd-enhanced');
      const key=`${i}:${titleFor(section,i)}`;
      const open=memory[key]??(i<2);
      section.classList.toggle('pd-collapsed',!open);
      const btn=document.createElement('button');btn.type='button';btn.className='pd-toggle';btn.setAttribute('aria-expanded',String(open));btn.innerHTML=`<span>${open?'Hide':'Show'} ${titleFor(section,i)}</span><i>${open?'−':'+'}</i>`;
      btn.onclick=()=>{const now=section.classList.toggle('pd-collapsed');btn.setAttribute('aria-expanded',String(!now));btn.querySelector('span').textContent=`${now?'Show':'Hide'} ${titleFor(section,i)}`;btn.querySelector('i').textContent=now?'+':'−';memory[key]=!now;persist(memory)};
      section.insertAdjacentElement('afterbegin',btn);
    });
  }
  const base=window.render;
  if(typeof base==='function')window.render=function(){const out=base();requestAnimationFrame(()=>requestAnimationFrame(decorate));return out};
  addEventListener('resize',()=>requestAnimationFrame(decorate));
  requestAnimationFrame(decorate);
})();