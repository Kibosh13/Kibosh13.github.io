<?php
/**
 * Import every currently published PDF book from derzhava-sveta.webnode.ru.
 * Existing book text and covers are preserved; only the downloadable file is
 * attached. Missing books are created without overwriting any current entry.
 *
 * Dry run: wp eval-file import-book-files.php dry-run
 * Apply:   wp eval-file import-book-files.php
 */

if (!defined('WP_CLI') || !WP_CLI) {
    fwrite(STDERR, "Run this file through WP-CLI.\n");
    exit(1);
}

$dry_run = ($args[0] ?? '') === 'dry-run';
$source_origin = 'https://derzhava-sveta.webnode.ru';
$books = [
    ['slug' => '21-shag-k-novoj-zhizni', 'title' => '21 Шаг к Новой Жизни', 'page' => '/a21-shag-k-novoj-zhizni/', 'file' => '21-shag-k-novoj-zhizni.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200002064-1c69a1c69c/21%20%D0%A8%D0%90%D0%93%20%D0%9A%20%D0%9D%D0%9E%D0%92%D0%9E%D0%99%20%D0%96%D0%98%D0%97%D0%9D%D0%98%20%D0%BF%D1%80%D0%B0%D0%B2%D0%BA%D0%B82%20(1).pdf'],
    ['slug' => 'da-budet-svet', 'title' => 'Да будет Свет', 'page' => '/da-budet-svet/', 'file' => 'da-budet-svet.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200001996-059f605edc/%D0%9A%D0%9D%D0%98%D0%93%D0%901%20%D0%B2%D0%B5%D1%80%D1%81%D1%82%D0%BA%D0%B0%20%D0%94%D0%90%20%D0%91%D0%A3%D0%94%D0%95%D0%A2%20%D0%A1%D0%92%D0%95%D0%A2.pdf'],
    ['slug' => '1951', 'title' => 'Держава Света — Венец Человечества', 'page' => '/derzhava-sveta-venets-chelovechestva/', 'file' => 'derzhava-sveta-venets-chelovechestva.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200002043-686bd686bf/%D0%94%D0%B5%D1%80%D0%B6%D0%B0%D0%B2%D0%B0%20%D1%81%D0%B2%D0%B5%D1%82%D0%B0%20%20%D0%9E%D0%9A.pdf'],
    ['slug' => '1891', 'title' => 'Единый язык человечества', 'page' => '/edinyj-yazyk-chelovechestva/', 'file' => 'edinyj-yazyk-chelovechestva.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200001979-2f0552ffeb/%D0%95%D0%94%D0%98%D0%9D%D0%AB%D0%99%20%D0%AF%D0%97%D0%AB%D0%9A%20%D0%A7%D0%95%D0%9B%D0%9E%D0%92%D0%95%D0%A7%D0%95%D0%A1%D0%A2%D0%92%D0%90.pdf'],
    ['slug' => 'garmonichnyj-chelovek', 'title' => 'Гармоничный человек', 'page' => '/garmonichnyj-chelovek/', 'file' => 'garmonichnyj-chelovek.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200002021-7a7e97b79a/%D0%A0%D0%9E%D0%96%D0%94%D0%95%D0%9D%D0%98%D0%95%20%D0%A7%D0%95%D0%9B%D0%9E%D0%92%D0%95%D0%9A%D0%90.pdf'],
    ['slug' => 'ishhu-cheloveka', 'title' => 'Ищу человека', 'page' => '/ishchu-cheloveka/', 'file' => 'ishhu-cheloveka.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200002014-5352154496/%D0%98%D0%A9%D0%A3%20%D0%A7%D0%95%D0%9B%D0%9E%D0%92%D0%95%D0%9A%D0%90%20(1).pdf'],
    ['slug' => 'obraz-budushhego-rossii', 'title' => 'Образ Будущего России', 'page' => '/kniga-obraz-budushchego-rossii/', 'file' => 'obraz-budushhego-rossii.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200002141-39f1339f16/%D0%9E%D0%91%D0%A0%D0%90%D0%97%20%D0%91%D0%A3%D0%94%D0%A3%D0%A9%D0%95%D0%93%D0%9E%20%D0%A0%D0%9E%D0%A1%D0%A1%D0%98%D0%98%20-%20%D0%94%D0%95%D0%A0%D0%96%D0%90%D0%92%D0%90%20%D0%A1%D0%92%D0%95%D0%A2%D0%90.pdf'],
    ['slug' => 'kniga-sveta', 'title' => 'Книга Света', 'page' => '/kniga-sveta/', 'file' => 'kniga-sveta.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200001980-d8f72d9ea3/02%20%D0%9A%D0%9D%D0%98%D0%93%D0%90%20%D0%A1%D0%92%D0%95%D0%A2%D0%90.pdf'],
    ['slug' => 'kodeks-bytiya', 'title' => 'Кодекс Бытия', 'page' => '/kodeks-bytiya/', 'file' => 'kodeks-bytiya.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200002118-413e8413ec/%D0%9A%D0%9E%D0%94%D0%95%D0%9A%D0%A1%20%20%20%D0%91%D0%AB%D0%A2%D0%98%D0%AF.pdf'],
    ['slug' => 'kratkaya-letopis-chelovechestva', 'title' => 'Краткая летопись человечества', 'page' => '/kratkaya-letopis-chelovechestva/', 'file' => 'kratkaya-letopis-chelovechestva.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200002036-497494a6b5/%D0%9A%D0%A0%D0%90%D0%A2%D0%9A%D0%90%D0%AF%20%D0%9B%D0%95%D0%A2%D0%9E%D0%9F%D0%98%D0%A1%D0%AC%20%D0%A7%D0%95%D0%9B%D0%9E%D0%92%D0%95%D0%A7%D0%95%D0%A1%D0%A2%D0%92%D0%90.pdf'],
    ['slug' => 'naivnoe-svetopredstavlenie', 'title' => 'Наивное Светопредставление', 'page' => '/naivnoe-svetopredstavlenie/', 'file' => 'naivnoe-svetopredstavlenie.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200002091-e6498e649b/%D0%9D%D0%B0%D0%B8%D0%B2%D0%BD%D0%BE%D0%B5%20%D0%A1%D0%B2%D0%B5%D1%82%D0%BE%D0%BF%D1%80%D0%B5%D0%B4%D1%81%D1%82%D0%B0%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5.pdf'],
    ['slug' => 'o-religii', 'title' => 'О религии', 'page' => '/o-religii/', 'file' => 'o-religii.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200002099-2584325845/%D0%9E%20%D0%A0%D0%95%D0%9B%D0%98%D0%93%D0%98%D0%98.pdf'],
    ['slug' => 'realizacionnyj-proekt-derzhava-sveta', 'title' => 'Реализационный проект «ДЕРЖАВА СВЕТА»', 'page' => '/proekt-derzhava-sveta/', 'file' => 'realizacionnyj-proekt-derzhava-sveta.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200001985-3cb843df1b/%D0%A0%D0%95%D0%90%D0%9B%D0%98%D0%97%D0%90%D0%A6%D0%98%D0%9E%D0%9D%D0%9D%D0%AB%D0%99%20%D0%9F%D0%A0%D0%9E%D0%95%D0%9A%D0%A2%20%D0%94%D0%B5%D1%80%D0%B6%D0%B0%D0%B2%D0%B0%20%D0%A1%D0%B2%D0%B5%D1%82%D0%B0.pdf'],
    ['slug' => 'put-domoj', 'title' => 'Путь домой', 'page' => '/put-domoj/', 'file' => 'put-domoj.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200002004-b5c44b6bdc/%D0%9F%D0%A3%D0%A2%D0%AC%20%D0%94%D0%9E%D0%9C%D0%9E%D0%99%20%D0%B2%D0%B5%D1%80%D1%81%D1%82%D0%BA%D0%B01.pdf'],
    ['slug' => 'matrica-bozhestvennogo-tvoreniya-russkij-yazyk', 'title' => 'Матрица Божественного творения — Русский язык', 'page' => '/russkij-yazyk-kak-chast-matritsy-tvoreniya/', 'file' => 'matrica-russkogo-yazyka.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200002044-cdb90cdb93/%D0%9C%D0%90%D0%A2%D0%A0%D0%98%D0%A6%D0%90%20%D0%A0%D0%A3%D0%A1%D0%A1%D0%9A%D0%9E%D0%93%D0%9E%20%D0%AF%D0%97%D0%AB%D0%9A%D0%90.pdf'],
    ['slug' => 'russkij-yazyk-kotoryj-ne-znaem-sovsem', 'title' => 'Русский язык, который не знаем совсем', 'page' => '/russkij-yazyk-kotoryj-ne-znaem-sovsem/', 'file' => 'russkij-yazyk-kotoryj-ne-znaem-sovsem.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200002119-71f5771f5a/%D0%A0%D0%A3%D0%A1%D0%A1%D0%9A%D0%98%D0%99%20%D0%AF%D0%97%D0%AB%D0%9A%20%D0%9F%D0%94%D0%A4.pdf'],
    ['slug' => 'shkola-dlya-vozhdya', 'title' => 'Школа для Вождя', 'page' => '/shkola-1-2-tom2/', 'file' => 'shkola-dlya-vozhdya-1-2.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200002089-8ef188ef1a/%D1%88%D0%BA%D0%BE%D0%BB%D0%B0%201-2.pdf'],
    ['slug' => 'shkola-dlya-vozhdya-2', 'title' => 'Школа для Вождя. Том 3–4', 'page' => '/shkola-3-4-tom/', 'file' => 'shkola-dlya-vozhdya-3-4.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200002090-930af930b1/%D1%88%D0%BA%D0%BE%D0%BB%D0%B0%203-4.pdf'],
    ['slug' => 'strategicheskie-cherty-uklada-gosudarstva-principialno-novogo-tipa', 'title' => 'Стратегические черты уклада Государства Принципиально Нового Типа', 'page' => '/strategicheskie-cherty-uklada-gosudarstva-printsipialno-novogo-tipa/', 'file' => 'strategicheskie-cherty-uklada-gosudarstva.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200002022-bc7d2bd789/%D0%A1%D0%A2%D0%A0%D0%90%D0%A2%D0%95%D0%93%D0%98%D0%A7%D0%95%D0%A1%D0%9A%D0%98%D0%95%20%D0%A7%D0%95%D0%A0%D0%A2%D0%AB%20%D0%A3%D0%9A%D0%9B%D0%90%D0%94%D0%90%20%D0%93%D0%9E%D0%A1%D0%A3%D0%94%D0%90%D0%A0%D0%A1%D0%A2%D0%92%D0%90%20%D0%9F%D0%A0%D0%98%D0%9D%D0%A6%D0%98%D0%9F%D0%98%D0%90%D0%9B%D0%AC%D0%9D%D0%9E%20%D0%9D%D0%9E%D0%92%D0%9E%D0%93%D0%9E%20%D0%A2%D0%98%D0%9F%D0%90.pdf'],
    ['slug' => 'teoriya-absoljutnogo-sveta', 'title' => 'Теория Абсолютного Света', 'page' => '/teoriya-absolyut-sveta/', 'file' => 'teoriya-absoljutnogo-sveta.pdf', 'url' => 'https://f99bb37fcb.clvaw-cdnwnd.com/4ad9b695043bbc104fcd5b4d092f2241/200002030-7850f794b8/%D0%A2%D0%90%D0%A1%20%D0%9D%D0%90%20%D0%A4%D0%90%D0%99%D0%9B%D0%953%20%D0%BF%D1%80%D0%B0%D0%B2%D0%BA%D0%B0%20%E2%80%94%20%D0%BA%D0%BE%D0%BF%D0%B8%D1%8F.pdf'],
];

