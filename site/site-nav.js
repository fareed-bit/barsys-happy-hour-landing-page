/* Mobile navigation for the generated /site/ pages. These ship no other script, so the
   .menu-toggle button rendered in their header had no handler and #mobile-nav could never
   be opened: on phones the header CTA was the only working control. Mirrors the behaviour
   in technology.js and app.js. 2026-09-21. */
(() => {
 const menu = document.querySelector('.menu-toggle'), nav = document.getElementById('mobile-nav');
 if (!menu || !nav) return;
 const paint = open => {
  nav.hidden = !open;
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  menu.querySelector('use')?.setAttribute('href', open ? '#i-close' : '#i-menu');
 };
 menu.addEventListener('click', () => paint(nav.hidden));
 nav.addEventListener('click', e => { if (e.target.closest('a')) paint(false); });
 document.addEventListener('keydown', e => { if (e.key === 'Escape' && !nav.hidden) { paint(false); menu.focus(); } });
})();
