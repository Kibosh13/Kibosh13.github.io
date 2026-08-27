<article <?php post_class('book-card'); ?>>
    <a class="book-cover" href="<?php the_permalink(); ?>">
        <?php $image = hroniki_first_image_url(); ?>
        <?php if ($image) : ?><img src="<?php echo esc_url($image); ?>" alt="Обложка: <?php echo esc_attr(get_the_title()); ?>" loading="lazy"><?php else : ?><span class="post-card-placeholder">Книга</span><?php endif; ?>
    </a>
    <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
</article>
