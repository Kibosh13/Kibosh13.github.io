#!/usr/bin/env python3
"""Preserve public WordPress news, book pages, and their uploaded media."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import math
import mimetypes
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen


SITE_ORIGIN = "https://xn----ctbjbaararyeivphq.xn--p1ai"
SITE_HOST = urlsplit(SITE_ORIGIN).netloc
USER_AGENT = "VestnikiPeremenPreservation/1.0 (+local archival copy)"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, required=True)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--refresh", action="store_true")
    return parser.parse_args()


def cache_name(url: str, suffix: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest() + suffix


def request_bytes(url: str, attempts: int = 4) -> tuple[bytes, str]:
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            request = Request(
                url,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/json,*/*;q=0.8",
                },
            )
            with urlopen(request, timeout=45) as response:
                content_type = response.headers.get_content_type()
                return response.read(), content_type
        except (HTTPError, URLError, TimeoutError) as error:
            last_error = error
            if attempt + 1 < attempts:
                time.sleep(1.5 * (attempt + 1))
    assert last_error is not None
    raise last_error


def request_json(url: str) -> tuple[object, dict[str, str]]:
    request = Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    with urlopen(request, timeout=45) as response:
        data = json.loads(response.read().decode("utf-8"))
        headers = {key.lower(): value for key, value in response.headers.items()}
        return data, headers


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def strip_markup(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


class AssetParser(HTMLParser):
    def __init__(self, page_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.page_url = page_url
        self.urls: set[str] = set()

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        values = {key.lower(): value for key, value in attrs if value}
        for key in ("src", "poster", "data-src", "data-lazy-src", "href"):
            value = values.get(key)
            if value:
                self.urls.add(urljoin(self.page_url, html.unescape(value)))
        for key in ("srcset", "data-srcset"):
            value = values.get(key)
            if value:
                for candidate in value.split(","):
                    asset_url = candidate.strip().split(" ", 1)[0]
                    if asset_url:
                        self.urls.add(urljoin(self.page_url, html.unescape(asset_url)))
        style = values.get("style", "")
        for asset_url in re.findall(r"url\(\s*['\"]?([^)'\"]+)", style):
            self.urls.add(urljoin(self.page_url, html.unescape(asset_url)))


def is_preservable_asset(url: str) -> bool:
    parsed = urlsplit(url)
    if parsed.netloc != SITE_HOST:
        return False
    return parsed.path.startswith("/wp-content/uploads/")


def collect_assets(document: bytes, page_url: str) -> set[str]:
    text = document.decode("utf-8", errors="replace")
    parser = AssetParser(page_url)
    parser.feed(text)
    for asset_url in re.findall(r"url\(\s*['\"]?([^)'\"\s]+)", text, re.I):
        parser.urls.add(urljoin(page_url, html.unescape(asset_url)))
    for asset_url in re.findall(
        r"https?://[^\s\"'<>]+/wp-content/uploads/[^\s\"'<>]+", text, re.I
    ):
        parser.urls.add(html.unescape(asset_url).replace(r"\/", "/"))
    return {url for url in parser.urls if is_preservable_asset(url)}


def fetch_cached_page(
    url: str, page_dir: Path, refresh: bool
) -> tuple[str, str, str | None]:
    path = page_dir / cache_name(url, ".html")
    if path.is_file() and path.stat().st_size and not refresh:
        return url, path.name, None
    try:
        data, _ = request_bytes(url)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return url, path.name, None
    except Exception as error:  # The manifest records isolated unavailable pages.
        return url, path.name, str(error)


def fetch_cached_asset(
    url: str, asset_dir: Path, refresh: bool
) -> tuple[str, str, str, int, str | None]:
    guessed_suffix = Path(urlsplit(url).path).suffix
    path = asset_dir / cache_name(url, guessed_suffix or ".bin")
    meta_path = path.with_suffix(path.suffix + ".json")
    if path.is_file() and path.stat().st_size and meta_path.is_file() and not refresh:
        metadata = json.loads(meta_path.read_text(encoding="utf-8"))
        return url, path.name, metadata["mime"], path.stat().st_size, None
    try:
        data, mime = request_bytes(url)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        write_json(meta_path, {"url": url, "mime": mime})
        return url, path.name, mime, len(data), None
    except Exception as error:
        return url, path.name, "application/octet-stream", 0, str(error)


def run_parallel(
    label: str,
    values: Iterable[str],
    worker,
    workers: int,
) -> list[tuple]:
    items = list(values)
    results: list[tuple] = []
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(worker, value): value for value in items}
        for index, future in enumerate(as_completed(futures), 1):
            results.append(future.result())
            if index % 25 == 0 or index == len(items):
                print(f"{label}: {index}/{len(items)}", flush=True)
    return results


def main() -> None:
    args = parse_args()
    data_dir = args.data_dir
    api_dir = data_dir / "news-api"
    page_dir = data_dir / "news-pages"
    asset_dir = data_dir / "news-assets"
    api_dir.mkdir(parents=True, exist_ok=True)

    all_categories, _ = request_json(
        f"{SITE_ORIGIN}/wp-json/wp/v2/categories?per_page=100"
        "&_fields=id,name,slug,parent,count"
    )
    if not isinstance(all_categories, list):
        raise RuntimeError("The WordPress categories endpoint returned invalid data")
    write_json(data_dir / "wordpress-categories.json", all_categories)
    news_categories = [item for item in all_categories if item.get("slug") == "news"]
    if not news_categories:
        raise RuntimeError("The WordPress news category was not found")
    category = news_categories[0]
    category_id = int(category["id"])

    fields = "id,date,modified,slug,status,link,title,excerpt,content,featured_media,categories"
    first_url = (
        f"{SITE_ORIGIN}/wp-json/wp/v2/posts?status=publish"
        f"&per_page=100&page=1&_fields={fields}"
    )
    first_posts, first_headers = request_json(first_url)
    api_pages = int(first_headers.get("x-wp-totalpages", "1"))
    total_posts = int(first_headers.get("x-wp-total", str(category.get("count", 0))))
    all_posts: list[dict] = []

    for page_number in range(1, api_pages + 1):
        api_path = api_dir / f"page-{page_number}.json"
        if page_number == 1:
            posts = first_posts
        elif api_path.is_file() and not args.refresh:
            posts = json.loads(api_path.read_text(encoding="utf-8"))
        else:
            url = (
                f"{SITE_ORIGIN}/wp-json/wp/v2/posts?status=publish"
                f"&per_page=100&page={page_number}&_fields={fields}"
            )
            posts, _ = request_json(url)
        write_json(api_path, posts)
        all_posts.extend(posts)
        print(f"WordPress posts API: {min(page_number * 100, total_posts)}/{total_posts}", flush=True)

    write_json(data_dir / "news-posts.json", all_posts)

    book_fields = (
        "id,date,modified,slug,status,link,title,excerpt,content,featured_media"
    )
    books_url = (
        f"{SITE_ORIGIN}/wp-json/wp/v2/books?status=publish&per_page=100"
        f"&_fields={book_fields}"
    )
    books, book_headers = request_json(books_url)
    if not isinstance(books, list):
        raise RuntimeError("The WordPress books endpoint returned invalid data")
    total_books = int(book_headers.get("x-wp-total", str(len(books))))
    write_json(data_dir / "books.json", books)
    print(f"WordPress books API: {len(books)}/{total_books}", flush=True)

    posts_per_archive_page = 10
    total_news = int(category.get("count", 0))
    archive_pages = max(1, math.ceil(total_news / posts_per_archive_page))
    page_records: list[dict] = []
    page_urls = [post["link"] for post in all_posts]
    page_urls.extend(
        f"{SITE_ORIGIN}/category/news/"
        if number == 1
        else f"{SITE_ORIGIN}/category/news/page/{number}/"
        for number in range(1, archive_pages + 1)
    )
    page_urls.extend(book["link"] for book in books)
    page_urls = list(dict.fromkeys(page_urls))

    page_results = run_parallel(
        "HTML pages",
        page_urls,
        lambda url: fetch_cached_page(url, page_dir, args.refresh),
        args.workers,
    )
    page_result_map = {url: (cache, error) for url, cache, error in page_results}

    post_by_url = {post["link"]: post for post in all_posts}
    book_by_url = {book["link"]: book for book in books}
    asset_urls: set[str] = set()
    page_errors: list[dict] = []
    for url in page_urls:
        cache, error = page_result_map[url]
        if error:
            page_errors.append({"url": url, "error": error})
            continue
        data = (page_dir / cache).read_bytes()
        asset_urls.update(collect_assets(data, url))
        post = post_by_url.get(url)
        book = book_by_url.get(url)
        if post:
            page_records.append(
                {
                    "url": url,
                    "cache": cache,
                    "kind": "post",
                    "id": post["id"],
                    "date": post["date"],
                    "modified": post["modified"],
                    "title": strip_markup(post["title"]["rendered"]),
                    "description": strip_markup(post["excerpt"]["rendered"]),
                    "featured_media": post["featured_media"],
                }
            )
        elif book:
            page_records.append(
                {
                    "url": url,
                    "cache": cache,
                    "kind": "book",
                    "id": book["id"],
                    "date": book["date"],
                    "modified": book["modified"],
                    "title": strip_markup(book["title"]["rendered"]),
                    "description": strip_markup(
                        book.get("excerpt", {}).get("rendered", "")
                        or book.get("content", {}).get("rendered", "")
                    )[:300],
                    "featured_media": book.get("featured_media", 0),
                }
            )
        else:
            page_records.append(
                {
                    "url": url,
                    "cache": cache,
                    "kind": "news-archive",
                    "title": "Новости — Вестники Перемен",
                    "description": "Архив новостей сайта «Вестники Перемен».",
                }
            )

    asset_results = run_parallel(
        "Uploaded assets",
        sorted(asset_urls),
        lambda url: fetch_cached_asset(url, asset_dir, args.refresh),
        max(2, args.workers),
    )
    asset_records: list[dict] = []
    asset_errors: list[dict] = []
    for url, cache, mime, size, error in asset_results:
        if error:
            asset_errors.append({"url": url, "error": error})
        else:
            asset_records.append(
                {"url": url, "cache": cache, "mime": mime, "size": size}
            )

    manifest = {
        "site": SITE_ORIGIN,
        "posts": {"post_count": total_posts},
        "category": {
            "id": category_id,
            "name": category["name"],
            "slug": category["slug"],
            "post_count": total_news,
            "archive_pages": archive_pages,
        },
        "books": {"post_count": total_books},
        "pages": page_records,
        "assets": asset_records,
        "errors": {"pages": page_errors, "assets": asset_errors},
    }
    write_json(data_dir / "news-snapshot.json", manifest)
    print(
        f"Saved {len(page_records)} pages and {len(asset_records)} uploaded assets; "
        f"errors: {len(page_errors) + len(asset_errors)}",
        flush=True,
    )


if __name__ == "__main__":
    main()
