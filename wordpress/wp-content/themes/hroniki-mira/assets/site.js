(function () {
  'use strict';

  var layer = document.querySelector('.mobile-menu-layer');
  var openButton = document.querySelector('.menu-toggle');
  if (!layer || !openButton) return;

  var closeButtons = layer.querySelectorAll('[data-menu-close]');
  var panel = layer.querySelector('.mobile-menu-panel');

  function setMenu(open) {
    layer.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    openButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    layer.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open && panel) panel.focus();
    if (!open) openButton.focus();
  }

  openButton.addEventListener('click', function () { setMenu(true); });
  closeButtons.forEach(function (button) {
    button.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && layer.classList.contains('is-open')) setMenu(false);
  });

  layer.querySelectorAll('.menu-item-has-children').forEach(function (item, index) {
    var submenu = item.querySelector(':scope > .sub-menu');
    if (!submenu || item.querySelector(':scope > .mobile-submenu-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'mobile-submenu-toggle';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'mobile-submenu-' + index);
    button.innerHTML = '<span class="screen-reader-text">Открыть подразделы</span>';
    submenu.id = 'mobile-submenu-' + index;
    item.insertBefore(button, submenu);
    button.addEventListener('click', function () {
      var open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      submenu.classList.toggle('is-open', open);
    });
  });

  document.querySelectorAll('[data-home-carousel]').forEach(function (carousel) {
    var track = carousel.querySelector('[data-carousel-track]');
    var previous = carousel.querySelector('[data-carousel-prev]');
    var next = carousel.querySelector('[data-carousel-next]');
    if (!track || !previous || !next) return;

    function step(direction) {
      var slide = track.querySelector('.source-carousel-slide');
      var gap = parseFloat(window.getComputedStyle(track).columnGap || '0');
      var distance = slide ? slide.getBoundingClientRect().width + gap : track.clientWidth;
      track.scrollBy({ left: direction * distance, behavior: 'smooth' });
    }

    previous.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.setInterval(function () {
        var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
        if (atEnd) track.scrollTo({ left: 0, behavior: 'smooth' });
        else step(1);
      }, 5000);
    }
  });

  document.querySelectorAll('[data-video-grid]').forEach(function (grid) {
    var button = grid.parentElement.querySelector('[data-video-more]');
    if (!button) return;
    button.addEventListener('click', function () {
      var hidden = Array.prototype.slice.call(grid.querySelectorAll('.video-card.is-hidden'));
      hidden.slice(0, 9).forEach(function (card) { card.classList.remove('is-hidden'); });
      if (!grid.querySelector('.video-card.is-hidden')) button.hidden = true;
    });
  });
})();