if ($dry_run) {
    $existing = 0;
    foreach ($books as $book) {
        if (get_page_by_path($book['slug'], OBJECT, 'book') instanceof WP_Post) {
            $existing++;
        }
    }
    WP_CLI::success(sprintf('Проверено файлов: %d; существующих книг: %d; новых книг: %d.', count($books), $existing, count($books) - $existing));
    return;
}

require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

$uploaded = 0;
$created = 0;
$skipped = 0;
foreach ($books as $book) {
    $post = get_page_by_path($book['slug'], OBJECT, 'book');
    if (!$post instanceof WP_Post) {
        $post_id = wp_insert_post(wp_slash([
            'post_type' => 'book',
            'post_status' => 'publish',
            'post_name' => $book['slug'],
            'post_title' => $book['title'],
            'post_content' => '<p>Книга Ирины Ниловой.</p>',
        ]), true);
        if (is_wp_error($post_id)) {
            WP_CLI::warning($book['slug'] . ': ' . $post_id->get_error_message());
            continue;
        }
        $post = get_post((int) $post_id);
        $created++;
    }

    $existing_id = (int) get_post_meta($post->ID, '_hroniki_book_file_id', true);
    $existing_source = (string) get_post_meta($post->ID, '_hroniki_source_pdf_url', true);
    if ($existing_id && get_post($existing_id) instanceof WP_Post && $existing_source === $book['url']) {
        if (!get_post_thumbnail_id($post->ID) && !get_post_meta($post->ID, '_hroniki_cover_url', true)) {
            $preview_url = wp_get_attachment_image_url($existing_id, 'large');
            if ($preview_url) {
                update_post_meta($post->ID, '_hroniki_cover_url', $preview_url);
            }
        }
        $skipped++;
        continue;
    }

    $tmp = download_url($book['url'], 300);
    if (is_wp_error($tmp)) {
        WP_CLI::warning($book['slug'] . ': ' . $tmp->get_error_message());
        continue;
    }
    $attachment_id = media_handle_sideload([
        'name' => $book['file'],
        'tmp_name' => $tmp,
    ], $post->ID, $book['title']);
    if (is_wp_error($attachment_id)) {
        @unlink($tmp);
        WP_CLI::warning($book['slug'] . ': ' . $attachment_id->get_error_message());
        continue;
    }

    $local_url = wp_get_attachment_url((int) $attachment_id);
    update_post_meta($post->ID, '_hroniki_book_file_id', (int) $attachment_id);
    update_post_meta($post->ID, '_hroniki_book_file_url', (string) $local_url);
    update_post_meta($post->ID, '_hroniki_source_pdf_url', $book['url']);
    update_post_meta($post->ID, '_hroniki_source_page_url', $source_origin . $book['page']);
    if (!get_post_thumbnail_id($post->ID) && !get_post_meta($post->ID, '_hroniki_cover_url', true)) {
        $preview_url = wp_get_attachment_image_url((int) $attachment_id, 'large');
        if ($preview_url) {
            update_post_meta($post->ID, '_hroniki_cover_url', $preview_url);
        }
    }
    $uploaded++;
    WP_CLI::log($book['title'] . ' → ' . $local_url);
}

WP_CLI::success(sprintf('Загружено: %d; создано книг: %d; уже актуальны: %d.', $uploaded, $created, $skipped));
