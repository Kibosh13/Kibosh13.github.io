<?php
/**
 * Normalize remaining forms of the previous site name and old-domain links.
 * Run: wp eval-file fix-branding.php
 */

if (!defined('WP_CLI') || !WP_CLI) {
    fwrite(STDERR, "Run this file through WP-CLI.\n");
    exit(1);
}

function hroniki_brand_fix_text(string $text): string
{
    $separator = '(?:[\s\x{00A0}\-–—]|&nbsp;)+';
    $patterns = [
        '~ВЕСТНИКАМИ' . $separator . 'ПЕРЕМЕН~u' => 'ХРОНИКАМИ ПРЕОБРАЖЕНИЯ МИРА',
        '~ВЕСТНИКАХ' . $separator . 'ПЕРЕМЕН~u' => 'ХРОНИКАХ ПРЕОБРАЖЕНИЯ МИРА',
        '~ВЕСТНИКОВ' . $separator . 'ПЕРЕМЕН~u' => 'ХРОНИК ПРЕОБРАЖЕНИЯ МИРА',
        '~ВЕСТНИКАМ' . $separator . 'ПЕРЕМЕН~u' => 'ХРОНИКАМ ПРЕОБРАЖЕНИЯ МИРА',
        '~ВЕСТНИКИ' . $separator . 'ПЕРЕМЕН~u' => 'ХРОНИКИ ПРЕОБРАЖЕНИЯ МИРА',
        '~ВЕСТНИК' . $separator . 'ПЕРЕМЕН~u' => 'ХРОНИКИ ПРЕОБРАЖЕНИЯ МИРА',
        '~Вестниками' . $separator . 'Перемен~iu' => 'Хрониками преображения Мира',
        '~Вестниках' . $separator . 'Перемен~iu' => 'Хрониках преображения Мира',
        '~Вестников' . $separator . 'Перемен~iu' => 'Хроник преображения Мира',
        '~Вестникам' . $separator . 'Перемен~iu' => 'Хроникам преображения Мира',
        '~Вестники' . $separator . 'Перемен~iu' => 'Хроники преображения Мира',
        '~Вестник' . $separator . 'Перемен~iu' => 'Хроники преображения Мира',
    ];
    $text = preg_replace(array_keys($patterns), array_values($patterns), $text) ?? $text;
    return str_replace(
        ['https://вестники-перемен.рф/', 'http://вестники-перемен.рф/'],
        [home_url('/'), home_url('/')],
        $text
    );
}

$post_ids = get_posts([
    'post_type' => 'any',
    'post_status' => 'any',
    'numberposts' => -1,
    'fields' => 'ids',
]);
$updated = 0;

foreach ($post_ids as $post_id) {
    $post = get_post($post_id);
    if (!$post instanceof WP_Post) {
        continue;
    }
    $fields = [];
    foreach (['post_title', 'post_content', 'post_excerpt'] as $field) {
        $value = hroniki_brand_fix_text((string) $post->{$field});
        if ($value !== (string) $post->{$field}) {
            $fields[$field] = $value;
        }
    }
    if ($fields) {
        $fields['ID'] = $post_id;
        $result = wp_update_post(wp_slash($fields), true);
        if (is_wp_error($result)) {
            WP_CLI::warning($post_id . ': ' . $result->get_error_message());
            continue;
        }
        $updated++;
    }
}

WP_CLI::success('Обновлено материалов: ' . $updated);
