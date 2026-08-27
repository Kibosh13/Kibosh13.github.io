<article <?php post_class('post-card'); ?>>
    <a class="post-card-image" href="<?php the_permalink(); ?>" aria-hidden="true" tabindex="-1">
        <?php $image = hroniki_first_image_url(); ?>
        <?php if ($image) : ?><img src="<?php echo esc_url($image); ?>" alt="" loading="lazy"><?php else : ?><span class="post-card-placeholder">ХМ</span><?php endif; ?>
    </a>
    <div class="post-card-body">
        <div class="post-meta"><?php echo esc_html(get_the_date('d.m.Y')); ?><?php $category = get_the_category(); if ($category) : ?> · <?php echo esc_html($category[0]->name); ?><?php endif; ?></div>
        <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
        <?php the_excerpt(); ?>
        <a class="read-more" href="<?php the_permalink(); ?>">Читать →</a>
    </div>
</article>

