<?php
/**
 * Plugin Name: Хроники — управление сайтом
 * Description: Книги, загрузка файлов и настройки сайта «Хроники преображения Мира».
 * Version: 1.1.0
 * Author: Хроники преображения Мира
 */

if (!defined('ABSPATH')) {
    exit;
}

const HRONIKI_BOOK_FILE_ID = '_hroniki_book_file_id';
const HRONIKI_BOOK_FILE_URL = '_hroniki_book_file_url';

function hroniki_register_book_type(): void
{
    register_post_type('book', [
        'labels' => [
            'name' => 'Книги',
            'singular_name' => 'Книга',
            'add_new' => 'Добавить книгу',
            'add_new_item' => 'Добавить новую книгу',
            'edit_item' => 'Редактировать книгу',
            'new_item' => 'Новая книга',
            'view_item' => 'Открыть книгу',
            'search_items' => 'Найти книги',
            'not_found' => 'Книги не найдены',
            'menu_name' => 'Книги',
        ],
        'public' => true,
        'show_in_rest' => true,
        'menu_icon' => 'dashicons-book-alt',
        'supports' => ['title', 'editor', 'excerpt', 'thumbnail', 'revisions', 'author'],
        'has_archive' => 'books',
        'rewrite' => ['slug' => 'book', 'with_front' => false],
        'menu_position' => 5,
    ]);
}
add_action('init', 'hroniki_register_book_type');

function hroniki_activate(): void
{
    hroniki_register_book_type();
    flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'hroniki_activate');
register_deactivation_hook(__FILE__, 'flush_rewrite_rules');

function hroniki_book_file_box(): void
{
    add_meta_box(
        'hroniki-book-file',
        'Файл книги',
        'hroniki_render_book_file_box',
        'book',
        'side',
        'high'
    );
}
add_action('add_meta_boxes', 'hroniki_book_file_box');

function hroniki_render_book_file_box(WP_Post $post): void
{
    wp_nonce_field('hroniki_save_book_file', 'hroniki_book_file_nonce');
    $file_id = (int) get_post_meta($post->ID, HRONIKI_BOOK_FILE_ID, true);
    $file_url = (string) get_post_meta($post->ID, HRONIKI_BOOK_FILE_URL, true);
    if ($file_id) {
        $attachment_url = wp_get_attachment_url($file_id);
        if ($attachment_url) {
            $file_url = $attachment_url;
        }
    }
    ?>
    <p>Загрузите PDF, EPUB, FB2, DOC/DOCX или выберите файл из медиатеки.</p>
    <input type="hidden" id="hroniki-book-file-id" name="hroniki_book_file_id" value="<?php echo esc_attr((string) $file_id); ?>">
    <input type="url" id="hroniki-book-file-url" name="hroniki_book_file_url" value="<?php echo esc_attr($file_url); ?>" placeholder="https://…" style="width:100%;margin-bottom:8px">
    <button type="button" class="button button-primary" id="hroniki-book-file-select">Выбрать / загрузить</button>
    <button type="button" class="button" id="hroniki-book-file-clear">Убрать</button>
    <?php if ($file_url) : ?>
        <p><a href="<?php echo esc_url($file_url); ?>" target="_blank" rel="noopener">Проверить файл</a></p>
    <?php endif; ?>
    <?php
}

function hroniki_book_admin_assets(string $hook): void
{
    $screen = get_current_screen();
    if (!$screen || $screen->post_type !== 'book' || !in_array($hook, ['post.php', 'post-new.php'], true)) {
        return;
    }
    wp_enqueue_media();
    wp_enqueue_script(
        'hroniki-book-admin',
        plugins_url('book-admin.js', __FILE__),
        ['jquery'],
        '1.0.0',
        true
    );
}
add_action('admin_enqueue_scripts', 'hroniki_book_admin_assets');

