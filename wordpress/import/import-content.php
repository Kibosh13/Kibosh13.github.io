<?php
/**
 * Import the restored archive into WordPress.
 * Run: wp eval-file wordpress/import/import-content.php /absolute/path/migration-data
 */

if (!defined('WP_CLI') || !WP_CLI) {
    fwrite(STDERR, "Run this file through WP-CLI.\n");
    exit(1);
}

$data_dir = $args[0] ?? dirname(__DIR__, 3) . '/migration-data';
$archive_dir = $args[1] ?? ABSPATH . 'archive/pages';
$legacy_host = '/archive/hosts/xn----ctbjbaararyeivphq.xn--p1ai';
$old_origin = 'https://xn----ctbjbaararyeivphq.xn--p1ai';

wp_set_current_user(1);

function hroniki_import_json(string $path): array
{
    if (!is_readable($path)) {
        WP_CLI::error('Не найден файл: ' . $path);
    }
    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        WP_CLI::error('Некорректный JSON: ' . $path);
    }
    return $data;
}

function hroniki_import_localize(string $html, string $old_origin, string $legacy_host): string
{
    $html = preg_replace(
        '~<li\b[^>]*>\s*<img\b[^>]*\bsrc=["\']blob:[^"\']+["\'][^>]*>\s*</li>~is',
        '',
        $html
    ) ?? $html;
    $html = preg_replace(
        '~<img\b[^>]*\bsrc=["\']blob:[^"\']+["\'][^>]*>~is',
        '',
        $html
    ) ?? $html;
    $html = preg_replace('~<(ul|ol)\b[^>]*>\s*</\1>~is', '', $html) ?? $html;
    $replacements = [
        $old_origin . '/wp-content/uploads/' => $legacy_host . '/wp-content/uploads/',
        '//xn----ctbjbaararyeivphq.xn--p1ai/wp-content/uploads/' => $legacy_host . '/wp-content/uploads/',
        'https://sun9-west.userapi.com/sun9-67/' => 'https://sun9-67.userapi.com/',
        'https://sun9-north.userapi.com/sun9-85/' => 'https://sun9-85.userapi.com/',
        $old_origin . '/' => home_url('/'),
        'http://xn----ctbjbaararyeivphq.xn--p1ai/' => home_url('/'),
    ];
    return strtr($html, $replacements);
}

function hroniki_import_term(array $definition, array &$term_ids): int
{
    $parent_id = $definition['parent'] ? ($term_ids[$definition['parent']] ?? 0) : 0;
    $existing = get_term_by('slug', $definition['slug'], 'category');
    if ($existing instanceof WP_Term && (int) $existing->parent === $parent_id) {
        $term_id = (int) $existing->term_id;
        wp_update_term($term_id, 'category', ['name' => $definition['name'], 'parent' => $parent_id]);
    } else {
        $created = wp_insert_term($definition['name'], 'category', ['slug' => $definition['slug'], 'parent' => $parent_id]);
        if (is_wp_error($created)) {
            WP_CLI::error('Категория ' . $definition['name'] . ': ' . $created->get_error_message());
        }
        $term_id = (int) $created['term_id'];
    }
    $term_ids[$definition['path']] = $term_id;
    return $term_id;
}

function hroniki_import_upsert(array $post_data, string $legacy_key, string $legacy_value): int
{
    $existing = get_posts([
        'post_type' => $post_data['post_type'],
        'post_status' => 'any',
        'meta_key' => $legacy_key,
        'meta_value' => $legacy_value,
        'fields' => 'ids',
        'posts_per_page' => 1,
        'no_found_rows' => true,
    ]);
    if ($existing) {
        $post_data['ID'] = (int) $existing[0];
    }
    $post_id = wp_insert_post(wp_slash($post_data), true);
    if (is_wp_error($post_id)) {
        WP_CLI::warning($post_data['post_title'] . ': ' . $post_id->get_error_message());
        return 0;
    }
    update_post_meta($post_id, $legacy_key, $legacy_value);
    return (int) $post_id;
}

function hroniki_import_dom(string $path): ?DOMDocument
{
    if (!is_readable($path)) {
        return null;
    }
    $dom = new DOMDocument();
    libxml_use_internal_errors(true);
    $loaded = $dom->loadHTML((string) file_get_contents($path), LIBXML_NOWARNING | LIBXML_NOERROR);
    libxml_clear_errors();
    return $loaded ? $dom : null;
}

