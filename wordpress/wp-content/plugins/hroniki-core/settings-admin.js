(function ($) {
  'use strict';

  $('.hroniki-media-select').on('click', function () {
    var target = document.getElementById($(this).data('target'));
    if (!target) return;

    var frame = wp.media({
      title: 'Выберите изображение',
      button: { text: 'Использовать изображение' },
      library: { type: 'image' },
      multiple: false
    });

    frame.on('select', function () {
      var attachment = frame.state().get('selection').first().toJSON();
      target.value = attachment.url || '';
      target.dispatchEvent(new Event('change', { bubbles: true }));
    });

    frame.open();
  });
})(jQuery);
