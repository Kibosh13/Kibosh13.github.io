<aside class="source-sidebar" aria-label="Последние записи">
    <section class="source-sidebar-widget">
        <h2>Последние записи</h2>
        <?php $recent_posts = get_posts(['numberposts' => max(1, (int) get_option('hroniki_recent_posts_count', 10)), 'post_status' => 'publish', 'post_type' => 'post']); ?>
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
    <?php
    $donation_title = trim((string) get_option('hroniki_sidebar_title', 'Знаки ММ и ЙОРА-за Благотворительный взнос:'));
    $donation_text = trim((string) get_option('hroniki_sidebar_text', "адрес vladar53@list.ru\nтел. 8 929 356 12 78"));
    ?>
    <?php if ($donation_title !== '' || $donation_text !== '') : ?>
        <section class="source-sidebar-widget source-sidebar-donation">
            <?php if ($donation_title !== '') : ?><h2><?php echo esc_html($donation_title); ?></h2><?php endif; ?>
            <?php if ($donation_text !== '') : ?><p><?php echo nl2br(esc_html($donation_text)); ?></p><?php endif; ?>
        </section>
    <?php endif; ?>
    <?php if (is_active_sidebar('sidebar-main')) : ?>
        <?php dynamic_sidebar('sidebar-main'); ?>
    <?php endif; ?>
</aside>
