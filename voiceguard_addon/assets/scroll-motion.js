(() => {
  if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
  const running=new Map();
  const targets=document.querySelectorAll([
    '.hero-copy>h1','.hero-copy>p','.hero-copy>.eyebrow','.hero-actions',
    '.intro h1','.intro p','.intro .eyebrow','.intro-chips',
    '.section-heading>h2','.section-heading>p','.section-heading>.eyebrow',
    '.capability','.workflow-steps>li','.facts>div','.model-explorer',
    '.listening-demo','.faq-list>details','.final-cta>h2','.final-cta>p',
    '.dashboard-grid>.panel','.settings-grid>.panel','.profile-grid>.panel',
    '.page-header>h1','.page-header>p','.history-toolbar','#resultContent',
    '.support-page main>h1','.support-page main>h2','.support-page main>p',
    '.page-tool','.footer-columns>div','.footer-wordmark'
  ].join(','));
  function reveal(element){
      if (running.has(element)||element.contains(document.activeElement)) return;
      const mobile=matchMedia('(max-width: 760px)').matches;
      const text=element.matches('h1,h2,h3,p,.eyebrow');
      const siblings=[...element.parentElement.children];
      const delay=Math.min(siblings.indexOf(element)%4,3)*(mobile?35:55);
      const animation=element.animate([
        {opacity:.15,translate:`0 ${mobile?14:26}px`,scale:text?'1':'.975'},
        {opacity:1,translate:'0 0',scale:'1'}
      ],{duration:mobile?420:(text?560:650),delay,easing:'cubic-bezier(.16,1,.3,1)'});
      running.set(element,animation);
      const release=()=>{if(running.get(element)===animation)running.delete(element);};
      animation.addEventListener('finish',release,{once:true});
      animation.addEventListener('cancel',release,{once:true});
  }
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting)reveal(entry.target);});
  },{threshold:.08});
  targets.forEach(element=>observer.observe(element));
  // Keep focused controls steady while scroll effects remain enabled.
  document.addEventListener('focusin',event=>{
    running.forEach((animation,element)=>{if(element.contains(event.target))animation.cancel();});
  });
})();
