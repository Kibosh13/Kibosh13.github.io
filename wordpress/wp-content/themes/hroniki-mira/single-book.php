<?php get_header(); ?>
<div class="wrap page-shell">
    <?php while (have_posts()) : the_post(); $cover = hroniki_first_image_url(); $file = hroniki_book_file_url(); ?>
        <article <?php post_class('article'); ?>>
            <nav class="breadcrumbs" aria-label="Хлебные крошки"><a href="<?php echo esc_url(home_url('/')); ?>">Главная</a><span>→</span><a href="<?php echo esc_url(get_post_type_archive_link('book')); ?>">Книги</a><span>→</span><span><?php the_title(); ?></span></nav>
            <div class="book-detail">
                <div>
                    <div class="book-cover"><?php if ($cover) : ?><img src="<?php echo esc_url($cover); ?>" alt="Обложка: <?php echo esc_attr(get_the_title()); ?>"><?php else : ?><span class="post-card-placeholder">Книга</span><?php endif; ?></div>
                    <?php if ($file) : ?><a class="button-link book-file-button" href="<?php echo esc_url($file); ?>" target="_blank" rel="noopener">Открыть / скачать книгу</a><?php endif; ?>
                </div>
                <div>
                    <h1><?php the_title(); ?></h1>
                    <div class="article-content"><?php the_content(); ?></div>
                    <?php if (!$file && current_user_can('edit_post', get_the_ID())) : ?><p><a href="<?php echo esc_url(get_edit_post_link()); ?>">Добавить файл книги в админке</a></p><?php endif; ?>
                </div>
            </div>
        </article>
    <?php endwhile; ?>
</div>
<?php get_footer(); ?>

