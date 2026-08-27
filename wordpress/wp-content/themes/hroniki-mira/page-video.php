<?php get_header(); ?>
<?php while (have_posts()) : the_post(); ?>
    <?php
    $videos = get_post_meta(get_the_ID(), '_hroniki_videos', true);
    $videos = is_array($videos) ? $videos : [];
    $channel = (string) get_option('hroniki_youtube_url', 'https://www.youtube.com/channel/UCis2VTkLXQoIQaDfm3vzjMA/');
    $avatar = home_url('/archive/hosts/yt3.ggpht.com/ytc/AKedOLRAeAVpWvaJz7S-qpkJx4Dk4VPG7AWU_UZL8JMn=s88-c-k-c0x00ffffff-no-rj.jpg');
    ?>
    <section class="source-library-hero is-video"><div class="wrap"><h1><?php the_title(); ?></h1></div></section>
    <section class="source-video-content">
        <div class="wrap">
            <a class="source-video-author" href="<?php echo esc_url($channel); ?>" target="_blank" rel="noopener">
                <img src="<?php echo esc_url($avatar); ?>" alt="Ирина Нилова" width="50" height="50">
                <span>Ирина Нилова</span>
            </a>
            <?php if ($videos) : ?>
                <div class="video-grid" data-video-grid>
                    <?php foreach ($videos as $index => $video) : ?>
                        <a class="video-card<?php echo $index >= 9 ? ' is-hidden' : ''; ?>" href="<?php echo esc_url($video['url']); ?>" target="_blank" rel="noopener" title="<?php echo esc_attr($video['title']); ?>">
                            <img src="<?php echo esc_url($video['thumbnail']); ?>" alt="<?php echo esc_attr($video['title']); ?>" loading="lazy">
                            <span class="source-youtube-play" aria-hidden="true">▶</span>
                            <span class="screen-reader-text"><?php echo esc_html($video['title']); ?></span>
                        </a>
                    <?php endforeach; ?>
                </div>
                <div class="source-video-actions">
                    <?php if (count($videos) > 9) : ?><button class="source-video-more" type="button" data-video-more>Загрузи больше...</button><?php endif; ?>
                    <?php if ($channel) : ?><a class="source-video-subscribe" href="<?php echo esc_url($channel); ?>" target="_blank" rel="noopener"><span aria-hidden="true">▶</span> Подписаться</a><?php endif; ?>
                </div>
            <?php endif; ?>
        </div>
    </section>
<?php endwhile; ?>
<?php get_footer(); ?>