function hroniki_import_inner_html(DOMNode $node): string
{
    $html = '';
    foreach ($node->childNodes as $child) {
        $html .= $node->ownerDocument->saveHTML($child);
    }
    return $html;
}

function hroniki_import_static_page_content(string $path, string $old_origin, string $legacy_host): string
{
    $dom = hroniki_import_dom($path);
    if (!$dom) {
        return '';
    }
    $xpath = new DOMXPath($dom);
    $blocks = $xpath->query("//*[contains(concat(' ', normalize-space(@class), ' '), ' entry-content ')]//*[self::h1 or self::h2 or self::h3 or self::h4 or self::p or self::blockquote or self::ul or self::ol or self::figure or self::iframe]");
    $output = '';
    $seen = [];
    foreach ($blocks ?: [] as $block) {
        $skip = false;
        for ($parent = $block->parentNode; $parent; $parent = $parent->parentNode) {
            if (isset($seen[spl_object_id($parent)])) {
                $skip = true;
                break;
            }
        }
        if ($skip) {
            continue;
        }
        $seen[spl_object_id($block)] = true;
        $output .= $dom->saveHTML($block) . "\n";
    }
    $output = preg_replace('/<(script|style)\b[^>]*>.*?<\/\1>/is', '', $output) ?? $output;
    return hroniki_import_localize($output, $old_origin, $legacy_host);
}

function hroniki_import_post_cover(string $path, int $legacy_id, string $old_origin, string $legacy_host): string
{
    $dom = hroniki_import_dom($path);
    if (!$dom) {
        return '';
    }
    $xpath = new DOMXPath($dom);
    $article_id = 'post-' . $legacy_id;
    $nodes = $xpath->query(
        "//article[@id='" . $article_id . "']//img[contains(concat(' ', normalize-space(@class), ' '), ' wp-post-image ')]"
    );
    $image = $nodes ? $nodes->item(0) : null;
    if (!$image instanceof DOMElement) {
        return '';
    }
    foreach (['src', 'data-src', 'data-lazy-src', 'data-original'] as $attribute) {
        $url = trim($image->getAttribute($attribute));
        if ($url !== '') {
            return hroniki_import_localize($url, $old_origin, $legacy_host);
        }
    }
    return '';
}

$category_defs = [
    ['path' => 'news', 'name' => 'Новости', 'slug' => 'news', 'parent' => null],
    ['path' => 'meropriyatiya', 'name' => 'Мероприятия', 'slug' => 'meropriyatiya', 'parent' => null],
    ['path' => 'creation', 'name' => 'Творчество', 'slug' => 'creation', 'parent' => null],
    ['path' => 'creation/stihi', 'name' => 'Стихи', 'slug' => 'stihi', 'parent' => 'creation'],
    ['path' => 'creation/pesni', 'name' => 'Песни', 'slug' => 'pesni', 'parent' => 'creation'],
    ['path' => 'creation/kartinki', 'name' => 'Картинки', 'slug' => 'kartinki', 'parent' => 'creation'],
    ['path' => 'creation/prochee', 'name' => 'Прочее творчество', 'slug' => 'prochee', 'parent' => 'creation'],
    ['path' => 'blog', 'name' => 'Блоги', 'slug' => 'blog', 'parent' => null],
    ['path' => 'blog/blog-aleksanra-lipnyagova', 'name' => 'Блог Александра Липнягова', 'slug' => 'blog-aleksanra-lipnyagova', 'parent' => 'blog'],
    ['path' => 'blog/vestniki-peremen-g-krasnoyarsk', 'name' => 'Красноярск', 'slug' => 'vestniki-peremen-g-krasnoyarsk', 'parent' => 'blog'],
    ['path' => 'blog/vestniki-peremen-g-krasnoyarsk/blog-vestniki-peremen-g-krasnoyarsk', 'name' => '«Хроники преображения Мира» г. Красноярск', 'slug' => 'blog-vestniki-peremen-g-krasnoyarsk', 'parent' => 'blog/vestniki-peremen-g-krasnoyarsk'],
    ['path' => 'blog/vestniki-peremen-g-chelyabinsk', 'name' => '«Хроники преображения Мира» г. Челябинск', 'slug' => 'vestniki-peremen-g-chelyabinsk', 'parent' => 'blog'],
    ['path' => 'blog-derzhava-sveta', 'name' => 'Блог «Держава Света»', 'slug' => 'blog-derzhava-sveta', 'parent' => null],
    ['path' => 'blog-dlya-nachinayushchih', 'name' => 'Блог для начинающих', 'slug' => 'blog-dlya-nachinayushchih', 'parent' => null],
    ['path' => 'book', 'name' => 'Книги', 'slug' => 'book', 'parent' => null],
];

