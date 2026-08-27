<?php get_header(); ?>
<div class="wrap page-shell">
    <header class="archive-heading"><span class="eyebrow">Библиотека</span><h1>Книги Ирины Ниловой</h1><p><?php echo esc_html(wp_strip_all_tags(hroniki_category_description())); ?></p></header>
    <?php if (have_posts()) : ?>
        <div class="book-grid"><?php while (have_posts()) : the_post(); get_template_part('template-parts/book', 'card'); endwhile; ?></div>
        <nav class="pagination" aria-label="Навигация по страницам"><?php the_posts_pagination(['mid_size' => 2, 'prev_text' => '←', 'next_text' => '→']); ?></nav>
    <?php else : ?><div class="empty-state">Книги пока не добавлены.</div><?php endif; ?>
</div>
<?php get_footer(); ?>

