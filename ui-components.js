(function(){
  class LabObjectiveCard extends HTMLElement{
    connectedCallback(){this.render()}
    static get observedAttributes(){return ['kicker','title','body','cta','action','tone']}
    attributeChangedCallback(){if(this.isConnected)this.render()}
    render(){
      const kicker=this.getAttribute('kicker')||'NEXT MOVE',title=this.getAttribute('title')||'',body=this.getAttribute('body')||'',cta=this.getAttribute('cta')||'Continue',action=this.getAttribute('action')||'';
      this.className=`lab-objective-card ${this.getAttribute('tone')||'normal'}`;
      this.innerHTML=`<small>${kicker}</small><strong>${title}</strong><p>${body}</p><button type="button">${cta} →</button>`;
      this.querySelector('button').onclick=()=>{if(action&&typeof window[action]==='function')window[action]()};
    }
  }
  class LabDisclosure extends HTMLElement{
    connectedCallback(){
      if(this.dataset.ready)return;this.dataset.ready='1';
      const label=this.getAttribute('label')||'Details',open=this.hasAttribute('open');
      this.innerHTML=`<button class="lab-disclosure-toggle" type="button" aria-expanded="${open}"><span>${label}</span><i>${open?'−':'+'}</i></button><div class="lab-disclosure-body" ${open?'':'hidden'}></div>`;
      const body=this.querySelector('.lab-disclosure-body');
      for(const n of [...this.childNodes].filter(n=>n!==this.firstChild&&n!==body))body.appendChild(n);
      this.querySelector('.lab-disclosure-toggle').onclick=()=>{const hidden=body.hasAttribute('hidden');body.toggleAttribute('hidden',!hidden);this.querySelector('button').setAttribute('aria-expanded',String(hidden));this.querySelector('i').textContent=hidden?'−':'+'};
    }
  }
  class LabInstallPrompt extends HTMLElement{
    connectedCallback(){this.innerHTML=`<div><span>INSTALL FRONTIER LAB</span><b>Launch like an app</b><p>Install this web game for a standalone home-screen experience.</p></div><button type="button">Install</button>`;this.querySelector('button').onclick=()=>window.frontierInstallApp?.();}
  }
  if(!customElements.get('lab-objective-card'))customElements.define('lab-objective-card',LabObjectiveCard);
  if(!customElements.get('lab-disclosure'))customElements.define('lab-disclosure',LabDisclosure);
  if(!customElements.get('lab-install-prompt'))customElements.define('lab-install-prompt',LabInstallPrompt);
})();