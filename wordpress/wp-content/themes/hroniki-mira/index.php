<?php get_header(); ?>
<div class="wrap page-shell">
    <header class="archive-heading">
        <span class="eyebrow">Материалы</span>
        <h1><?php echo esc_html(is_home() ? 'Новости' : hroniki_archive_title()); ?></h1>
        <?php if (get_the_archive_description()) : ?><div><?php the_archive_description(); ?></div><?php endif; ?>
    </header>
    <?php if (have_posts()) : ?>
        <div class="post-grid"><?php while (have_posts()) : the_post(); get_template_part('template-parts/post', 'card'); endwhile; ?></div>
        <nav class="pagination" aria-label="Навигация по страницам"><?php the_posts_pagination(['mid_size' => 2, 'prev_text' => '←', 'next_text' => '→']); ?></nav>
    <?php else : ?><div class="empty-state">Материалы пока не опубликованы.</div><?php endif; ?>
</div>
<?php get_footer(); ?>