function hroniki_save_book_file(int $post_id): void
{
    if (
        !isset($_POST['hroniki_book_file_nonce']) ||
        !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['hroniki_book_file_nonce'])), 'hroniki_save_book_file') ||
        (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) ||
        !current_user_can('edit_post', $post_id)
    ) {
        return;
    }

    $file_id = isset($_POST['hroniki_book_file_id']) ? absint($_POST['hroniki_book_file_id']) : 0;
    $file_url = isset($_POST['hroniki_book_file_url']) ? esc_url_raw(wp_unslash($_POST['hroniki_book_file_url'])) : '';
    if ($file_id) {
        update_post_meta($post_id, HRONIKI_BOOK_FILE_ID, $file_id);
        $attachment_url = wp_get_attachment_url($file_id);
        if ($attachment_url) {
            $file_url = $attachment_url;
        }
    } else {
        delete_post_meta($post_id, HRONIKI_BOOK_FILE_ID);
    }
    if ($file_url) {
        update_post_meta($post_id, HRONIKI_BOOK_FILE_URL, $file_url);
    } else {
        delete_post_meta($post_id, HRONIKI_BOOK_FILE_URL);
    }
}
add_action('save_post_book', 'hroniki_save_book_file');

function hroniki_upload_mimes(array $mimes): array
{
    $mimes['epub'] = 'application/epub+zip';
    $mimes['fb2'] = 'application/xml';
    return $mimes;
}
add_filter('upload_mimes', 'hroniki_upload_mimes');

function hroniki_register_settings(): void
{
    register_setting('hroniki_site', 'hroniki_footer_text', [
        'type' => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default' => '© «Хроники преображения Мира». Все права защищены',
    ]);
    register_setting('hroniki_site', 'hroniki_youtube_url', [
        'type' => 'string',
        'sanitize_callback' => 'esc_url_raw',
        'default' => 'https://www.youtube.com/channel/UCis2VTkLXQoIQaDfm3vzjMA/',
    ]);
    register_setting('hroniki_site', 'hroniki_home_news_count', [
        'type' => 'integer',
        'sanitize_callback' => static fn($value) => min(12, max(3, absint($value))),
        'default' => 6,
    ]);
    foreach (['hroniki_home_first_image_url', 'hroniki_home_second_image_url', 'hroniki_home_video_image_url'] as $option_name) {
        register_setting('hroniki_site', $option_name, [
            'type' => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default' => '',
        ]);
    }
    foreach (['hroniki_home_second_title', 'hroniki_home_publications_title', 'hroniki_home_books_title', 'hroniki_home_video_title'] as $option_name) {
        register_setting('hroniki_site', $option_name, [
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => '',
        ]);
    }
    register_setting('hroniki_site', 'hroniki_home_second_text', [
        'type' => 'string',
        'sanitize_callback' => 'sanitize_textarea_field',
        'default' => '',
    ]);
}
add_action('admin_init', 'hroniki_register_settings');

function hroniki_add_settings_page(): void
{
    add_theme_page(
        'Настройки сайта',
        'Настройки сайта',
        'manage_options',
        'hroniki-site-settings',
        'hroniki_render_settings_page'
    );
}
add_action('admin_menu', 'hroniki_add_settings_page');

