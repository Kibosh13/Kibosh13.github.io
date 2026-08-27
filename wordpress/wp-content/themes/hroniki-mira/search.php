<?php get_header(); ?>
<div class="wrap page-shell">
    <header class="archive-heading"><span class="eyebrow">Поиск</span><h1>Результаты: <?php echo esc_html(get_search_query()); ?></h1></header>
    <?php if (have_posts()) : ?><div class="post-grid"><?php while (have_posts()) : the_post(); get_template_part('template-parts/post', 'card'); endwhile; ?></div><nav class="pagination"><?php the_posts_pagination(); ?></nav><?php else : ?><div class="empty-state"><p>Ничего не найдено. Попробуйте изменить запрос.</p><?php get_search_form(['mobile' => true]); ?></div><?php endif; ?>
</div>
<?php get_footer(); ?>

