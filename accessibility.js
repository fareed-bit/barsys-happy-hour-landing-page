/* Local accessibility enhancements; no tracking or persistent state. */
(() => {
  const collectionDialog=document.querySelector('#collection-dialog');
  collectionDialog?.addEventListener('keydown',event=>{
    if(event.key!=='Tab'||!collectionDialog.open)return;
    const controls=[...collectionDialog.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')]
      .filter(el=>el.tabIndex>=0&&!el.disabled&&!el.closest('[inert]')&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
    const first=controls[0],last=controls.at(-1);
    if(!first)return;
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  const section=document.querySelector('#event-photos .container');
  if(section&&window.BARSYS_MEDIA){
    const details=document.createElement('details');details.className='video-descriptions';details.id='video-descriptions';
    const summary=document.createElement('summary');summary.textContent='Read descriptions of the event films';details.append(summary);
    for(const film of Object.values(window.BARSYS_MEDIA)){if(!film.src||!film.description)continue;const h=document.createElement('h3');h.textContent=film.title;const p=document.createElement('p');p.textContent=film.description;details.append(h,p);}
    section.append(details);
  }
  document.addEventListener('input',event=>{const f=event.target;if(!f.matches('input,select,textarea'))return;const ids=(f.getAttribute('aria-describedby')||'').split(' ').filter(x=>x&&x!=='quick-error'&&x!=='form-error');if(ids.length)f.setAttribute('aria-describedby',ids.join(' '));else f.removeAttribute('aria-describedby');});
})();
