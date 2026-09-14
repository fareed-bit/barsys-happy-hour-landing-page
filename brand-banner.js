/* Independent, progressive enhancement for the existing trust strip.
   No dependencies, timers, external assets, analytics or persistent storage. */
(() => {
  'use strict';
  const banner = document.getElementById('company-banner');
  if (!banner) return;
  const root = document.documentElement;
  const track = banner.querySelector('.ribbon-track');
  const group = banner.querySelector('.ribbon-group');
  const viewport = banner.querySelector('.ribbon-viewport');
  const toggle = banner.querySelector('.ribbon-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const hoverCapable = matchMedia('(hover: hover)');
  const speed = Math.max(10, Math.min(70, Number(banner.dataset.speed) || 38));
  let userPaused = false, hovering = false, focusing = false, visible = false;
  const clone = group.cloneNode(true);
  clone.classList.add('ribbon-clone');
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('inert', '');
  track.appendChild(clone);
  banner.dataset.enhanced = 'true';
  toggle.hidden = false;
  const staticMode = () => reduced.matches || root.dataset.motion === 'off';
  const modalOpen = () => Boolean(document.querySelector('dialog[open]'));

  function measure() {
    // Includes trailing group padding, so the wrap lands at the exact next logo.
    track.style.setProperty('--ribbon-duration', `${group.getBoundingClientRect().width / speed}s`);
  }
  function sync() {
    const still = staticMode();
    banner.dataset.static = String(still);
    banner.dataset.paused = String(still || userPaused || hovering || focusing || !visible || document.hidden || modalOpen());
    toggle.disabled = still;
    toggle.setAttribute('aria-pressed', String(still || userPaused));
    const label = still ? 'Banner motion is off' : userPaused ? 'Play banner' : 'Pause banner';
    toggle.setAttribute('aria-label', label);
    toggle.title = still ? 'Motion is off. Scroll the names or use the arrow keys.' : label;
    toggle.querySelector('use').setAttribute('href', still || userPaused ? '#i-play' : '#i-pause');
    if (!still) viewport.scrollLeft = 0;
  }
  toggle.addEventListener('click', () => {userPaused = !userPaused; sync();});
  viewport.addEventListener('pointerenter', () => {if (hoverCapable.matches) {hovering = true; sync();}});
  viewport.addEventListener('pointerleave', () => {hovering = false; sync();});
  viewport.addEventListener('focusin', () => {focusing = true; sync();});
  viewport.addEventListener('focusout', e => {if (!viewport.contains(e.relatedTarget)) {focusing = false; sync();}});
  // Manual navigation uses the animation's timeline instead of fighting transforms.
  viewport.addEventListener('keydown', e => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
    e.preventDefault();
    const width = group.getBoundingClientRect().width;
    const delta = Math.max(170, viewport.clientWidth * .5);
    if (staticMode()) {
      if (e.key === 'Home') viewport.scrollLeft = 0;
      else if (e.key === 'End') viewport.scrollLeft = viewport.scrollWidth;
      else viewport.scrollLeft += e.key === 'ArrowRight' ? delta : -delta;
      return;
    }
    userPaused = true; sync();
    const animation = track.getAnimations()[0];
    if (!animation) return;
    const duration = width / speed * 1000;
    let time = Number(animation.currentTime) || 0;
    if (e.key === 'Home') time = 0;
    else if (e.key === 'End') time = Math.max(0, width - viewport.clientWidth) / speed * 1000;
    else time += (e.key === 'ArrowRight' ? 1 : -1) * delta / speed * 1000;
    animation.currentTime = ((time % duration) + duration) % duration;
  });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  new MutationObserver(sync).observe(root, {attributes:true,attributeFilter:['data-motion']});
  const dialogs = new MutationObserver(sync);
  document.querySelectorAll('dialog').forEach(dialog => dialogs.observe(dialog,{attributes:true,attributeFilter:['open']}));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {visible = entries[0].isIntersecting; sync();}, {threshold:0}).observe(banner);
  } else visible = true;
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(group);
  else window.addEventListener('resize',measure,{passive:true});
  measure(); sync();
})();
