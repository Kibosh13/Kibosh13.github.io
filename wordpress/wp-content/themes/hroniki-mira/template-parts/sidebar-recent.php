<aside class="source-sidebar" aria-label="Последние записи">
    <section class="source-sidebar-widget">
        <h2>Последние записи</h2>
        <?php $recent_posts = get_posts(['numberposts' => 10, 'post_status' => 'publish', 'post_type' => 'post']); ?>
        <?php if ($recent_posts) : ?>
            <ul>
                <?php foreach ($recent_posts as $recent_post) : ?>
                    <li>
                        <a href="<?php echo esc_url(get_permalink($recent_post)); ?>"><?php echo esc_html(get_the_title($recent_post)); ?></a>
                        <time datetime="<?php echo esc_attr(get_the_date(DATE_W3C, $recent_post)); ?>"><?php echo esc_html(get_the_date('j F, Y', $recent_post)); ?></time>
                    </li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>
    </section>
</aside>
