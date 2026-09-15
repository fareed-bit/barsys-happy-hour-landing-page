(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const videos = [...document.querySelectorAll('video[data-tech-video]')];
  const allowed = () => root.dataset.motion !== 'off' && !reduced.matches && !document.hidden;
  function sync(video) {
    if (allowed() && video.dataset.visible === '1') {
      if (!video.src) video.src = video.dataset.src;
      video.muted = true; video.defaultMuted = true; video.loop = true; video.playsInline = true;
      if (video.paused) video.play().catch(() => {});
    } else if (!video.paused) video.pause();
  }
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) { entry.target.dataset.visible = entry.isIntersecting ? '1' : '0'; sync(entry.target); }
  }, { threshold: 0.2 });
  videos.forEach(video => { video.addEventListener('playing', () => video.classList.add('ready')); io.observe(video); });
  document.addEventListener('visibilitychange', () => videos.forEach(sync));
  reduced.addEventListener('change', () => videos.forEach(sync));
  const toggle = document.getElementById('motion-toggle');
  if (toggle) toggle.addEventListener('click', () => {
    const off = root.dataset.motion !== 'off';
    root.dataset.motion = off ? 'off' : 'on';
    toggle.setAttribute('aria-pressed', String(off));
    toggle.setAttribute('aria-label', off ? 'Resume motion' : 'Pause motion');
    toggle.querySelector('span').textContent = off ? 'Motion off' : 'Motion on';
    toggle.querySelector('use').setAttribute('href', off ? '#i-play' : '#i-pause');
    videos.forEach(sync);
  });
  const menu = document.querySelector('.menu-toggle'), nav = document.getElementById('mobile-nav');
  if (menu && nav) {
    menu.addEventListener('click', () => {
      const open = nav.hidden; nav.hidden = !open;
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      menu.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
    });
    nav.addEventListener('click', event => { if (event.target.closest('a')) { nav.hidden = true; menu.setAttribute('aria-expanded', 'false'); menu.querySelector('use').setAttribute('href', '#i-menu'); } });
  }
})();
