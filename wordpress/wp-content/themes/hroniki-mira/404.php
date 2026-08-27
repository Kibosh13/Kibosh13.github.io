<?php get_header(); ?>
<div class="wrap page-shell"><div class="article"><span class="eyebrow">Ошибка 404</span><h1>Страница не найдена</h1><p>Возможно, адрес изменился. Воспользуйтесь поиском или вернитесь на главную.</p><div class="search-page-form"><?php get_search_form(['mobile' => true]); ?></div><p><a class="button-link" href="<?php echo esc_url(home_url('/')); ?>">На главную</a></p></div></div>
<?php get_footer(); ?>

