/**
 * Barsys Happy Hour — Carousel JS
 * Handles: slide navigation, dots, arrows, auto-play, keyboard, touch/swipe
 */

(function () {
  'use strict';

  const AUTOPLAY_INTERVAL = 5000; // ms

  /**
   * Initialize all carousels on the page.
   */
  function initCarousels() {
    const carousels = document.querySelectorAll('[data-carousel]');
    carousels.forEach(initCarousel);
  }

  function initCarousel(carouselEl) {
    const track = carouselEl.querySelector('.carousel__track');
    const slides = carouselEl.querySelectorAll('.carousel__slide');
    const prevBtn = carouselEl.querySelector('[data-carousel-prev]');
    const nextBtn = carouselEl.querySelector('[data-carousel-next]');
    const dotsContainer = carouselEl.querySelector('.carousel__dots');
    const counterEl = carouselEl.querySelector('.carousel__counter');

    if (!track || slides.length === 0) return;

    let currentIndex = 0;
    let autoplayTimer = null;
    let touchStartX = 0;
    let touchEndX = 0;

    // Build dots dynamically if container exists
    const dots = [];
    if (dotsContainer) {
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'carousel__dot';
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        dot.addEventListener('click', () => goTo(i));
        dotsContainer.appendChild(dot);
        dots.push(dot);
      });
    }

    // --------------------------------------------------------------------------
    // Core: go to slide
    // --------------------------------------------------------------------------
    function goTo(index, animate = true) {
      const total = slides.length;
      currentIndex = ((index % total) + total) % total; // wrap around

      if (!animate) track.style.transition = 'none';
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
      if (!animate) {
        // Force reflow then restore transition
        track.offsetHeight; // eslint-disable-line no-unused-expressions
        track.style.transition = '';
      }

      // Update dots
      dots.forEach((dot, i) => {
        dot.classList.toggle('carousel__dot--active', i === currentIndex);
        dot.setAttribute('aria-current', i === currentIndex ? 'true' : 'false');
      });

      // Update ARIA on slides
      slides.forEach((slide, i) => {
        slide.setAttribute('aria-hidden', i === currentIndex ? 'false' : 'true');
      });

      // Update arrows
      if (prevBtn) prevBtn.disabled = false;
      if (nextBtn) nextBtn.disabled = false;

      // Update counter
      if (counterEl) {
        counterEl.innerHTML =
          `<span class="carousel__counter-current">${currentIndex + 1}</span> / ${total}`;
      }
    }

    function next() { goTo(currentIndex + 1); }
    function prev() { goTo(currentIndex - 1); }

    // --------------------------------------------------------------------------
    // Arrow buttons
    // --------------------------------------------------------------------------
    if (prevBtn) prevBtn.addEventListener('click', () => { prev(); resetAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { next(); resetAutoplay(); });

    // --------------------------------------------------------------------------
    // Keyboard navigation (when carousel is focused)
    // --------------------------------------------------------------------------
    carouselEl.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { prev(); resetAutoplay(); }
      if (e.key === 'ArrowRight') { next(); resetAutoplay(); }
    });

    // Make carousel focusable for keyboard users
    if (!carouselEl.hasAttribute('tabindex')) {
      carouselEl.setAttribute('tabindex', '0');
    }
    carouselEl.setAttribute('role', 'region');
    carouselEl.setAttribute('aria-roledescription', 'carousel');

    // --------------------------------------------------------------------------
    // Touch / Swipe
    // --------------------------------------------------------------------------
    track.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const delta = touchStartX - touchEndX;
      if (Math.abs(delta) > 50) {
        delta > 0 ? next() : prev();
        resetAutoplay();
      }
    }, { passive: true });

    // --------------------------------------------------------------------------
    // Auto-play
    // --------------------------------------------------------------------------
    const autoplay = carouselEl.dataset.carousel === 'autoplay' ||
                     carouselEl.hasAttribute('data-autoplay');

    function startAutoplay() {
      if (!autoplay) return;
      autoplayTimer = setInterval(next, AUTOPLAY_INTERVAL);
    }

    function stopAutoplay() {
      if (autoplayTimer) clearInterval(autoplayTimer);
    }

    function resetAutoplay() {
      stopAutoplay();
      startAutoplay();
    }

    // Pause on hover / focus
    carouselEl.addEventListener('mouseenter', stopAutoplay);
    carouselEl.addEventListener('mouseleave', startAutoplay);
    carouselEl.addEventListener('focusin', stopAutoplay);
    carouselEl.addEventListener('focusout', startAutoplay);

    // --------------------------------------------------------------------------
    // Init
    // --------------------------------------------------------------------------
    goTo(0, false);
    startAutoplay();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCarousels);
  } else {
    initCarousels();
  }

  // Expose API
  window.BarsysCarousel = { init: initCarousels };

})();
