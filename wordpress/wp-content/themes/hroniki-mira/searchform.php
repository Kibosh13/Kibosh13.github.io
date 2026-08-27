<?php $mobile = !empty($args['mobile']); ?>
<form role="search" method="get" class="<?php echo $mobile ? 'mobile-search' : 'header-search'; ?>" action="<?php echo esc_url(home_url('/')); ?>">
    <label class="screen-reader-text" for="search-<?php echo $mobile ? 'mobile' : 'header'; ?>">Поиск</label>
    <input type="search" id="search-<?php echo $mobile ? 'mobile' : 'header'; ?>" name="s" value="<?php echo esc_attr(get_search_query()); ?>" placeholder="Поиск по сайту">
    <button type="submit" aria-label="Найти">⌕</button>
</form>

