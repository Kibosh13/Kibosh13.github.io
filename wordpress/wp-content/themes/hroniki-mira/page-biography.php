<?php get_header(); ?>
<?php while (have_posts()) : the_post(); ?>
    <?php
    $biography_content = apply_filters('the_content', get_the_content());
    $biography_content = preg_replace('/<h1([^>]*)>(\s*О ЗАДАЧАХ)/u', '<h1 id="ozad"$1>$2', $biography_content, 1) ?? $biography_content;
    ?>
    <article <?php post_class('source-biography'); ?>><?php echo $biography_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></article>
<?php endwhile; ?>
<?php get_footer(); ?>
