<?php get_header(); ?>
<div class="wrap page-shell">
    <?php while (have_posts()) : the_post(); ?>
        <article <?php post_class('article'); ?>>
            <nav class="breadcrumbs" aria-label="Хлебные крошки"><a href="<?php echo esc_url(home_url('/')); ?>">Главная</a><span>→</span><?php $cats = get_the_category(); if ($cats) : ?><a href="<?php echo esc_url(get_category_link($cats[0])); ?>"><?php echo esc_html($cats[0]->name); ?></a><span>→</span><?php endif; ?><span><?php the_title(); ?></span></nav>
            <h1><?php the_title(); ?></h1>
            <div class="article-date"><?php echo esc_html(get_the_date('d.m.Y')); ?></div>
            <?php if (has_post_thumbnail()) : the_post_thumbnail('large', ['class' => 'article-featured']); endif; ?>
            <div class="article-content"><?php the_content(); ?></div>
        </article>
    <?php endwhile; ?>
</div>
<?php get_footer(); ?>

