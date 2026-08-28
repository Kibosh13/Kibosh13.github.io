<?php
/**
 * Restore the original “Вестники Перемен” wording inside existing articles.
 *
 * The script uses the source JSON only to recover each exact grammatical and
 * typographic form. It does not overwrite article content, links, media or
 * later editorial changes.
 *
 * Dry run:
 * wp eval-file restore-article-branding.php /path/to/news-posts.json dry-run
 * Apply:
 * wp eval-file restore-article-branding.php /path/to/news-posts.json
 */

if (!defined('WP_CLI') || !WP_CLI) {
    fwrite(STDERR, "Run this file through WP-CLI.\n");
    exit(1);
}

$source_path = $args[0] ?? '';
$dry_run = ($args[1] ?? '') === 'dry-run';
if (!is_readable($source_path)) {
    WP_CLI::error('Не найден исходный JSON: ' . $source_path);
}

$source_posts = json_decode((string) file_get_contents($source_path), true);
if (!is_array($source_posts)) {
    WP_CLI::error('Некорректный JSON: ' . $source_path);
}

$separator = '(?:[\s\x{00A0}\-–—]|&nbsp;)+';
$old_pattern = '~(?:ВЕСТНИКАМИ|ВЕСТНИКАХ|ВЕСТНИКОВ|ВЕСТНИКАМ|ВЕСТНИКИ|ВЕСТНИК|Вестниками|Вестниках|Вестников|Вестникам|Вестники|Вестник)'
    . $separator . 'Перемен~iu';
$new_pattern = '~(?:ХРОНИКАМИ|ХРОНИКАХ|ХРОНИК|ХРОНИКАМ|ХРОНИКИ|Хрониками|Хрониках|Хроник|Хроникам|Хроники)'
    . $separator . 'преображения' . $separator . 'Мира~iu';

function hroniki_restore_original_mentions(
    string $current,
    string $source,
    string $old_pattern,
    string $new_pattern,
    int &$restored,
    bool &$mismatch
): string {
    preg_match_all($old_pattern, $source, $source_matches);
    preg_match_all($new_pattern, $current, $current_matches);
    preg_match_all($old_pattern, $current, $current_original_matches);
    $originals = $source_matches[0] ?? [];
    $replacements = $current_matches[0] ?? [];

    if (!$originals && !$replacements) {
        return $current;
    }
    if (!$replacements && count($current_original_matches[0] ?? []) >= count($originals)) {
        return $current;
    }
    if (count($originals) !== count($replacements)) {
        $mismatch = true;
        return $current;
    }

    $index = 0;
    $result = preg_replace_callback(
        $new_pattern,
        static function () use (&$index, $originals, &$restored): string {
            $restored++;
            return (string) $originals[$index++];
        },
        $current
    );
    return is_string($result) ? $result : $current;
}

$updated_posts = 0;
$updated_fields = 0;
$restored_mentions = 0;
$mismatches = [];
$missing_posts = [];
$source_slugs = [];

foreach ($source_posts as $record) {
    if (($record['status'] ?? 'publish') !== 'publish') {
        continue;
    }
    $slug = sanitize_title((string) ($record['slug'] ?? ''));
    if ($slug === '') {
        continue;
    }
    $source_slugs[$slug] = true;
    $post = get_page_by_path($slug, OBJECT, 'post');
    if (!$post instanceof WP_Post) {
        $missing_posts[] = $slug;
        continue;
    }

    $source_values = [
        'post_title' => html_entity_decode(
            wp_strip_all_tags((string) ($record['title']['rendered'] ?? '')),
            ENT_QUOTES | ENT_HTML5,
            'UTF-8'
        ),
        'post_content' => (string) ($record['content']['rendered'] ?? ''),
        'post_excerpt' => (string) ($record['excerpt']['rendered'] ?? ''),
    ];
    $changes = [];
    foreach ($source_values as $field => $source_value) {
        $field_restored = 0;
        $field_mismatch = false;
        $value = hroniki_restore_original_mentions(
            (string) $post->{$field},
            $source_value,
            $old_pattern,
            $new_pattern,
            $field_restored,
            $field_mismatch
        );
        if ($field_mismatch) {
            $mismatches[] = $slug . ':' . $field;
            continue;
        }
        if ($value !== (string) $post->{$field}) {
            $changes[$field] = $value;
            $updated_fields++;
            $restored_mentions += $field_restored;
        }
    }
    if (!$changes) {
        continue;
    }
    $updated_posts++;
    if ($dry_run) {
        continue;
    }
    $changes['ID'] = $post->ID;
    $result = wp_update_post(wp_slash($changes), true);
    if (is_wp_error($result)) {
        WP_CLI::warning($slug . ': ' . $result->get_error_message());
    }
}

