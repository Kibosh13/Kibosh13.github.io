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
})();

