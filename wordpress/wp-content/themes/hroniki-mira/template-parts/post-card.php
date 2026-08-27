<article <?php post_class('source-post-list-item'); ?>>
    <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
    <div class="source-entry-meta"><?php hroniki_entry_meta(); ?></div>
    <div class="source-post-excerpt"><?php the_excerpt(); ?></div>
    <a class="source-read-more" href="<?php the_permalink(); ?>">Читать полностью »</a>
</article>

