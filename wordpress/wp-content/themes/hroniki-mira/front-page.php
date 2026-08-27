<?php get_header(); ?>
<?php while (have_posts()) : the_post(); ?>
    <section class="hero">
        <div class="wrap hero-inner">
            <div class="eyebrow">Авторский сайт Ирины Ниловой</div>
            <h1><?php bloginfo('name'); ?></h1>
            <div class="hero-content"><?php the_content(); ?></div>
            <div class="hero-actions">
                <a class="button-link" href="<?php echo esc_url(home_url('/category/news/')); ?>">Последние новости</a>
                <a class="button-link is-light" href="<?php echo esc_url(get_post_type_archive_link('book')); ?>">Книги автора</a>
            </div>
        </div>
    </section>
<?php endwhile; ?>

<section class="home-section">
    <div class="wrap">
        <div class="section-heading"><div><span class="eyebrow">Обновления</span><h2>Последние материалы</h2></div><a href="<?php echo esc_url(home_url('/category/news/')); ?>">Все новости →</a></div>
        <?php $latest = new WP_Query(['post_type' => 'post', 'post_status' => 'publish', 'posts_per_page' => (int) get_option('hroniki_home_news_count', 6), 'ignore_sticky_posts' => true]); ?>
        <?php if ($latest->have_posts()) : ?><div class="post-grid"><?php while ($latest->have_posts()) : $latest->the_post(); get_template_part('template-parts/post', 'card'); endwhile; ?></div><?php endif; wp_reset_postdata(); ?>
    </div>
</section>

<section class="home-section is-soft">
    <div class="wrap">
        <div class="section-heading"><div><span class="eyebrow">Библиотека</span><h2>Книги Ирины Ниловой</h2></div><a href="<?php echo esc_url(get_post_type_archive_link('book')); ?>">Все книги →</a></div>
        <?php $books = new WP_Query(['post_type' => 'book', 'post_status' => 'publish', 'posts_per_page' => 8, 'orderby' => 'date', 'order' => 'DESC']); ?>
        <?php if ($books->have_posts()) : ?><div class="book-grid"><?php while ($books->have_posts()) : $books->the_post(); get_template_part('template-parts/book', 'card'); endwhile; ?></div><?php endif; wp_reset_postdata(); ?>
    </div>
</section>
<?php get_footer(); ?>

