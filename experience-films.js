/* V3.3 / Lazy, silent, independently controlled film previews.
   The hero carousel remains owned by hero-carousel.js.
   Only visible cards load/play; all stop behind dialogs and in hidden tabs. */
(() => {
  'use strict';
  const section = document.getElementById('event-gallery');
  const rail = document.getElementById('experience-reel-rail');
  if (!section || !rail) return;
  const root = document.documentElement;
  const toggle = document.getElementById('experience-preview-toggle');
  const media = window.BARSYS_MEDIA || {};
  const videos = [...section.querySelectorAll('[data-experience-video]')];
  const buttons = [...section.querySelectorAll('[data-reel-pause]')];
  const ratios = new Map(videos.map(video => [video,0]));
  const pausedClips = new Set();
  const pending = new Set();
  let paused = false;
  let stopped = false;
  const enabled = () => root.dataset.motion !== 'off';
  const hasDialog = () => Boolean(document.querySelector('dialog[open]'));
  const eligible = video => !stopped && enabled() && !paused && !document.hidden && !hasDialog() && !pausedClips.has(video.dataset.experienceVideo) && ratios.get(video) >= .12;

  function syncButtons() {
    const on = enabled();
    toggle.disabled = !on;
    toggle.setAttribute('aria-pressed',String(paused || !on));
    toggle.querySelector('span').textContent = !on ? 'Motion is off' : paused ? 'Resume autoplay' : 'Pause autoplay';
    toggle.setAttribute('aria-label',!on ? 'Previews paused by page motion settings' : paused ? 'Play event previews' : 'Pause event previews');
    toggle.querySelector('use').setAttribute('href',paused || !on ? '#i-play' : '#i-pause');
    buttons.forEach(button => {
      const key = button.dataset.reelPause;
      const video = videos.find(v => v.dataset.experienceVideo === key);
      const isPaused = paused || !on || pausedClips.has(key) || video?.paused;
      button.disabled = !on;
      button.setAttribute('aria-pressed',String(isPaused));
      button.setAttribute('aria-label',`${isPaused ? 'Play' : 'Pause'} ${media[key]?.title || 'event'} preview`);
      button.querySelector('use').setAttribute('href',isPaused ? '#i-play' : '#i-pause');
    });
  }
  function sync() {
    videos.forEach(video => {
      if (!eligible(video)) { video.pause(); return; }
      const clip = media[video.dataset.experienceVideo];
      if (!clip?.src) return;
      if (!video.getAttribute('src')) { video.poster = clip.poster; video.src = clip.previewSrc || clip.src; }
      video.muted = true; video.defaultMuted = true; video.playsInline = true; video.loop = true;
      if (video.paused && !pending.has(video)) {
        pending.add(video);
        let retryInterrupted = false;
        const playing = video.play();
        playing?.then(() => { if (!eligible(video)) video.pause(); }).catch(error => {
          // Scrolling or opening a dialog can intentionally interrupt a pending play.
          // Do not turn that interruption into a persistent user-pause preference.
          retryInterrupted = error.name === 'AbortError';
          if (!retryInterrupted) {
            pausedClips.add(video.dataset.experienceVideo);
            video.dataset.playError = error.name;
            syncButtons();
          }
        }).finally(() => {
          pending.delete(video);
          if (retryInterrupted && eligible(video)) setTimeout(sync,50);
        });
      }
    });
    syncButtons();
  }
  videos.forEach(video => {
    video.addEventListener('playing',() => { video.classList.add('ready'); syncButtons(); });
    video.addEventListener('pause',syncButtons);
    video.addEventListener('error',() => { video.classList.remove('ready'); pausedClips.add(video.dataset.experienceVideo); syncButtons(); });
  });
  toggle.addEventListener('click',() => {
    paused = !paused;
    if (!paused) pausedClips.clear();
    sync();
  });
  buttons.forEach(button => button.addEventListener('click',() => {
    const key = button.dataset.reelPause;
    if (paused) {
      // A local Play does not restart the other three cards.
      paused = false;
      videos.forEach(video => pausedClips.add(video.dataset.experienceVideo));
      pausedClips.delete(key);
    } else if (pausedClips.has(key) || videos.find(v => v.dataset.experienceVideo === key)?.paused) pausedClips.delete(key);
    else pausedClips.add(key);
    sync();
  }));
  const measure = () => {
    const bounds = rail.getBoundingClientRect();
    videos.forEach(video => {
      const box = video.getBoundingClientRect();
      const width = Math.max(0,Math.min(box.right,bounds.right,innerWidth)-Math.max(box.left,bounds.left,0));
      const height = Math.max(0,Math.min(box.bottom,innerHeight)-Math.max(box.top,0));
      ratios.set(video,box.width*box.height ? width*height/(box.width*box.height) : 0);
    });
    sync();
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { entries.forEach(entry => ratios.set(entry.target,entry.intersectionRatio)); sync(); },{threshold:[0,.05,.12,.45,.75,1]});
    videos.forEach(video => observer.observe(video));
  } else {
    window.addEventListener('scroll',measure,{passive:true});
    rail.addEventListener('scroll',measure,{passive:true});
    measure();
  }
  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['data-motion']});
  const dialogs = new MutationObserver(sync);
  document.querySelectorAll('dialog').forEach(dialog => dialogs.observe(dialog,{attributes:true,attributeFilter:['open']}));
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('resize',measure,{passive:true});
  window.addEventListener('pagehide',() => { stopped = true; videos.forEach(video => video.pause()); });
  window.addEventListener('pageshow',() => { stopped = false; measure(); });
  rail.addEventListener('keydown',event => {
    if (event.target !== rail || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? '1' : '-1';
    section.querySelector(`[data-photo-scroll="${direction}"]`)?.click();
  });
  // Stable introspection used by the included local smoke test. No analytics or network calls.
  window.BarsysExperience = Object.freeze({
    state: () => ({paused,motion:enabled(),clips:videos.map(video => ({key:video.dataset.experienceVideo,paused:video.paused,loaded:Boolean(video.getAttribute('src')),ready:video.readyState,time:video.currentTime,visible:ratios.get(video),error:video.error?.message || video.dataset.playError || null,userPaused:pausedClips.has(video.dataset.experienceVideo)}))})
  });
  sync();
})();