// Restore the same wording in pages, books, menu labels and any newly added
// posts that are not present in the source export. Only the brand phrase is
// changed; all surrounding text and current edits remain untouched.
$generic_patterns = [
    '~ХРОНИКАМИ' . $separator . 'ПРЕОБРАЖЕНИЯ' . $separator . 'МИРА~u' => 'ВЕСТНИКАМИ ПЕРЕМЕН',
    '~ХРОНИКАХ' . $separator . 'ПРЕОБРАЖЕНИЯ' . $separator . 'МИРА~u' => 'ВЕСТНИКАХ ПЕРЕМЕН',
    '~ХРОНИК' . $separator . 'ПРЕОБРАЖЕНИЯ' . $separator . 'МИРА~u' => 'ВЕСТНИКОВ ПЕРЕМЕН',
    '~ХРОНИКАМ' . $separator . 'ПРЕОБРАЖЕНИЯ' . $separator . 'МИРА~u' => 'ВЕСТНИКАМ ПЕРЕМЕН',
    '~ХРОНИКИ' . $separator . 'ПРЕОБРАЖЕНИЯ' . $separator . 'МИРА~u' => 'ВЕСТНИКИ ПЕРЕМЕН',
    '~Хрониками' . $separator . 'преображения' . $separator . 'Мира~iu' => 'Вестниками Перемен',
    '~Хрониках' . $separator . 'преображения' . $separator . 'Мира~iu' => 'Вестниках Перемен',
    '~Хроник' . $separator . 'преображения' . $separator . 'Мира~iu' => 'Вестников Перемен',
    '~Хроникам' . $separator . 'преображения' . $separator . 'Мира~iu' => 'Вестникам Перемен',
    '~Хроники' . $separator . 'преображения' . $separator . 'Мира~iu' => 'Вестники Перемен',
];
$current_ids = get_posts([
    'post_type' => ['post', 'page', 'book', 'nav_menu_item'],
    'post_status' => 'publish',
    'numberposts' => -1,
    'fields' => 'ids',
]);
foreach ($current_ids as $post_id) {
    $post = get_post($post_id);
    if (!$post instanceof WP_Post || ($post->post_type === 'post' && isset($source_slugs[$post->post_name]))) {
        continue;
    }
    $changes = [];
    foreach (['post_title', 'post_content', 'post_excerpt'] as $field) {
        $value = preg_replace(array_keys($generic_patterns), array_values($generic_patterns), (string) $post->{$field});
        if (is_string($value) && $value !== (string) $post->{$field}) {
            $changes[$field] = $value;
            $updated_fields++;
            preg_match_all($old_pattern, $value, $matches);
            $restored_mentions += count($matches[0] ?? []);
        }
    }
    if (!$changes) {
        continue;
    }
    $updated_posts++;
    if ($dry_run) {
        continue;
    }
    $changes['ID'] = $post->ID;
    $result = wp_update_post(wp_slash($changes), true);
    if (is_wp_error($result)) {
        WP_CLI::warning($post->post_name . ': ' . $result->get_error_message());
    }
}

$term_names = [
    'blog-vestniki-peremen-g-krasnoyarsk' => 'Блог «Вестники Перемен» г. Красноярск',
    'vestniki-peremen-g-chelyabinsk' => '«Вестники Перемен» г. Челябинск',
];
$updated_terms = 0;
foreach ($term_names as $slug => $name) {
    $term = get_term_by('slug', $slug, 'category');
    if (!$term instanceof WP_Term || $term->name === $name) {
        continue;
    }
    $updated_terms++;
    if (!$dry_run) {
        wp_update_term($term->term_id, 'category', ['name' => $name]);
    }
}

WP_CLI::log(sprintf(
    'Режим: %s; материалов: %d; полей: %d; упоминаний: %d; категорий: %d; несовпадений: %d; отсутствуют: %d.',
    $dry_run ? 'проверка' : 'запись',
    $updated_posts,
    $updated_fields,
    $restored_mentions,
    $updated_terms,
    count($mismatches),
    count($missing_posts)
));
if ($mismatches) {
    WP_CLI::warning('Не изменены несовпавшие поля: ' . implode(', ', array_slice($mismatches, 0, 20)));
}
WP_CLI::success($dry_run ? 'Проверка завершена без записи.' : 'Исходное название в статьях восстановлено.');