function hroniki_render_settings_page(): void
{
    if (!current_user_can('manage_options')) {
        return;
    }
    $front_page_id = (int) get_option('page_on_front');
    ?>
    <div class="wrap">
        <h1>Настройки сайта</h1>
        <p>Первый текстовый блок главной редактируется обычным редактором WordPress. Остальные блоки настраиваются ниже.</p>
        <?php if ($front_page_id) : ?>
            <p><a class="button button-primary" href="<?php echo esc_url(get_edit_post_link($front_page_id)); ?>">Редактировать главную</a></p>
        <?php endif; ?>
        <form method="post" action="options.php">
            <?php settings_fields('hroniki_site'); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="hroniki_footer_text">Подпись в футере</label></th>
                    <td><input class="regular-text" id="hroniki_footer_text" name="hroniki_footer_text" value="<?php echo esc_attr((string) get_option('hroniki_footer_text')); ?>"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="hroniki_youtube_url">YouTube-канал</label></th>
                    <td><input class="regular-text" type="url" id="hroniki_youtube_url" name="hroniki_youtube_url" value="<?php echo esc_attr((string) get_option('hroniki_youtube_url')); ?>"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="hroniki_home_news_count">Новостей на главной</label></th>
                    <td><input type="number" min="3" max="12" id="hroniki_home_news_count" name="hroniki_home_news_count" value="<?php echo esc_attr((string) get_option('hroniki_home_news_count', 6)); ?>"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="hroniki_home_first_image_url">Первая картинка главной</label></th>
                    <td><input class="large-text" type="url" id="hroniki_home_first_image_url" name="hroniki_home_first_image_url" value="<?php echo esc_attr((string) get_option('hroniki_home_first_image_url')); ?>" placeholder="Оставьте пустым для исходной картинки"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="hroniki_home_second_title">Заголовок второго блока</label></th>
                    <td><input class="large-text" id="hroniki_home_second_title" name="hroniki_home_second_title" value="<?php echo esc_attr((string) get_option('hroniki_home_second_title')); ?>" placeholder="О задачах общественного движения…"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="hroniki_home_second_text">Текст второго блока</label></th>
                    <td><textarea class="large-text" rows="7" id="hroniki_home_second_text" name="hroniki_home_second_text" placeholder="Оставьте пустым для исходного текста"><?php echo esc_textarea((string) get_option('hroniki_home_second_text')); ?></textarea></td>
                </tr>
                <tr>
                    <th scope="row"><label for="hroniki_home_second_image_url">Вторая картинка главной</label></th>
                    <td><input class="large-text" type="url" id="hroniki_home_second_image_url" name="hroniki_home_second_image_url" value="<?php echo esc_attr((string) get_option('hroniki_home_second_image_url')); ?>" placeholder="Оставьте пустым для исходной картинки"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="hroniki_home_publications_title">Заголовок публикаций</label></th>
                    <td><input class="large-text" id="hroniki_home_publications_title" name="hroniki_home_publications_title" value="<?php echo esc_attr((string) get_option('hroniki_home_publications_title')); ?>" placeholder="Публикации «Хроники преображения Мира»"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="hroniki_home_books_title">Заголовок книг</label></th>
                    <td><input class="large-text" id="hroniki_home_books_title" name="hroniki_home_books_title" value="<?php echo esc_attr((string) get_option('hroniki_home_books_title')); ?>" placeholder="Книги Ирины Ниловой"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="hroniki_home_video_title">Заголовок видео</label></th>
                    <td><input class="large-text" id="hroniki_home_video_title" name="hroniki_home_video_title" value="<?php echo esc_attr((string) get_option('hroniki_home_video_title')); ?>" placeholder="Видео"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="hroniki_home_video_image_url">Картинка блока видео</label></th>
                    <td><input class="large-text" type="url" id="hroniki_home_video_image_url" name="hroniki_home_video_image_url" value="<?php echo esc_attr((string) get_option('hroniki_home_video_image_url')); ?>" placeholder="Оставьте пустым для исходной картинки"></td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}

function hroniki_dashboard_widget(): void
{
    wp_add_dashboard_widget('hroniki-quick-start', 'Управление сайтом', 'hroniki_dashboard_widget_content');
}
add_action('wp_dashboard_setup', 'hroniki_dashboard_widget');

function hroniki_dashboard_widget_content(): void
{
    $front_page_id = (int) get_option('page_on_front');
    echo '<p>Быстрый доступ к основным разделам:</p><p>';
    echo '<a class="button button-primary" href="' . esc_url(admin_url('post-new.php')) . '">Добавить новость</a> ';
    echo '<a class="button" href="' . esc_url(admin_url('post-new.php?post_type=book')) . '">Добавить книгу</a> ';
    if ($front_page_id) {
        echo '<a class="button" href="' . esc_url(get_edit_post_link($front_page_id)) . '">Изменить главную</a>';
    }
    echo '</p>';
}

function hroniki_admin_post_columns(array $columns): array
{
    $columns['categories'] = 'Категория';
    return $columns;
}
add_filter('manage_posts_columns', 'hroniki_admin_post_columns');
