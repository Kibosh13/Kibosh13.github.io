<?php get_header(); ?>
<?php
$legacy_uploads = home_url('/archive/hosts/xn----ctbjbaararyeivphq.xn--p1ai/wp-content/uploads/2022/01/');
$home_book_covers = [
    'Screenshot_177.jpg',
    'Screenshot_175-200x300.jpg',
    'Screenshot_174-223x300.jpg',
    'Screenshot_176-197x300.jpg',
    '20220127_133738-195x300.jpg',
    '20220127_133728-195x300.jpg',
];
$home_book_ids = array_slice(array_values(array_filter(array_map('absint', (array) get_option('hroniki_home_book_ids', [])))), 0, 6);
$home_selected_books = $home_book_ids ? get_posts([
    'post_type' => 'book',
    'post_status' => 'publish',
    'post__in' => $home_book_ids,
    'orderby' => 'post__in',
    'numberposts' => 6,
]) : [];
$home_first_image = (string) get_option('hroniki_home_first_image_url') ?: $legacy_uploads . '11211.jpg';
$home_second_image = (string) get_option('hroniki_home_second_image_url') ?: $legacy_uploads . '11311.jpg';
$home_second_title = (string) get_option('hroniki_home_second_title') ?: 'О задачах общественного движения «Хроники преображения Мира»';
$home_second_text = (string) get_option('hroniki_home_second_text') ?: 'И.Н. Мы зарегистрировали движение «Хроники преображения Мира». Что дальше? В чём наша задача? Теперь, задним умом уже становится понятно, что надо было бы указать, каких именно перемен мы желаем, а именно СВЕТЛЫХ! Но мы ведь не указали это в своём названии. Как быть с этим недочётом?';
$home_publications_title = (string) get_option('hroniki_home_publications_title') ?: 'Публикации «Хроники преображения Мира»';
$home_books_title = (string) get_option('hroniki_home_books_title') ?: 'Книги Ирины Ниловой';
$home_video_title = (string) get_option('hroniki_home_video_title') ?: 'Видео';
$home_video_image = (string) get_option('hroniki_home_video_image_url') ?: $legacy_uploads . 'Screenshot_179.jpg';
?>

<?php while (have_posts()) : the_post(); ?>
    <section class="source-home-intro">
        <div class="wrap source-home-features">
            <article class="source-home-feature">
                <div class="source-home-copy">
                    <div class="source-home-text"><?php the_content(); ?></div>
                    <a class="source-button" href="<?php echo esc_url(home_url('/biography/')); ?>">Читать далее..</a>
                </div>
                <div class="source-home-image">
                    <img src="<?php echo esc_url($home_first_image); ?>" alt="Символ общественного движения на фоне моря и радуги">
                </div>
            </article>

            <article class="source-home-feature is-reversed">
                <div class="source-home-image">
                    <img src="<?php echo esc_url($home_second_image); ?>" alt="Символ движения на фоне моря и радуги">
                </div>
                <div class="source-home-copy">
                    <h2><?php echo esc_html($home_second_title); ?></h2>
                    <p><?php echo nl2br(esc_html($home_second_text)); ?></p>
                    <a class="source-button" href="<?php echo esc_url(home_url('/biography/#ozad')); ?>">Читать далее..</a>
                </div>
            </article>
        </div>
    </section>
<?php endwhile; ?>

<section class="source-home-section source-home-publications">
    <div class="wrap">
        <h2><?php echo esc_html($home_publications_title); ?></h2>
        <?php
        $latest = new WP_Query([
            'post_type' => 'post',
            'post_status' => 'publish',
            'posts_per_page' => max(1, (int) get_option('hroniki_home_news_count', 6)),
            'ignore_sticky_posts' => true,
        ]);
        ?>
        <?php if ($latest->have_posts()) : ?>
            <div class="source-publication-grid">
                <?php while ($latest->have_posts()) : $latest->the_post(); ?>
                    <article class="source-publication-card">
                        <h3><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>
                        <div class="source-publication-date"><?php echo esc_html(get_the_date('j F, Y')); ?></div>
                        <div class="source-publication-excerpt"><?php echo esc_html(wp_trim_words(wp_strip_all_tags(get_the_excerpt()), 28, '…')); ?></div>
                    </article>
                <?php endwhile; ?>
            </div>
        <?php endif; wp_reset_postdata(); ?>
    </div>
</section>

<section class="source-home-section source-home-books">
    <div class="wrap">
        <h2><?php echo esc_html($home_books_title); ?></h2>
        <div class="source-carousel" data-home-carousel>
            <button class="source-carousel-arrow is-prev" type="button" data-carousel-prev aria-label="Предыдущие книги">‹</button>
            <div class="source-carousel-track" data-carousel-track>
                <?php if ($home_selected_books) : ?>
                    <?php foreach ($home_selected_books as $book) : $cover = hroniki_first_image_url($book); ?>
                        <a class="source-carousel-slide" href="<?php echo esc_url(get_permalink($book)); ?>">
                            <?php if ($cover) : ?><img src="<?php echo esc_url($cover); ?>" alt="<?php echo esc_attr($book->post_title); ?>" loading="lazy"><?php endif; ?>
                        </a>
                    <?php endforeach; ?>
                <?php else : ?>
                    <?php foreach ($home_book_covers as $index => $cover) : ?>
                        <a class="source-carousel-slide" href="<?php echo esc_url(get_post_type_archive_link('book')); ?>">
                            <img src="<?php echo esc_url($legacy_uploads . $cover); ?>" alt="Книга Ирины Ниловой <?php echo esc_attr((string) ($index + 1)); ?>" loading="lazy">
                        </a>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
            <button class="source-carousel-arrow is-next" type="button" data-carousel-next aria-label="Следующие книги">›</button>
        </div>
        <div class="source-home-action"><a class="source-button" href="<?php echo esc_url(get_post_type_archive_link('book')); ?>">Все книги..</a></div>
    </div>
</section>

<section class="source-home-section source-home-video">
    <div class="wrap">
        <h2><?php echo esc_html($home_video_title); ?></h2>
        <a class="source-home-video-image" href="<?php echo esc_url(home_url('/video/')); ?>">
            <img src="<?php echo esc_url($home_video_image); ?>" alt="Перейти к видеоматериалам" loading="lazy">
            <span aria-hidden="true">▶</span>
        </a>
        <div class="source-home-action"><a class="source-button" href="<?php echo esc_url(home_url('/video/')); ?>">Перейти..</a></div>
    </div>
</section>

<?php get_footer(); ?>
