</main>
<footer class="site-footer">
    <div class="wrap footer-inner">
        <span><?php echo esc_html((string) get_option('hroniki_footer_text', '© «Хроники преображения Мира». Все права защищены')); ?></span>
        <span class="liveinternet-counter">
            <a href="https://www.liveinternet.ru/click" target="_blank" rel="noopener"><img id="licntFEAA" width="88" height="31" title="LiveInternet: показано число просмотров за 24 часа, посетителей за 24 часа и за сегодня" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAEALAAAAAABAAEAAAIBTAA7" alt="Счётчик LiveInternet"></a>
        </span>
    </div>
</footer>
<script>(function(d,s){var c=d.getElementById('licntFEAA');if(!c){return;}c.src='https://counter.yadro.ru/hit?t14.7;r'+escape(d.referrer)+((typeof(s)=='undefined')?'':';s'+s.width+'*'+s.height+'*'+(s.colorDepth?s.colorDepth:s.pixelDepth))+';u'+escape(d.URL)+';h'+escape(d.title.substring(0,150))+';'+Math.random()})(document,screen)</script>
<?php wp_footer(); ?>
</body>
</html>

