#!/usr/bin/env python3
"""Build the read-only GitHub Pages demonstration from the local archive."""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
TAG_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")


def plain_text(value: str) -> str:
    return SPACE_RE.sub(" ", html.unescape(TAG_RE.sub(" ", value))).strip()


def build_search_index(output: Path) -> int:
    posts_path = PROJECT_ROOT / "data" / "news-posts.json"
    posts = json.loads(posts_path.read_text(encoding="utf-8"))
    index: list[dict[str, str]] = []

    for post in posts:
        title = plain_text(post.get("title", {}).get("rendered", ""))
        excerpt = plain_text(post.get("excerpt", {}).get("rendered", ""))
        slug = str(post.get("slug", "")).strip("/")
        if not slug or not title:
            continue
        index.append(
            {
                "title": title,
                "excerpt": excerpt,
                "url": f"/{slug}/",
                "date": str(post.get("date", ""))[:10],
            }
        )

    (output / "search-index.json").write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    return len(index)


def write_search_page(output: Path) -> None:
    search_dir = output / "search"
    search_dir.mkdir(parents=True, exist_ok=True)
    search_dir.joinpath("index.html").write_text(
        """<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Поиск — Хроники преображения Мира</title>
  <meta name="robots" content="noindex,follow">
  <style>
    :root{font-family:Arial,sans-serif;color:#151515;background:#fffaf7}
    *{box-sizing:border-box}body{margin:0}header{padding:26px 5vw;border-top:4px solid #ff7657;border-bottom:1px solid #f2d9d1;background:#fff}
    header a{color:#151515;text-decoration:none;font-size:clamp(26px,4vw,46px);font-weight:700}
    main{width:min(980px,90vw);margin:42px auto 80px}h1{font-size:clamp(34px,6vw,66px);margin:0 0 28px}
    form{display:flex;gap:10px;margin-bottom:32px}input{flex:1;min-width:0;padding:14px 16px;border:1px solid #bbb;border-radius:4px;font-size:18px}
    button{padding:14px 24px;border:0;border-radius:4px;background:#ff7657;color:#111;font-size:18px;font-weight:700;cursor:pointer}
    #status{color:#565656;margin:0 0 18px}.result{padding:22px 0;border-top:1px solid #e7cdc6}.result a{color:#141414;font-size:25px;font-weight:700;text-decoration-thickness:2px;text-underline-offset:4px}
    .result time{display:block;color:#777;margin-top:8px}.result p{line-height:1.55;margin:10px 0 0}.empty{padding:28px 0;border-top:1px solid #e7cdc6}
    @media(max-width:560px){form{display:block}button{width:100%;margin-top:10px}}
  </style>
</head>
<body>
  <header><a href="/">Хроники преображения Мира</a></header>
  <main>
    <h1>Поиск</h1>
    <form action="/search/" method="get">
      <input id="query" name="q" type="search" autocomplete="off" placeholder="Что найти?" aria-label="Поиск">
      <button type="submit">Найти</button>
    </form>
    <p id="status">Введите запрос.</p>
    <section id="results" aria-live="polite"></section>
  </main>
  <script>
    const params = new URLSearchParams(location.search);
    const query = (params.get('q') || '').trim();
    const input = document.getElementById('query');
    const status = document.getElementById('status');
    const results = document.getElementById('results');
    input.value = query;

    function addResult(item) {
      const article = document.createElement('article');
      article.className = 'result';
      const link = document.createElement('a');
      link.href = item.url;
      link.textContent = item.title;
      const date = document.createElement('time');
      date.dateTime = item.date;
      date.textContent = item.date ? new Date(item.date + 'T00:00:00').toLocaleDateString('ru-RU') : '';
      const excerpt = document.createElement('p');
      excerpt.textContent = item.excerpt;
      article.append(link, date, excerpt);
      results.append(article);
    }

    if (query) {
      status.textContent = 'Ищем…';
      fetch('/search-index.json')
        .then(response => response.json())
        .then(items => {
          const words = query.toLocaleLowerCase('ru-RU').split(/\\s+/).filter(Boolean);
          const matches = items
            .filter(item => {
              const haystack = (item.title + ' ' + item.excerpt).toLocaleLowerCase('ru-RU');
              return words.every(word => haystack.includes(word));
            })
            .sort((a, b) => {
              const aq = a.title.toLocaleLowerCase('ru-RU').includes(query.toLocaleLowerCase('ru-RU')) ? 1 : 0;
              const bq = b.title.toLocaleLowerCase('ru-RU').includes(query.toLocaleLowerCase('ru-RU')) ? 1 : 0;
              return bq - aq || b.date.localeCompare(a.date);
            });
          status.textContent = matches.length ? `Найдено: ${matches.length}` : 'Ничего не найдено.';
          matches.slice(0, 100).forEach(addResult);
        })
        .catch(() => { status.textContent = 'Поиск временно недоступен.'; });
    }
  </script>
</body>
</html>
""",
        encoding="utf-8",
    )


def write_support_files(output: Path) -> None:
    output.joinpath(".nojekyll").touch()
    output.joinpath("404.html").write_text(
        """<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Страница не найдена</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:12vh 24px;color:#171717}h1{font-size:clamp(40px,8vw,80px)}a{color:#d94f33;font-size:20px}</style></head><body><h1>404</h1><p>Такой страницы нет в сохранённом архиве.</p><p><a href="/">Вернуться на главную</a></p></body></html>""",
        encoding="utf-8",
    )
    output.joinpath("robots.txt").write_text("User-agent: *\nAllow: /\n", encoding="utf-8")


def build(output: Path) -> None:
    archive_root = PROJECT_ROOT / "public" / "archive"
    pages = archive_root / "pages"
    hosts = archive_root / "hosts"

    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    shutil.copytree(pages, output, dirs_exist_ok=True)
    shutil.copytree(hosts, output / "archive" / "hosts", dirs_exist_ok=True)
    for shared_asset in ("mobile-menu.css", "mobile-menu.js"):
        shutil.copy2(archive_root / shared_asset, output / "archive" / shared_asset)

    social_image = PROJECT_ROOT / "public" / "og.png"
    if social_image.exists():
        shutil.copy2(social_image, output / "og.png")

    count = build_search_index(output)
    write_search_page(output)
    write_support_files(output)
    print(f"GitHub Pages demonstration: {count} searchable posts, output={output}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    build(args.output.resolve())


if __name__ == "__main__":
    main()
