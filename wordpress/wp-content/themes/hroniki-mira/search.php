<?php get_header(); ?>
<div class="wrap source-content-layout">
    <div class="source-archive-column">
        <header class="source-archive-heading"><h1>Поиск: <?php echo esc_html(get_search_query()); ?></h1></header>
        <?php if (have_posts()) : ?>
            <div class="source-post-list"><?php while (have_posts()) : the_post(); get_template_part('template-parts/post', 'card'); endwhile; ?></div>
            <nav class="pagination"><?php the_posts_pagination(); ?></nav>
        <?php else : ?><div class="empty-state"><p>Ничего не найдено. Попробуйте изменить запрос.</p><?php get_search_form(['mobile' => true]); ?></div><?php endif; ?>
    </div>
    <?php get_template_part('template-parts/sidebar', 'recent'); ?>
</div>
<?php get_footer(); ?>

