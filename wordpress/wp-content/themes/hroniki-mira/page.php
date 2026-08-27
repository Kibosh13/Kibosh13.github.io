<?php get_header(); ?>
<div class="wrap page-shell">
    <?php while (have_posts()) : the_post(); ?>
        <article <?php post_class('article'); ?>><nav class="breadcrumbs"><a href="<?php echo esc_url(home_url('/')); ?>">Главная</a><span>→</span><span><?php the_title(); ?></span></nav><h1><?php the_title(); ?></h1><div class="article-content"><?php the_content(); ?></div></article>
    <?php endwhile; ?>
</div>
<?php get_footer(); ?>

