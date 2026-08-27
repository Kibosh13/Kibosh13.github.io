<?php get_header(); ?>
<div class="wrap page-shell">
    <?php while (have_posts()) : the_post(); ?>
        <header class="archive-heading"><span class="eyebrow">YouTube</span><h1><?php the_title(); ?></h1><div><?php the_content(); ?></div><?php $channel = (string) get_option('hroniki_youtube_url'); if ($channel) : ?><p><a class="button-link" href="<?php echo esc_url($channel); ?>" target="_blank" rel="noopener">Открыть YouTube-канал</a></p><?php endif; ?></header>
        <?php $videos = get_post_meta(get_the_ID(), '_hroniki_videos', true); if (is_array($videos) && $videos) : ?>
            <div class="video-grid"><?php foreach ($videos as $video) : ?><article class="video-card"><a class="video-card-thumb" href="<?php echo esc_url($video['url']); ?>" target="_blank" rel="noopener"><img src="<?php echo esc_url($video['thumbnail']); ?>" alt="" loading="lazy"></a><h2><a href="<?php echo esc_url($video['url']); ?>" target="_blank" rel="noopener"><?php echo esc_html($video['title']); ?></a></h2></article><?php endforeach; ?></div>
        <?php endif; ?>
    <?php endwhile; ?>
</div>
<?php get_footer(); ?>

