import Script from "next/script";

import { SiteHeader } from "./SiteHeader";

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-page">
      <SiteHeader />
      <main className="site-content">{children}</main>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <span>© {new Date().getFullYear()} «Хроники преображения Мира»</span>
          <a
            className="site-liveinternet-counter"
            href="https://www.liveinternet.ru/click"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Статистика LiveInternet"
          >
            <img
              id="licntFEAA"
              width="88"
              height="31"
              title="LiveInternet: показано число просмотров за 24 часа, посетителей за 24 часа и за сегодня"
              src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAEALAAAAAABAAEAAAIBTAA7"
              alt=""
            />
          </a>
          <Script id="liveinternet-counter" strategy="afterInteractive">
            {`(function(d,s){d.getElementById("licntFEAA").src=
"https://counter.yadro.ru/hit?t14.7;r"+escape(d.referrer)+
((typeof(s)==="undefined")?"":";s"+s.width+"*"+s.height+"*"+
(s.colorDepth?s.colorDepth:s.pixelDepth))+";u"+escape(d.URL)+
";h"+escape(d.title.substring(0,150))+";"+Math.random()})
(document,screen)`}
          </Script>
        </div>
      </footer>
    </div>
  );
}
