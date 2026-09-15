/* Engagement toast: a real count of teams that planned a happy hour with us this month.
   Connected builds only; reads a public count endpoint; shows once per page load; nothing stored. */
(()=>{'use strict';
 if(!window.BARSYS_RUNTIME||!/^https?:$/.test(location.protocol))return;
 const MIN=3,SHOW_AFTER=6000,HIDE_AFTER=14000;
 async function run(){
  let data;try{const r=await fetch('/api/pulse',{signal:AbortSignal.timeout(6000)});if(!r.ok)return;data=await r.json();}catch{return;}
  const n=Number(data?.teamsThisMonth||0);if(!Number.isFinite(n)||n<MIN)return;
  if(document.querySelector('dialog[open]')||document.body.classList.contains('planner-focus'))return;
  const el=document.createElement('aside');el.className='pulse-toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
  const month=new Date().toLocaleDateString('en-US',{month:'long'});
  el.innerHTML=`<span class="pulse-dot" aria-hidden="true"></span><p><strong>${n} NYC teams</strong> planned a happy hour with us in ${month}.</p><a class="pulse-cta" href="#proposal">Plan yours</a><button type="button" class="pulse-close" aria-label="Dismiss">×</button>`;
  document.body.append(el);requestAnimationFrame(()=>el.classList.add('is-visible'));
  const close=()=>{el.classList.remove('is-visible');setTimeout(()=>el.remove(),400);};
  el.querySelector('.pulse-close').addEventListener('click',close);el.querySelector('.pulse-cta').addEventListener('click',close);
  setTimeout(close,HIDE_AFTER);
 }
 setTimeout(run,SHOW_AFTER);
})();
