<?php get_header(); ?>
<div class="wrap source-content-layout is-single">
    <div class="source-archive-column">
        <?php while (have_posts()) : the_post(); ?>
            <article <?php post_class('source-single-post'); ?>>
                <header class="source-single-header">
                    <h1><?php the_title(); ?></h1>
                    <div class="source-entry-meta"><?php hroniki_entry_meta(); ?></div>
                </header>
                <?php if (has_post_thumbnail()) : the_post_thumbnail('large', ['class' => 'source-single-featured']); endif; ?>
                <div class="article-content"><?php the_content(); ?></div>
            </article>
        <?php endwhile; ?>
    </div>
    <?php get_template_part('template-parts/sidebar', 'recent'); ?>
</div>
<?php get_footer(); ?>