$legacy_category_paths = [
    25 => 'news', 44 => 'blog/vestniki-peremen-g-chelyabinsk',
    1 => 'blog/vestniki-peremen-g-krasnoyarsk/blog-vestniki-peremen-g-krasnoyarsk',
    47 => 'blog-derzhava-sveta', 41 => 'blog/blog-aleksanra-lipnyagova',
    48 => 'blog-dlya-nachinayushchih', 38 => 'creation/kartinki',
    43 => 'meropriyatiya', 37 => 'creation/pesni', 39 => 'creation/prochee',
    36 => 'creation/stihi', 42 => 'blog/vestniki-peremen-g-krasnoyarsk',
    40 => 'blog', 26 => 'creation', 58 => 'book',
];

$term_ids = [];
foreach ($category_defs as $definition) {
    hroniki_import_term($definition, $term_ids);
}
WP_CLI::log('Категории: ' . count($term_ids));

$posts = hroniki_import_json(rtrim($data_dir, '/') . '/news-posts.json');
$post_count = 0;
foreach ($posts as $record) {
    if (($record['status'] ?? 'publish') !== 'publish') {
        continue;
    }
    $title = html_entity_decode(wp_strip_all_tags($record['title']['rendered'] ?? 'Без названия'), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $post_term_ids = [];
    foreach ($legacy_category_paths as $legacy_id => $path) {
        if (in_array($legacy_id, $record['categories'] ?? [], true)) {
            $post_term_ids[] = $term_ids[$path];
        }
    }
    $post_id = hroniki_import_upsert([
        'post_type' => 'post',
        'post_status' => 'publish',
        'post_title' => $title,
        'post_name' => sanitize_title($record['slug'] ?? $title),
        'post_content' => hroniki_import_localize($record['content']['rendered'] ?? '', $old_origin, $legacy_host),
        'post_excerpt' => html_entity_decode(wp_strip_all_tags($record['excerpt']['rendered'] ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8'),
        'post_date' => $record['date'] ?? current_time('mysql'),
        'post_date_gmt' => get_gmt_from_date($record['date'] ?? current_time('mysql')),
        'post_modified' => $record['modified'] ?? ($record['date'] ?? current_time('mysql')),
        'post_modified_gmt' => get_gmt_from_date($record['modified'] ?? ($record['date'] ?? current_time('mysql'))),
        'post_author' => 1,
    ], '_hroniki_legacy_wp_id', (string) ($record['id'] ?? ''));
    if ($post_id) {
        if ($post_term_ids) {
            wp_set_post_categories($post_id, array_values(array_unique($post_term_ids)));
        } else {
            wp_delete_object_term_relationships($post_id, 'category');
        }
        $legacy_id = (int) ($record['id'] ?? 0);
        $slug = sanitize_title($record['slug'] ?? '');
        $cover = hroniki_import_post_cover(
            rtrim($archive_dir, '/') . '/' . $slug . '/index.html',
            $legacy_id,
            $old_origin,
            $legacy_host
        );
        if ($cover !== '') {
            update_post_meta($post_id, '_hroniki_cover_url', esc_url_raw($cover));
        } else {
            delete_post_meta($post_id, '_hroniki_cover_url');
        }
        $post_count++;
    }
    if ($post_count && $post_count % 100 === 0) {
        WP_CLI::log('Материалы: ' . $post_count);
    }
}

$obsolete_materials = get_term_by('slug', 'materials', 'category');
if ($obsolete_materials instanceof WP_Term && (int) $obsolete_materials->count === 0) {
    wp_delete_term($obsolete_materials->term_id, 'category');
}

$local_book_files = [
    'bezkontaktnoe-zemledelie' => $legacy_host . '/wp-content/uploads/2022/01/bezkontaktnoe-zemledelie.pdf',
    'velikij-perehod-v-zolotoj-vek' => $legacy_host . '/wp-content/uploads/2022/01/2012-2018-velikii-perehod.pdf',
    'kniga-razumov-ili-polej' => $legacy_host . '/wp-content/uploads/2022/01/kniga-razumov-ili-polei-maket.pdf',
    'ontologiya-zla' => $legacy_host . '/wp-content/uploads/2022/01/ontologija-zla-maket.pdf',
    'kniga-sveta' => $legacy_host . '/wp-content/uploads/2022/01/02-kniga-sveta-pechat-verstka-maket.pdf',
    'istoriya-proishozhdeniya-russkogo-naroda' => $legacy_host . '/wp-content/uploads/2022/01/istorija.pdf',
    'o-slavyanah-i-russkom-yazyke-prezentaciya' => $legacy_host . '/wp-content/uploads/2022/06/RUSSKIJ-YaZYK-2.pdf',
];

$books = hroniki_import_json(rtrim($data_dir, '/') . '/books.json');
$book_count = 0;
foreach ($books as $record) {
    $slug = sanitize_title($record['slug'] ?? 'book-' . ($record['id'] ?? wp_rand()));
    $title = html_entity_decode(wp_strip_all_tags($record['title']['rendered'] ?? 'Без названия'), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $path = rtrim($archive_dir, '/') . '/book/' . $slug . '/index.html';
    $dom = hroniki_import_dom($path);
    $content = '';
    $cover = '';
    if ($dom) {
        $xpath = new DOMXPath($dom);
        $summary_nodes = $xpath->query("//*[contains(concat(' ', normalize-space(@class), ' '), ' mbm-book-summary-text ') or contains(concat(' ', normalize-space(@class), ' '), ' mbm-book-excerpt ')]");
        foreach ($summary_nodes ?: [] as $node) {
            $content .= hroniki_import_inner_html($node) . "\n";
        }
        $cover_node = $xpath->query("//*[@id='mbdb_book_cover']")->item(0);
        if ($cover_node instanceof DOMElement) {
            $cover = $cover_node->getAttribute('src');
        }
    }
    $content = hroniki_import_localize($content, $old_origin, $legacy_host);
    $cover = hroniki_import_localize($cover, $old_origin, $legacy_host);
    $post_id = hroniki_import_upsert([
        'post_type' => 'book',
        'post_status' => 'publish',
        'post_title' => $title,
        'post_name' => $slug,
        'post_content' => $content,
        'post_date' => $record['date'] ?? current_time('mysql'),
        'post_date_gmt' => get_gmt_from_date($record['date'] ?? current_time('mysql')),
        'post_author' => 1,
    ], '_hroniki_legacy_wp_id', (string) ($record['id'] ?? $slug));
    if ($post_id) {
        if ($cover) {
            update_post_meta($post_id, '_hroniki_cover_url', esc_url_raw($cover));
        }
        if (isset($local_book_files[$slug])) {
            update_post_meta($post_id, '_hroniki_book_file_url', $local_book_files[$slug]);
        }
        $book_count++;
    }
}

$home_id = hroniki_import_upsert([
    'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Главная', 'post_name' => 'glavnaya',
    'post_content' => '<p>Авторский сайт Ирины Ниловой с полным архивом материалов, книг, публикаций и новых записей.</p>',
    'post_author' => 1,
], '_hroniki_system_page', 'home');
$bio_content = hroniki_import_static_page_content(rtrim($archive_dir, '/') . '/biography/index.html', $old_origin, $legacy_host);
$bio_id = hroniki_import_upsert([
    'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'О нас', 'post_name' => 'biography',
    'post_content' => $bio_content, 'post_author' => 1,
], '_hroniki_system_page', 'biography');

$video_id = hroniki_import_upsert([
    'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Видео', 'post_name' => 'video',
    'post_content' => '<p>Видеоматериалы Ирины Ниловой. Каждая карточка открывает оригинальный ролик на YouTube.</p>', 'post_author' => 1,
], '_hroniki_system_page', 'video');
$video_dom = hroniki_import_dom(rtrim($archive_dir, '/') . '/video/index.html');
$videos = [];
if ($video_dom) {
    $video_xpath = new DOMXPath($video_dom);
    $nodes = $video_xpath->query("//a[contains(concat(' ', normalize-space(@class), ' '), ' sby_video_thumbnail ')]");
    foreach ($nodes ?: [] as $node) {
        if (!$node instanceof DOMElement) {
            continue;
        }
        $url = $node->getAttribute('href');
        $title = html_entity_decode($node->getAttribute('data-video-title'), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $thumb = $node->getAttribute('data-full-res');
        $srcset = json_decode($node->getAttribute('data-img-src-set'), true);
        if (is_array($srcset) && !empty($srcset['480'])) {
            $thumb = $srcset['480'];
        }
        if ($url && $title) {
            $videos[] = ['url' => $url, 'title' => $title, 'thumbnail' => hroniki_import_localize($thumb, $old_origin, $legacy_host)];
        }
    }
}
update_post_meta($video_id, '_hroniki_videos', $videos);

update_option('show_on_front', 'page');
update_option('page_on_front', $home_id);
update_option('page_for_posts', 0);
update_option('permalink_structure', '/%postname%/');
update_option('blogname', 'Хроники преображения Мира');
update_option('blogdescription', 'Авторский сайт Ирины Ниловой');
update_option('timezone_string', 'Europe/Moscow');
update_option('date_format', 'd.m.Y');
update_option('default_comment_status', 'closed');
update_option('default_ping_status', 'closed');
update_option('hroniki_footer_text', '© «Хроники преображения Мира». Все права защищены');
update_option('hroniki_youtube_url', 'https://www.youtube.com/channel/UCis2VTkLXQoIQaDfm3vzjMA/');
update_option('hroniki_home_news_count', 6);

$old_menu = wp_get_nav_menu_object('Основное меню');
if ($old_menu) {
    wp_delete_nav_menu($old_menu->term_id);
}
$menu_id = wp_create_nav_menu('Основное меню');
function hroniki_import_menu_item(int $menu_id, string $title, string $url, int $parent = 0, string $type = 'custom', int $object_id = 0, string $object = ''): int
{
    return (int) wp_update_nav_menu_item($menu_id, 0, [
        'menu-item-title' => $title, 'menu-item-url' => $url, 'menu-item-status' => 'publish',
        'menu-item-parent-id' => $parent, 'menu-item-type' => $type,
        'menu-item-object-id' => $object_id, 'menu-item-object' => $object,
    ]);
}
$home_menu = hroniki_import_menu_item($menu_id, 'Главная', home_url('/'));
hroniki_import_menu_item($menu_id, 'О нас', get_permalink($bio_id), 0, 'post_type', $bio_id, 'page');
hroniki_import_menu_item($menu_id, 'Новости', get_category_link($term_ids['news']), 0, 'taxonomy', $term_ids['news'], 'category');
hroniki_import_menu_item($menu_id, 'Книги', get_post_type_archive_link('book'));
$creation_menu = hroniki_import_menu_item($menu_id, 'Творчество', get_category_link($term_ids['creation']), 0, 'taxonomy', $term_ids['creation'], 'category');
foreach (['creation/stihi' => 'Стихи', 'creation/pesni' => 'Песни', 'creation/kartinki' => 'Картинки', 'creation/prochee' => 'Прочее'] as $path => $label) {
    hroniki_import_menu_item($menu_id, $label, get_category_link($term_ids[$path]), $creation_menu, 'taxonomy', $term_ids[$path], 'category');
}
hroniki_import_menu_item($menu_id, 'Видео', get_permalink($video_id), 0, 'post_type', $video_id, 'page');
hroniki_import_menu_item($menu_id, 'Мероприятия', get_category_link($term_ids['meropriyatiya']), 0, 'taxonomy', $term_ids['meropriyatiya'], 'category');
$blog_menu = hroniki_import_menu_item($menu_id, 'Блоги', get_category_link($term_ids['blog']), 0, 'taxonomy', $term_ids['blog'], 'category');
foreach ([
    'blog/blog-aleksanra-lipnyagova' => 'Блог Александра Липнягова',
    'blog/vestniki-peremen-g-krasnoyarsk' => 'Красноярск',
    'blog/vestniki-peremen-g-chelyabinsk' => 'Челябинск',
    'blog-derzhava-sveta' => 'Блог «Держава Света»',
    'blog-dlya-nachinayushchih' => 'Блог для начинающих',
] as $path => $label) {
    hroniki_import_menu_item($menu_id, $label, get_category_link($term_ids[$path]), $blog_menu, 'taxonomy', $term_ids[$path], 'category');
}
$locations = get_theme_mod('nav_menu_locations', []);
$locations['primary'] = $menu_id;
set_theme_mod('nav_menu_locations', $locations);

flush_rewrite_rules(false);
WP_CLI::success(sprintf('Импорт завершён: %d материалов, %d книг, %d видео.', $post_count, $book_count, count($videos)));
