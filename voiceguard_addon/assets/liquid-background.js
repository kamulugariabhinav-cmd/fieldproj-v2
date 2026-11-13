/* Decorative liquid field. No microphone, networking, or user data access. */
(() => {
  const canvas=document.getElementById('liquidBackdrop');
  if(!canvas)return;
  // Position before assigning intrinsic canvas dimensions, even with stale CSS.
  Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',display:'block',zIndex:'0',pointerEvents:'none'});
  const context=canvas.getContext('2d');if(!context)return;
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  let width=0,height=0,frame=0,last=0,time=0,targetX=.5,targetY=.5,x=.5,y=.5,scroll=0,targetScroll=0;
  const colors=['0,224,238','110,80,205','255,45,170'];
  function draw(){
    context.clearRect(0,0,width,height);
    for(let i=0;i<3;i++){
      const phase=time*.3+i*2.1+scroll*.7;
      const cx=width*(.17+i*.33+Math.sin(phase)*.15+(x-.5)*.1);
      const cy=height*(.38+Math.cos(phase*.8+i)*.24+(y-.5)*.08);
      const radius=Math.max(width,height)*(.37+Math.sin(phase*.6)*.035);
      const gradient=context.createRadialGradient(cx,cy,0,cx,cy,radius);
      gradient.addColorStop(0,`rgba(${colors[i]},.34)`);
      gradient.addColorStop(.45,`rgba(${colors[i]},.14)`);
      gradient.addColorStop(1,`rgba(${colors[i]},0)`);
      context.fillStyle=gradient;context.fillRect(0,0,width,height);
    }
    // Layered filled currents form a fluid surface instead of rigid stripes.
    for(let layer=0;layer<7;layer++){
      context.beginPath();
      for(let step=0;step<=60;step++){
        const px=step/60*width;
        const py=height*(.16+layer*.12)+Math.sin(step/60*6+time*.38+layer*.48+scroll)*height*.13
          +Math.cos(step/60*3-time*.25+layer)*height*.08+(y-.5)*height*.1;
        if(step===0)context.moveTo(px,py);else context.lineTo(px,py);
      }
      context.strokeStyle=`rgba(${colors[layer%3]},.07)`;context.lineWidth=1;context.stroke();
      context.lineTo(width,height);context.lineTo(0,height);context.closePath();
      const sheen=context.createLinearGradient(0,0,width,height);
      sheen.addColorStop(0,`rgba(${colors[layer%3]},.035)`);
      sheen.addColorStop(.5,`rgba(${colors[(layer+1)%3]},.055)`);
      sheen.addColorStop(1,`rgba(${colors[layer%3]},0)`);
      context.fillStyle=sheen;context.fill();
    }
  }
  function resize(){
    // Soft gradients need few pixels; cap work even on large retina screens.
    const scale=Math.min(1,900/innerWidth);
    width=Math.round(innerWidth*scale);height=Math.round(innerHeight*scale);
    canvas.width=width;canvas.height=height;draw();
  }
  function animate(now){
    frame=requestAnimationFrame(animate);
    if(now-last<40)return;
    const delta=Math.min((now-last)/1000,.08);last=now;
    time+=delta;x+=(targetX-x)*.035;y+=(targetY-y)*.035;scroll+=(targetScroll-scroll)*.04;draw();
  }
  function sync(){cancelAnimationFrame(frame);frame=0;last=performance.now();if(!preference.matches&&!document.hidden)frame=requestAnimationFrame(animate);else draw();}
  window.addEventListener('pointermove',event=>{targetX=event.clientX/innerWidth;targetY=event.clientY/innerHeight;},{passive:true});
  window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('scroll',()=>{targetScroll=window.scrollY/Math.max(1,innerHeight);},{passive:true});
  preference.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',()=>cancelAnimationFrame(frame),{once:true});
  window.addEventListener('pageshow',sync);
  resize();sync();
})();
