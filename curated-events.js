/* V3.7: the photo rail has its own controls; the event-film rail is untouched. */
(() => {
 'use strict';
 const rail=document.getElementById('snapshot-rail');
 if(!rail)return;
 const section=document.getElementById('event-photos');
 const cards=[...rail.querySelectorAll('.snapshot-card')];
 const prev=section.querySelector('[data-snapshot-scroll="-1"]');
 const next=section.querySelector('[data-snapshot-scroll="1"]');
 const count=document.getElementById('snapshot-count');
 let frame=0,start=null,dragged=false;
 const motion=()=>document.documentElement.dataset.motion!=='off';
 function update(){
  const max=rail.scrollWidth-rail.clientWidth;
  prev.disabled=rail.scrollLeft<=2;next.disabled=max<=2||rail.scrollLeft>=max-2;
  const rect=rail.getBoundingClientRect();
  const seen=cards.map((card,i)=>({i,r:card.getBoundingClientRect()})).filter(({r})=>r.left<rect.right-12&&r.right>rect.left+12);
  count.textContent=seen.length?`${seen[0].i+1}\u2013${seen.at(-1).i+1} of ${cards.length}`:`${cards.length} photographs`;
 }
 function step(direction){
  const card=cards[0].getBoundingClientRect();
  const gap=parseFloat(getComputedStyle(rail).columnGap)||0;
  const stride=card.width+gap;
  const page=Math.max(1,Math.floor((rail.clientWidth+gap)/stride));
  rail.scrollBy({left:direction*stride*page,behavior:motion()?'smooth':'instant'});
 }
 prev.addEventListener('click',()=>step(-1));next.addEventListener('click',()=>step(1));
 rail.addEventListener('keydown',e=>{
  if(e.target!==rail)return;
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();step(e.key==='ArrowRight'?1:-1);}
  if(e.key==='Home'||e.key==='End'){e.preventDefault();rail.scrollTo({left:e.key==='Home'?0:rail.scrollWidth,behavior:motion()?'smooth':'instant'});}
 });
 rail.addEventListener('scroll',()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;update();});},{passive:true});
 rail.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='mouse'||e.button!==0)return;
  start={x:e.clientX,left:rail.scrollLeft};dragged=false;
 });
 rail.addEventListener('pointermove',e=>{
  if(!start)return;
  const dx=e.clientX-start.x;
  if(Math.abs(dx)>8)dragged=true;
  if(dragged){rail.classList.add('dragging');rail.scrollLeft=start.left-dx;e.preventDefault();}
 });
 const stop=()=>{start=null;rail.classList.remove('dragging');};
 window.addEventListener('pointerup',stop);rail.addEventListener('pointerleave',stop);
 rail.addEventListener('pointercancel',stop);rail.addEventListener('dragstart',e=>e.preventDefault());
 rail.addEventListener('click',e=>{if(dragged){e.preventDefault();e.stopImmediatePropagation();dragged=false;}},true);
 window.addEventListener('resize',update,{passive:true});
 rail.querySelectorAll('img').forEach(img=>img.addEventListener('load',update));
 update();
})();
