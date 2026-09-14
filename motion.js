/* V2.1 / real events. Native scrolling and media, with no third-party players.
   Background clips load only when visible, stop off-screen and behind dialogs,
   and respect reduced motion / the existing V2 motion preference. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (s, scope = document) => scope.querySelector(s);
  const $$ = (s, scope = document) => [...scope.querySelectorAll(s)];
  const C = window.BARSYS;
  const clips = window.BARSYS_MEDIA || {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = $('#motion-toggle');
  const backgroundVideos = $$('[data-background-video]');
  const visible = new Map(backgroundVideos.map(video => [video, false]));
  const filmDialog = $('#film-dialog');
  const photoDialog = $('#photo-dialog');
  const player = $('#film-player');
  let preference = null;
  try { preference = localStorage.getItem('barsys-v2-motion'); } catch (_) {}
  let allowed = !reduced.matches && preference !== 'off' && !navigator.connection?.saveData;
  let currentFilm = null;
  let filmFocus = null;
  let photoFocus = null;
  let photoIndex = 0;
  const hasOpenDialog = () => Boolean($('dialog[open]'));
  const canPlay = video => allowed && visible.get(video) && video.getClientRects().length > 0 && !document.hidden && !hasOpenDialog();

  function syncBackground() {
    backgroundVideos.forEach(video => {
      if (!canPlay(video)) { video.pause(); return; }
      const clip = clips[video.dataset.clip];
      if (!clip?.src) return;
      if (!video.getAttribute('src')) {
        video.src = clip.src;
        video.poster = clip.poster;
      }
      video.muted = true;
      const pending = video.play();
      pending?.then(() => { if (!canPlay(video)) video.pause(); }).catch(() => {
        // Autoplay is optional. The photographic poster and Play button stay available.
      });
    });
  }
  function setMotion(value, persist = false) {
    allowed = Boolean(value);
    root.dataset.motion = allowed ? 'on' : 'off';
    motionButton.setAttribute('aria-pressed', String(!allowed));
    motionButton.setAttribute('aria-label', allowed ? 'Pause motion' : 'Enable motion');
    $('span', motionButton).textContent = allowed ? 'Motion on' : 'Motion off';
    $('use', motionButton).setAttribute('href', allowed ? '#i-pause' : '#i-play');
    if (persist) {
      preference = allowed ? 'on' : 'off';
      try { localStorage.setItem('barsys-v2-motion', preference); } catch (_) {}
    }
    syncBackground();
  }
  document.addEventListener('barsys:privacy',()=>{ if(!window.BarsysPrivacy?.get().decided) preference=null; });
  motionButton.addEventListener('click', () => setMotion(!allowed, true));
  reduced.addEventListener('change', e => setMotion(!e.matches && preference !== 'off'));
  backgroundVideos.forEach(video => {
    video.addEventListener('playing', () => video.classList.add('ready'));
    video.addEventListener('error', () => video.classList.remove('ready'));
  });
  document.addEventListener('visibilitychange', () => {
    syncBackground();
    if (document.hidden) $('video', player)?.pause();
  });
  window.addEventListener('resize', syncBackground, {passive: true});
  const overlayObserver = new MutationObserver(() => {
    document.body.classList.toggle('dialog-open', hasOpenDialog());
    syncBackground();
  });
  $$('dialog').forEach(dialog => overlayObserver.observe(dialog, {attributes: true, attributeFilter: ['open']}));
  setMotion(allowed);

  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => visible.set(entry.target, entry.isIntersecting));
      syncBackground();
    }, {threshold: 0.06});
    backgroundVideos.forEach(video => videoObserver.observe(video));
    new IntersectionObserver(entries => {
      root.dataset.heroVisible = String(entries[0].isIntersecting);
    }, {threshold: 0.02}).observe($('.hero'));
    root.classList.add('js-motion');
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, {threshold: 0.07, rootMargin: '0px 0px -15px 0px'});
    $$('[data-reveal]').forEach(element => revealObserver.observe(element));
    $$('.film-grid > *, .package-grid > *, .journal-card').forEach((element, index) => {
      element.style.setProperty('--reveal-delay', `${(index % 3) * 70}ms`);
    });
  } else {
    backgroundVideos.forEach(video => visible.set(video, true));
    syncBackground();
  }

  // Each existing experience chapter now reveals a different, real event photo.
  $$('.experience-chapter').forEach(button => button.addEventListener('click', () => {
    $$('.experience-chapter').forEach(other => {
      const active = button === other;
      other.classList.toggle('active', active);
      other.setAttribute('aria-expanded', String(active));
    });
    const key = C.experienceChapters?.[Number(button.dataset.chapter)];
    const asset = C.assets[key];
    if (asset) {
      const image = $('#experience-image');
      image.src = asset.local;
      image.alt = asset.alt;
      image.dataset.image = key;
      $('.photo-expand').dataset.openPhoto = String(C.gallery.findIndex(item => item.image === key));
    }
  }));

  // The existing cocktail filter, selection and drag behavior are preserved.
  const menuGrid = $('#featured-menus');
  function syncMenuButtons() {
    const max = menuGrid.scrollWidth - menuGrid.clientWidth;
    $('[data-menu-scroll="-1"]').disabled = menuGrid.scrollLeft <= 2;
    $('[data-menu-scroll="1"]').disabled = max <= 2 || menuGrid.scrollLeft >= max - 2;
    const cards = $$('.menu-card', menuGrid).filter(card => !card.hidden);
    const rect = menuGrid.getBoundingClientRect();
    const visible = cards.map((card,index) => ({index, rect:card.getBoundingClientRect()})).filter(({rect:r}) => r.right > rect.left + 6 && r.left < rect.right - 6);
    const counter = $('#mixlist-range');
    if (counter) counter.textContent = visible.length ? `${visible[0].index + 1}\u2013${visible.at(-1).index + 1} of ${cards.length} collections` : `${cards.length} collections`;

  }
  $$('.filter-pill').forEach(button => button.addEventListener('click', () => {
    const type = button.dataset.menuFilter;
    $$('.filter-pill').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    $$('.menu-card', menuGrid).forEach(card => {
      const zero = card.dataset.zeroProof === 'true';
      card.hidden = (type === 'zero' && !zero) || (type === 'cocktails' && zero);
    });
    menuGrid.scrollTo({left: 0, behavior: 'instant'});
    syncMenuButtons();
  }));
  $$('[data-menu-scroll]').forEach(button => button.addEventListener('click', () => {
    menuGrid.scrollBy({left: Number(button.dataset.menuScroll) * (menuGrid.clientWidth + parseFloat(getComputedStyle(menuGrid).columnGap || 0)), behavior: allowed ? 'smooth' : 'instant'});
  }));
  document.addEventListener('barsys:menus',()=>{const type=$('.filter-pill[aria-pressed="true"]')?.dataset.menuFilter;$$('.menu-card',menuGrid).forEach(card=>{const zero=card.dataset.zeroProof==='true';card.hidden=(type==='zero'&&!zero)||(type==='cocktails'&&zero);});menuGrid.scrollLeft=0;syncMenuButtons();});
  menuGrid.addEventListener('scroll', syncMenuButtons, {passive: true});
  menuGrid.addEventListener('keydown', event => {
    if (event.target !== menuGrid || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const left = event.key==='Home' ? 0 : event.key==='End' ? menuGrid.scrollWidth : menuGrid.scrollLeft+(event.key==='ArrowRight'?1:-1)*(menuGrid.clientWidth+parseFloat(getComputedStyle(menuGrid).columnGap||0));
    menuGrid.scrollTo({left,behavior:allowed?'smooth':'instant'});
  });
  window.addEventListener('resize', syncMenuButtons, {passive: true});
  syncMenuButtons();

  function draggableGallery(gallery) {
    if (!gallery) return;
    let start = null;
    let dragged = false;
    gallery.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse' || event.button !== 0 || gallery.scrollWidth <= gallery.clientWidth + 2) return;
      start = {x: event.clientX, left: gallery.scrollLeft};
      dragged = false;
    });
    gallery.addEventListener('pointermove', event => {
      if (!start) return;
      const distance = event.clientX - start.x;
      if (Math.abs(distance) > 8) dragged = true;
      if (dragged) {
        gallery.classList.add('dragging');
        gallery.scrollLeft = start.left - distance;
        event.preventDefault();
      }
    });
    const stop = () => { start = null; gallery.classList.remove('dragging'); };
    window.addEventListener('pointerup', stop);
    gallery.addEventListener('pointerleave', stop);
    gallery.addEventListener('dragstart', event => event.preventDefault());
    gallery.addEventListener('click', event => {
      if (dragged) { event.preventDefault(); event.stopImmediatePropagation(); dragged = false; }
    }, true);
  }
  draggableGallery(menuGrid);
  draggableGallery($('.film-grid'));
  const photoRail = $('.event-photo-rail');
  draggableGallery(photoRail);
  function syncPhotoButtons() {
    const max = photoRail.scrollWidth - photoRail.clientWidth;
    $('[data-photo-scroll="-1"]').disabled = photoRail.scrollLeft <= 2;
    $('[data-photo-scroll="1"]').disabled = max <= 2 || photoRail.scrollLeft >= max - 2;
  }
  $$('[data-photo-scroll]').forEach(button => button.addEventListener('click', () => {
    photoRail.scrollBy({left: Number(button.dataset.photoScroll) * photoRail.clientWidth * .82, behavior: allowed ? 'smooth' : 'instant'});
  }));
  photoRail.addEventListener('scroll', syncPhotoButtons, {passive: true});
  window.addEventListener('resize', syncPhotoButtons, {passive: true});
  syncPhotoButtons();

  function clearFilm() {
    $$('video', player).forEach(video => { video.pause(); video.removeAttribute('src'); video.load(); });
    player.replaceChildren();
  }
  function selectFilm(key) {
    const film = clips[key];
    if (!film?.src) return;
    clearFilm();
    currentFilm = key;
    $('#film-dialog-title').textContent = film.title;
    $('#film-description').textContent = film.description;
    const experienceGroup = film.family === 'experience';
    $$('[data-film-tab]').forEach(button => {
      button.hidden = experienceGroup !== (button.dataset.filmFamily === 'experience');
      button.setAttribute('aria-pressed', String(button.dataset.filmTab === key));
    });
    const video = document.createElement('video');
    video.controls = true;
    video.playsInline = true; video.setAttribute('playsinline',''); video.setAttribute('muted',''); video.autoplay = true;
    video.muted = true;
    video.preload = 'metadata';
    video.poster = film.poster;
    video.src = film.src;
    video.loop = film.duration < 4;
    video.setAttribute('aria-describedby','film-description');
    video.setAttribute('aria-label', `${film.title} Silent Barsys event footage.`);
    video.addEventListener('error', () => {
      $('#film-description').textContent = 'This video could not load. Reopen the complete standalone HTML or check the assets/events/video folder in the project.';
    });
    player.append(video);
    // Foreground playback always follows a click, including when motion is disabled.
    video.play().catch(() => {});
  }
  function openFilm(key, trigger) {
    if (!Object.hasOwn(clips, key)) return;
    filmFocus = trigger || document.activeElement;
    if (!filmDialog.open) filmDialog.showModal();
    document.body.classList.add('dialog-open');
    syncBackground();
    selectFilm(key);
    $('#close-film').focus({preventScroll: true});
  }
  document.addEventListener('click', event => { const button=event.target.closest('[data-open-film]'); if(button) openFilm(button.dataset.openFilm,button); });
  $$('[data-film-tab]').forEach(button => button.addEventListener('click', () => selectFilm(button.dataset.filmTab)));
  $('#close-film').addEventListener('click', () => filmDialog.close());
  filmDialog.addEventListener('close', () => {
    clearFilm(); currentFilm = null;
    document.body.classList.toggle('dialog-open', hasOpenDialog());
    syncBackground();
    if (filmFocus?.isConnected) filmFocus.focus({preventScroll: true});
  });

  function selectPhoto(index) {
    photoIndex = (index + C.gallery.length) % C.gallery.length;
    const item = C.gallery[photoIndex];
    const asset = C.assets[item.image];
    $('#lightbox-photo').src = asset.local;
    $('#lightbox-photo').alt = asset.alt;
    $('#photo-dialog-title').textContent = item.caption;
    $('#photo-location').textContent = item.event;
    $('#photo-count').textContent = `${photoIndex + 1} / ${C.gallery.length}`;
  }
  $$('[data-open-photo]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.openPhoto);
    if (!Number.isInteger(index) || index < 0 || index >= C.gallery.length) return;
    photoFocus = button;
    selectPhoto(index);
    photoDialog.showModal();
    document.body.classList.add('dialog-open');
    syncBackground();
    $('#close-photo').focus({preventScroll: true});
  }));
  $('#prev-photo').addEventListener('click', () => selectPhoto(photoIndex - 1));
  $('#next-photo').addEventListener('click', () => selectPhoto(photoIndex + 1));
  $('#close-photo').addEventListener('click', () => photoDialog.close());
  photoDialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      selectPhoto(photoIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  photoDialog.addEventListener('close', () => {
    document.body.classList.toggle('dialog-open', hasOpenDialog());
    syncBackground();
    if (photoFocus?.isConnected) photoFocus.focus({preventScroll: true});
  });
  [photoDialog, filmDialog].forEach(dialog => dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  }));
  window.BarsysMotion = Object.freeze({
    isEnabled: () => allowed,
    getFilm: () => currentFilm,
    getPhoto: () => photoIndex,
    getHeroPlayback: () => { const v = $('#hero-video'); return {paused:v.paused,time:v.currentTime,readyState:v.readyState}; },
    getBackgroundPlayback: () => backgroundVideos.map(v => ({clip:v.dataset.clip,paused:v.paused,time:v.currentTime,loaded:Boolean(v.getAttribute('src')),visible:visible.get(v)}))
  });
})();
