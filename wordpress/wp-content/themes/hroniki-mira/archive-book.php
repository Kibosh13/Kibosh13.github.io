<?php get_header(); ?>
<section class="source-library-hero"><div class="wrap"><h1>Книги</h1></div></section>
<div class="wrap source-library-content">
    <?php if (have_posts()) : ?>
        <div class="book-grid"><?php while (have_posts()) : the_post(); get_template_part('template-parts/book', 'card'); endwhile; ?></div>
        <nav class="pagination" aria-label="Навигация по страницам"><?php the_posts_pagination(['mid_size' => 2, 'prev_text' => '←', 'next_text' => '→']); ?></nav>
    <?php else : ?><div class="empty-state">Книги пока не добавлены.</div><?php endif; ?>
</div>
<?php get_footer(); ?>

