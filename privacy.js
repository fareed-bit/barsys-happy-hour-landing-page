/* V3.9 storage preferences. Ordinary artwork is not consent-gated. No analytics, ad tags or consent platform installed.
   Only named first-party keys are touched. A denial never clears unrelated storage. */
(() => {
  'use strict';
  const KEY='barsys-privacy-v38', MOTION='barsys-v2-motion';
  const DRAFT=window.BARSYS.storageKey;
  const LEGACY=['barsys-local-draft-v36'];
  const DAY=86400000;
  let prefs={version:1,rememberSelections:false,decided:false};
  let storageAvailable=true;
  try {
    const saved=JSON.parse(localStorage.getItem(KEY)||'null');
    if(saved?.version===1 && saved.expiresAt>Date.now()) prefs={...prefs,rememberSelections:saved.rememberSelections===true,decided:saved.decided===true};
    else if(saved) localStorage.removeItem(KEY);
    LEGACY.forEach(k=>localStorage.removeItem(k));
    if(!prefs.rememberSelections) localStorage.removeItem(DRAFT);
  } catch(_){storageAvailable=false;}
  const $=s=>document.querySelector(s);
  let lastFocus=null;
  function write(){
    try { localStorage.setItem(KEY,JSON.stringify({...prefs,updatedAt:Date.now(),expiresAt:Date.now()+180*DAY})); }
    catch(_){storageAvailable=false;}
  }
  function sync(){
    const panel=$('#privacy-dialog');if(!panel)return;
    $('#pref-save').checked=!!prefs.rememberSelections;
    $('#privacy-device-status').textContent=storageAvailable?'Your preference decision is saved on this device for up to 180 days.':'Browser storage is unavailable. Choices apply to this open tab only.';
    const notice=$('#privacy-notice');if(notice)notice.hidden=!!prefs.decided;
    const inline=$('#quick-remember');if(inline)inline.checked=!!prefs.rememberSelections;
    const launch=$('#preferences-state');if(launch)launch.textContent=prefs.decided?'Manage your preferences':'Choose your preferences';
  }
  function save(values){
    prefs={...prefs,rememberSelections:values.rememberSelections===true,decided:true};
    if(!prefs.rememberSelections)try{localStorage.removeItem(DRAFT);}catch(_){}
    write();sync();
    document.dispatchEvent(new CustomEvent('barsys:privacy',{detail:{...prefs}}));
  }
  function open(){
    lastFocus=document.activeElement;sync();$('#privacy-dialog').showModal();$('#privacy-title').focus({preventScroll:true});
  }
  function clearSaved(){
    try {[KEY,DRAFT,MOTION,...LEGACY].forEach(k=>localStorage.removeItem(k));}catch(_){}
    prefs={version:1,rememberSelections:false,decided:false};sync();
    document.dispatchEvent(new CustomEvent('barsys:privacy',{detail:{...prefs}}));
    $('#privacy-feedback').textContent='Saved choices cleared. Your open plan stays in this tab.';
  }
  window.BarsysPrivacy=Object.freeze({
    can:k=>prefs[k]===true,
    get:()=>({...prefs,storageAvailable}),
    save,open,clearSaved,
    loadDraft(){
      if(!prefs.rememberSelections)return null;
      try {const d=JSON.parse(localStorage.getItem(DRAFT)||'null');if(d?.version===3&&d.expiresAt>Date.now())return d;localStorage.removeItem(DRAFT);}catch(_){}
      return null;
    },
    saveDraft(data){
      if(!prefs.rememberSelections)return;
      // Whitelist excludes contact, date, address, budget, ingredient notes and permissions.
      const keys=['type','guests','tier','menus','menuMode','addons','program','frequency','commitment','billing','beverage','serviceHours'];
      const safe=Object.fromEntries(keys.map(k=>[k,data[k]]));
      try{localStorage.setItem(DRAFT,JSON.stringify({version:3,savedAt:Date.now(),expiresAt:Date.now()+30*DAY,...safe}));}catch(_){storageAvailable=false;}
    }
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('button,a');if(!b)return;
    if(b.hasAttribute('data-open-privacy')){e.preventDefault();open();}
    if(b.id==='privacy-local-only'){save({});}
    if(b.id==='privacy-reject'){save({});$('#privacy-dialog').close();}
    if(b.id==='privacy-save'){save({rememberSelections:$('#pref-save').checked});$('#privacy-dialog').close();}
    if(b.id==='privacy-close')$('#privacy-dialog').close();
    if(b.id==='privacy-clear')clearSaved();
  });
  document.addEventListener('change',e=>{if(e.target?.id==='quick-remember')save({rememberSelections:e.target.checked});});
  $('#privacy-dialog').addEventListener('close',()=>{if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});});
  $('#privacy-dialog').addEventListener('click',e=>{const d=e.currentTarget,r=d.getBoundingClientRect();if(e.target===d&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))d.close();});
  // Cross-tab withdrawal: refresh only the named preference record.
  window.addEventListener('storage',e=>{
    if(e.key!==KEY&&e.key!==null)return;
    try{const p=JSON.parse(e.newValue||'null');prefs=p?.version===1&&p.expiresAt>Date.now()?{version:1,rememberSelections:p.rememberSelections===true,decided:p.decided===true}:{version:1,rememberSelections:false,decided:false};}catch(_){return;}
    if(!prefs.rememberSelections)try{localStorage.removeItem(DRAFT);}catch(_){}
    sync();document.dispatchEvent(new CustomEvent('barsys:privacy',{detail:{...prefs}}));
  });
  sync();
})();
