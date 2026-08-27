<?php get_header(); ?>
<div class="wrap source-book-shell">
    <?php while (have_posts()) : the_post(); $cover = hroniki_first_image_url(); $file = hroniki_book_file_url(); ?>
        <article <?php post_class('source-book-article'); ?>>
            <h1><?php the_title(); ?></h1>
            <div class="book-detail">
                <div class="source-book-cover-column">
                    <div class="book-cover"><?php if ($cover) : ?><img src="<?php echo esc_url($cover); ?>" alt="Обложка: <?php echo esc_attr(get_the_title()); ?>"><?php else : ?><span class="post-card-placeholder">Книга</span><?php endif; ?></div>
                    <?php if ($file) : ?><div class="source-download-label">Скачать книгу:</div><a class="source-button book-file-button" href="<?php echo esc_url($file); ?>" target="_blank" rel="noopener">Открыть / скачать</a><?php endif; ?>
                </div>
                <div class="article-content">
                    <?php the_content(); ?>
                    <?php if (!$file && current_user_can('edit_post', get_the_ID())) : ?><p><a href="<?php echo esc_url(get_edit_post_link()); ?>">Добавить файл книги в админке</a></p><?php endif; ?>
                </div>
            </div>
        </article>
    <?php endwhile; ?>
</div>
<?php get_footer(); ?>

