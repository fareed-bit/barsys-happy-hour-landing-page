/* Native, dependency-free mixed-media carousel.
   - Text / primary CTA do not rotate.
   - Only the active slide can play; video is always silent in the hero.
   - Manual navigation stops rotation; explicit Play resumes it.
   - Hover / keyboard focus stop rotation; dialogs, hidden tabs and scrolling
     off-screen stop video and timing. Global motion preferences are respected. */
(() => {
  'use strict';
  const hero = document.getElementById('hero-carousel');
  if (!hero) return;
  const root = document.documentElement;
  const stage = document.getElementById('carousel-stage');
  const scenes = [...hero.querySelectorAll('[data-scene]')];
  const tabs = [...hero.querySelectorAll('[data-go-scene]')];
  const toggle = document.getElementById('carousel-toggle');
  const films = window.BARSYS_MEDIA;
  const videos = [...hero.querySelectorAll('[data-carousel-video]')];
  const C = window.BARSYS;
  let index = 0, elapsed = 0, last = 0, paused = false, hovering = false;
  let userPaused = false;
  let focusHold = false, visible = false, pointerStart = null, raf = null;
  let lastPlaying = null;
  const openDialog = () => Boolean(document.querySelector('dialog[open]'));
  const permitted = () => root.dataset.motion !== 'off' && visible && !document.hidden && !openDialog() && !userPaused;
  const rotating = () => permitted() && !paused && !hovering && !focusHold;
  const active = () => scenes[index];
  const duration = () => Number(active().dataset.duration) || 6500;

  // Header, foreground player, and the optional importer use this media entry.
  // Never label an archive fallback as the live-site hero film.
  if (['live-site-import','user-provided-hero'].includes(films.hero?.sourceStatus)) {
    scenes[0].dataset.kicker = 'BARSYS / THE ORIGINAL HERO FILM';
    scenes[0].dataset.title = 'The Barsys experience.';
    scenes[0].setAttribute('aria-label', '1 of 4: Original Barsys hero film');
    tabs[0].querySelector('strong').textContent = 'The Barsys experience';
    const note = document.getElementById('hero-source-note');
    if (note) note.textContent = 'Featured video from the Barsys event archive.';
    const img = scenes[0].querySelector('.scene-poster');
    if (img && films.hero.poster) { img.src = films.hero.poster; img.alt = 'Barsys hero film'; tabs[0].querySelector('img').src = films.hero.poster; }
    if (films.hero.sourceStatus === 'user-provided-hero' && note) note.textContent = 'The featured video was supplied by the project owner as the original hero film. A local copy is included. No production site was changed.';
  }

  function updateToggle() {
    const isPaused = paused || root.dataset.motion === 'off';
    hero.classList.toggle('is-paused', isPaused);
    toggle.setAttribute('aria-pressed', String(isPaused));
    toggle.setAttribute('aria-label', isPaused ? 'Play slideshow' : 'Pause slideshow');
    toggle.querySelector('span').textContent = isPaused ? 'Play' : 'Pause';
    toggle.querySelector('use').setAttribute('href', isPaused ? '#i-play' : '#i-pause');
  }
  function syncMedia() {
    const target = active().querySelector('video');
    videos.forEach(video => {
      const shouldPlay = video === target && permitted();
      if (!shouldPlay) { video.pause(); return; }
      const clip = films[video.dataset.carouselVideo];
      if (!clip?.src) return;
      if (!video.getAttribute('src')) {
        video.poster = clip.poster;
        video.src = clip.previewSrc || clip.src;
      }
      video.muted = true; video.defaultMuted = true; video.playsInline = true; video.loop = true;
      if (video.paused) video.play()?.then(() => {
        if (video !== active().querySelector('video') || !permitted()) video.pause();
      }).catch(() => { video.dataset.autoplayBlocked='true'; /* Explicit Play Film remains available. */ });
    });
    lastPlaying = permitted();
    updateToggle();
  }
  function updateLabels(manual) {
    const scene = active();
    document.getElementById('hero-current').textContent = String(index + 1).padStart(2, '0');
    document.getElementById('hero-scene-kicker').textContent = scene.dataset.kicker;
    document.getElementById('hero-scene-title').textContent = scene.dataset.title;
    const filmButton = document.getElementById('hero-open-film');
    const photoButton = document.getElementById('hero-open-photo');
    filmButton.hidden = !scene.dataset.film;
    photoButton.hidden = Boolean(scene.dataset.film);
    if (scene.dataset.film) {
      filmButton.dataset.openFilm = scene.dataset.film;
      filmButton.setAttribute('aria-label', `Watch ${scene.dataset.title}`);
    } else {
      // Locate by the actual local photograph, not a guessed asset-key alias.
      const src = scene.querySelector('.scene-main img').getAttribute('src');
      const galleryIndex = scene.dataset.photo
        ? C.gallery.findIndex(item => item.image === scene.dataset.photo)
        : C.gallery.findIndex(item => C.assets[item.image]?.local === src);
      photoButton.hidden = galleryIndex < 0;
      photoButton.dataset.openPhoto = String(galleryIndex);
    }
    if (manual) document.getElementById('hero-announcement').textContent = `${index + 1} of ${scenes.length}. ${scene.dataset.title}`;
  }
  function go(next, manual = false) {
    index = (next + scenes.length) % scenes.length;
    elapsed = 0;
    hero.style.setProperty('--hero-progress', '0');
    if (manual) { paused = true; userPaused = false; }
    scenes.forEach((scene, i) => {
      scene.classList.toggle('is-active', i === index);
      scene.setAttribute('aria-hidden', String(i !== index));
      scene.inert = i !== index;
    });
    tabs.forEach((tab, i) => {
      tab.classList.toggle('is-active', i === index);
      tab.setAttribute('aria-pressed', String(i === index));
    });
    const v = active().querySelector('video');
    if (v?.readyState > 0) { try { v.currentTime = 0; } catch (_) {} }
    updateLabels(manual);
    syncMedia();
  }
  function tick(now) {
    const dt = last ? Math.min(100, now - last) : 0;
    last = now;
    if (rotating()) {
      elapsed += dt;
      hero.style.setProperty('--hero-progress', String(Math.min(1, elapsed / duration())));
      if (elapsed >= duration()) go(index + 1);
    }
    if (lastPlaying !== permitted()) syncMedia();
    raf = requestAnimationFrame(tick);
  }
  function wake() {
    last = 0;
    syncMedia();
    if (visible && !document.hidden && raf === null) raf = requestAnimationFrame(tick);
    if ((!visible || document.hidden) && raf !== null) { cancelAnimationFrame(raf); raf = null; }
  }
  tabs.forEach(tab => tab.addEventListener('click', () => go(Number(tab.dataset.goScene), true)));
  document.getElementById('carousel-prev').addEventListener('click', () => go(index - 1, true));
  document.getElementById('carousel-next').addEventListener('click', () => go(index + 1, true));
  toggle.addEventListener('click', () => {
    if (root.dataset.motion === 'off') {
      document.getElementById('motion-toggle').click();
      paused = false;
    } else paused = !paused;
    userPaused = paused;
    focusHold = false;
    elapsed = 0;
    syncMedia();
  });
  stage.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      go(index + (event.key === 'ArrowRight' ? 1 : -1), true);
    }
  });
  // Focus suspends rotation without changing the user's pause choice before a click.
  hero.addEventListener('focusin', () => { focusHold = true; });
  hero.addEventListener('focusout', event => { if (!hero.contains(event.relatedTarget)) focusHold = false; });
  stage.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') hovering = true; });
  stage.addEventListener('pointerleave', () => { hovering = false; pointerStart = null; });
  stage.addEventListener('pointerdown', event => {
    if (event.target.closest('button,a') || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointerStart = {x:event.clientX,y:event.clientY};
  });
  stage.addEventListener('pointerup', event => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) go(index + (dx < 0 ? 1 : -1), true);
  });
  stage.addEventListener('pointercancel', () => { pointerStart = null; });
  stage.addEventListener('dragstart', event => event.preventDefault());
  videos.forEach(video => {
    video.addEventListener('playing', () => video.classList.add('ready'));
    video.addEventListener('error', () => video.classList.remove('ready'));
    video.addEventListener('loadedmetadata', () => {
      // Accommodate a future landscape source without cropping it into portrait.
      video.closest('.scene-main').classList.toggle('landscape-source', video.videoWidth > video.videoHeight);
      if (video.dataset.carouselVideo === 'hero' && Number.isFinite(video.duration)) scenes[0].dataset.duration = String(Math.max(6500, Math.min(20000, video.duration * 1000))); 
    });
  });
  new MutationObserver(wake).observe(root, {attributes:true,attributeFilter:['data-motion']});
  const dialogs = new MutationObserver(wake);
  document.querySelectorAll('dialog').forEach(d => dialogs.observe(d,{attributes:true,attributeFilter:['open']}));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; wake(); },{threshold:.04}).observe(hero);
  } else { visible = true; wake(); }
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('pagehide', () => { videos.forEach(v => v.pause()); if(raf!==null)cancelAnimationFrame(raf);raf=null; });
  window.addEventListener('pageshow', wake);
  go(0);
  window.BarsysHero = Object.freeze({
    state: () => ({index,paused,visible,rotating:rotating(),elapsed,sourceStatus:films.hero.sourceStatus}),
    next: () => go(index + 1,true),
    playback: () => videos.map(v => ({clip:v.dataset.carouselVideo,paused:v.paused,loaded:Boolean(v.getAttribute('src')),time:v.currentTime}))
  });
})();
