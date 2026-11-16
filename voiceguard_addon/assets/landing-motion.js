/* GSAP owns landing motion; the signal renderer continues to own its canvas. */
(() => {
  const {gsap,ScrollTrigger}=window;
  const root=document.body;
  if(!gsap||!ScrollTrigger||!document.getElementById('heroTitle'))return;
  gsap.registerPlugin(ScrollTrigger);
  let scope=null,media=null;
  const refresh=()=>{if(scope)ScrollTrigger.refresh();};
  function setup(){
    if(scope)return;
    try{
      scope=gsap.context(()=>{},root);
      scope.add(()=>{
        media=gsap.matchMedia();
        media.add({desktop:'(min-width: 761px)',mobile:'(max-width: 760px)',reduce:'(prefers-reduced-motion: reduce)'},context=>{
          const {mobile,reduce}=context.conditions;
          const distance=reduce?0:mobile?22:48;
          const duration=reduce?.28:mobile?.65:.95;
          const defaults={duration,ease:'power3.out',immediateRender:false,clearProps:'transform,opacity,visibility'};
          const select=gsap.utils.selector(root);
          const enter=(extra={})=>({opacity:0,y:distance,...extra,...defaults});
          const hero=gsap.timeline({defaults});
          hero.from('.hero-copy>.eyebrow',enter({y:distance*.5}),0)
            .from('#heroTitle',{...enter({rotationX:reduce?0:12,transformPerspective:900,transformOrigin:'50% 100%'}),ease:reduce?'power1.out':'bounce.out',duration:reduce?.28:1.2},reduce?0:.1)
            .from('.hero-description',enter(),reduce?0:.22)
            .from('.hero .hero-actions>*',enter({stagger:reduce?0:.09}),reduce?0:.34)
            .from('.hero-note',enter({y:distance*.5}),reduce?0:.45)
            .from('.hero-art',{...defaults,opacity:0,scale:reduce?1:.94},reduce?0:.12);
          const reveal=(trigger,targets,stagger=.1)=>{
            if(!targets.length)return;
            gsap.from(targets,{...enter(),stagger:reduce?0:mobile?.06:stagger,
              scrollTrigger:{trigger,start:mobile?'top 92%':'top 86%',once:true,invalidateOnRefresh:true}});
          };
          reveal('.facts',select('.facts>strong'),.09);
          select('main>section:not(.hero)').forEach(section=>{
            reveal(section,[...section.querySelectorAll('.section-heading>*:not(h2)')],.1);
            const cards=[...section.querySelectorAll('.capability,.workflow-steps>li,.overview-card,.research-grid>*,.faq-list>details')];
            reveal(cards[0]||section,cards,.13);
          });
          reveal('.listen-inner',select('.listen-inner>div:first-child>p'),.1);
          reveal('.listening-demo',select('.listening-demo'),0);
          reveal('.model-explorer',select('.model-options>button,.model-panel'),.08);
          reveal('.workflow-preview',select('.workflow-preview'),0);
          reveal('.closing',select('.closing>.eyebrow,.closing .hero-actions>*'),.12);
          select('.section-heading>h2,.listen-inner>div:first-child>h2,.closing>h2,.project-overview>h2,.research-section>h2').forEach(heading=>{
            gsap.from(heading,{...defaults,opacity:0,y:reduce?0:mobile?26:52,
              ease:reduce?'power1.out':'bounce.out',duration:reduce?.28:mobile?1:1.25,
              scrollTrigger:{trigger:heading,start:'top 88%',toggleActions:'restart none none restart',invalidateOnRefresh:true}});
          });
          reveal('.expanded-footer',select('.footer-columns>div'),.1);
          reveal('.footer-wordmark',select('.footer-wordmark'),0);
          const steps=select('.workflow-steps')[0];
          if(steps){
            if(mobile||reduce)gsap.set(steps,{'--workflow-progress':1});
            else gsap.fromTo(steps,{'--workflow-progress':0},{'--workflow-progress':1,ease:'none',
              scrollTrigger:{trigger:steps,start:'top 80%',end:'bottom 45%',scrub:.6,invalidateOnRefresh:true}});
          }
          if(!mobile&&!reduce)gsap.to('#heroSignal',{y:()=>-Math.min(42,innerHeight*.05),ease:'none',
            scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:.8,invalidateOnRefresh:true}});
        });
      });
      refresh();
    }catch(error){
      media?.revert();scope?.revert();scope=null;media=null;
      console.warn('Landing motion unavailable; content remains accessible.',error);
    }
  }
  setup();
  document.fonts?.ready.then(refresh);
  window.addEventListener('load',refresh,{once:true});
  window.addEventListener('pagehide',()=>{media?.revert();scope?.revert();media=null;scope=null;});
  window.addEventListener('pageshow',event=>{if(event.persisted)setup();});
})();
