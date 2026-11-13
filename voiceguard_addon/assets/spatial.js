/* Small spatial gestures; native scrolling, inputs and links retain control. */
(() => {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  document.querySelectorAll('.capability,.workflow-steps li,.listening-demo').forEach(card=>{
    card.classList.add('spatial-depth');
    card.addEventListener('pointermove',event=>{
      if(reduced.matches||!fine.matches)return;
      const box=card.getBoundingClientRect();if(!box.width||!box.height)return;
      card.style.setProperty('--tilt-x',`${(0.5-(event.clientY-box.top)/box.height)*5}deg`);
      card.style.setProperty('--tilt-y',`${((event.clientX-box.left)/box.width-0.5)*5}deg`);
    },{passive:true});
    const reset=()=>{card.style.removeProperty('--tilt-x');card.style.removeProperty('--tilt-y');};
    card.addEventListener('pointerleave',reset);card.addEventListener('focusin',reset);reduced.addEventListener('change',reset);
  });
  const hero=document.querySelector('.hero-art');let scheduled=false;
  function update(){
    scheduled=false;if(!hero)return;
    const bounds=hero.getBoundingClientRect(),progress=reduced.matches?0:Math.max(0,Math.min(1,(100-bounds.top)/Math.max(1,bounds.height)));
    hero.dataset.scrollProgress=String(progress);hero.style.setProperty('--scene-scroll',String(progress));
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  if(hero){window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});reduced.addEventListener('change',schedule);update();}
})();
