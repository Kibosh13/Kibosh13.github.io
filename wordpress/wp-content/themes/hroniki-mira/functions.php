<?php

if (!defined('ABSPATH')) {
    exit;
}

function hroniki_theme_setup(): void
{
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('responsive-embeds');
    add_theme_support('align-wide');
    add_theme_support('html5', ['search-form', 'gallery', 'caption', 'style', 'script']);
    register_nav_menus(['primary' => 'Основное меню']);
    set_post_thumbnail_size(720, 480, true);
}
add_action('after_setup_theme', 'hroniki_theme_setup');

function hroniki_theme_assets(): void
{
    $style_path = get_stylesheet_directory() . '/style.css';
    $script_path = get_template_directory() . '/assets/site.js';
    wp_enqueue_style('hroniki-style', get_stylesheet_uri(), [], (string) filemtime($style_path));
    wp_enqueue_script('hroniki-site', get_template_directory_uri() . '/assets/site.js', [], (string) filemtime($script_path), true);
}
add_action('wp_enqueue_scripts', 'hroniki_theme_assets');

function hroniki_excerpt_length(): int
{
    return 34;
}
add_filter('excerpt_length', 'hroniki_excerpt_length');
add_filter('excerpt_more', static fn() => '…');

function hroniki_archive_page_size(WP_Query $query): void
{
    if (!is_admin() && $query->is_main_query() && $query->is_post_type_archive('book')) {
        $query->set('posts_per_page', -1);
    }
}
add_action('pre_get_posts', 'hroniki_archive_page_size');

function hroniki_first_image_url(?WP_Post $post = null): string
{
    $post = $post ?: get_post();
    if (!$post) {
        return '';
    }
    $thumbnail = get_the_post_thumbnail_url($post, 'large');
    if ($thumbnail) {
        return $thumbnail;
    }
    $legacy_cover = (string) get_post_meta($post->ID, '_hroniki_cover_url', true);
    if ($legacy_cover) {
        return $legacy_cover;
    }
    if (preg_match('/<img\b[^>]*\b(?:src|data-src|data-lazy-src|data-original)=["\']([^"\']+)/i', $post->post_content, $match)) {
        return $match[1];
    }
    if (has_site_icon()) {
        return get_site_icon_url(512);
    }
    return home_url('/archive/hosts/xn----ctbjbaararyeivphq.xn--p1ai/wp-content/uploads/2022/01/cropped-1121.png');
}

function hroniki_archive_title(): string
{
    if (is_category()) {
        return single_cat_title('', false);
    }
    if (is_tag()) {
        return single_tag_title('', false);
    }
    if (is_author()) {
        return get_the_author();
    }
    if (is_post_type_archive()) {
        return post_type_archive_title('', false);
    }
    return wp_strip_all_tags(get_the_archive_title());
}

function hroniki_favicon_fallback(): void
{
    if (has_site_icon()) {
        return;
    }
    $icon_base = home_url('/archive/hosts/xn----ctbjbaararyeivphq.xn--p1ai/wp-content/uploads/2022/01/');
    echo '<link rel="icon" href="' . esc_url($icon_base . 'cropped-1121-32x32.png') . '" sizes="32x32">' . "\n";
    echo '<link rel="icon" href="' . esc_url($icon_base . 'cropped-1121-192x192.png') . '" sizes="192x192">' . "\n";
    echo '<link rel="apple-touch-icon" href="' . esc_url($icon_base . 'cropped-1121-180x180.png') . '">' . "\n";
}
add_action('wp_head', 'hroniki_favicon_fallback', 2);
add_action('admin_head', 'hroniki_favicon_fallback', 2);

function hroniki_book_file_url(int $post_id = 0): string
{
    $post_id = $post_id ?: get_the_ID();
    $file_id = (int) get_post_meta($post_id, '_hroniki_book_file_id', true);
    if ($file_id) {
        $url = wp_get_attachment_url($file_id);
        if ($url) {
            return $url;
        }
    }
    return (string) get_post_meta($post_id, '_hroniki_book_file_url', true);
}

function hroniki_primary_fallback(): void
{
    echo '<ul class="menu">';
    echo '<li><a href="' . esc_url(home_url('/')) . '">Главная</a></li>';
    echo '<li><a href="' . esc_url(home_url('/category/news/')) . '">Новости</a></li>';
    echo '<li><a href="' . esc_url(home_url('/books/')) . '">Книги</a></li>';
    echo '<li><a href="' . esc_url(home_url('/video/')) . '">Видео</a></li>';
    wp_list_pages(['title_li' => '', 'depth' => 1]);
    echo '</ul>';
}

function hroniki_category_description(): string
{
    if (is_category()) {
        return (string) category_description();
    }
    if (is_post_type_archive('book')) {
        return 'Книги Ирины Ниловой: восстановленный архив и новые издания.';
    }
    return '';
}

function hroniki_source_author(int $post_id = 0): string
{
    $post_id = $post_id ?: get_the_ID();
    $source_author = trim((string) get_post_meta($post_id, '_hroniki_source_author', true));
    return $source_author !== '' ? $source_author : 'И. Нилова';
}

function hroniki_entry_meta(): void
{
    $categories = get_the_category();
    $category_links = [];
    foreach ($categories as $category) {
        $category_links[] = '<a href="' . esc_url(get_category_link($category)) . '">' . esc_html($category->name) . '</a>';
    }
    echo '<span>Оставьте комментарий</span>';
    if ($category_links) {
        echo ' / <span>' . implode(', ', $category_links) . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
    }
    echo ' / <span>От ' . esc_html(hroniki_source_author()) . '</span>';
}

function hroniki_disable_comments_for_content(bool $open, int $post_id): bool
{
    if (in_array(get_post_type($post_id), ['post', 'page', 'book'], true)) {
        return false;
    }
    return $open;
}
add_filter('comments_open', 'hroniki_disable_comments_for_content', 20, 2);
add_filter('pings_open', 'hroniki_disable_comments_for_content', 20, 2);
