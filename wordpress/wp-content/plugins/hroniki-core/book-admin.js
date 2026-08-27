(function ($) {
  'use strict';

  $(function () {
    var frame;
    $('#hroniki-book-file-select').on('click', function (event) {
      event.preventDefault();
      if (frame) {
        frame.open();
        return;
      }
      frame = wp.media({
        title: 'Выберите файл книги',
        button: { text: 'Использовать этот файл' },
        multiple: false
      });
      frame.on('select', function () {
        var file = frame.state().get('selection').first().toJSON();
        $('#hroniki-book-file-id').val(file.id);
        $('#hroniki-book-file-url').val(file.url);
      });
      frame.open();
    });
    $('#hroniki-book-file-clear').on('click', function (event) {
      event.preventDefault();
      $('#hroniki-book-file-id, #hroniki-book-file-url').val('');
    });
  });
})(jQuery);
