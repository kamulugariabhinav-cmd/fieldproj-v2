(() => {
  if (!('IntersectionObserver' in window)) return;
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if (!entry.isIntersecting) return;
      const text=entry.target;
      observer.unobserve(text);
      if (text.contains(document.activeElement)) return;
      text.classList.add('text-scroll-enter');
      text.addEventListener('animationend',()=>text.classList.remove('text-scroll-enter'),{once:true});
    });
  },{threshold:.15});
  document.querySelectorAll([
    '.hero-copy>h1','.hero-copy>p:not(.eyebrow)',
    '.section-heading>h2','.section-heading>p:not(.eyebrow)',
    '.listen-inner>div:first-child>h2','.listen-inner>div:first-child>p:not(.eyebrow)',
    '.intro h1','.intro p','.page-header>h1','.page-header>p',
    '.support-page main>h1','.support-page main>h2','.support-page main>p'
  ].join(',')).forEach(text=>observer.observe(text));
})();
