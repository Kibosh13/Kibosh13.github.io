<!doctype html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="screen-reader-text" href="#content">Перейти к содержимому</a>
<header class="site-header">
    <div class="wrap header-inner">
        <div class="site-branding">
            <?php if (has_custom_logo()) : ?>
                <?php the_custom_logo(); ?>
            <?php else : ?>
                <a class="site-title" href="<?php echo esc_url(home_url('/')); ?>"><?php bloginfo('name'); ?></a>
            <?php endif; ?>
            <?php if (get_bloginfo('description')) : ?><p class="site-description"><?php bloginfo('description'); ?></p><?php endif; ?>
        </div>
        <nav class="desktop-navigation" aria-label="Основное меню">
            <?php wp_nav_menu(['theme_location' => 'primary', 'container' => false, 'fallback_cb' => 'hroniki_primary_fallback', 'depth' => 3]); ?>
        </nav>
        <?php get_search_form(); ?>
        <button class="menu-toggle" type="button" aria-controls="mobile-menu" aria-expanded="false" aria-label="Открыть меню"><span></span><span></span><span></span></button>
    </div>
</header>
<div class="mobile-menu-layer" aria-hidden="true">
    <button class="mobile-menu-backdrop" type="button" data-menu-close aria-label="Закрыть меню"></button>
    <div class="mobile-menu-panel" id="mobile-menu" tabindex="-1">
        <div class="mobile-menu-head">
            <a href="<?php echo esc_url(home_url('/')); ?>"><?php bloginfo('name'); ?></a>
            <button class="mobile-menu-close" type="button" data-menu-close aria-label="Закрыть меню">×</button>
        </div>
        <nav class="mobile-navigation" aria-label="Мобильное меню">
            <?php wp_nav_menu(['theme_location' => 'primary', 'container' => false, 'fallback_cb' => 'hroniki_primary_fallback', 'depth' => 3]); ?>
        </nav>
        <?php get_search_form(['mobile' => true]); ?>
    </div>
</div>
<main class="site-main" id="content">
