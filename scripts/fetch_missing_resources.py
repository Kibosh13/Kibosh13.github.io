#!/usr/bin/env python3
"""Download public old-site resources reported missing by the snapshot build."""

from __future__ import annotations

import argparse
import html
import json
import re
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


USER_AGENT = "VestnikiPeremenPreservation/1.0 (+local archival copy)"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--summary", type=Path, required=True)
    parser.add_argument("--public-dir", type=Path, required=True)
    parser.add_argument("--pages-dir", type=Path)
    parser.add_argument("--archive-dir", type=Path)
    return parser.parse_args()


class LocalAssetParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.urls: set[str] = set()

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        values = {key.lower(): value for key, value in attrs if value}
        for key in ("src", "href", "poster", "data-src", "data-lazy-src"):
            value = values.get(key, "")
            if value.startswith("/archive/hosts/"):
                self.urls.add(value)
        for key in ("srcset", "data-srcset"):
            for candidate in values.get(key, "").split(","):
                value = candidate.strip().split(" ", 1)[0]
                if value.startswith("/archive/hosts/"):
                    self.urls.add(value)


def scan_missing_assets(pages_dir: Path, public_dir: Path) -> set[str]:
    urls: set[str] = set()
    for page in pages_dir.rglob("index.html"):
        parser = LocalAssetParser()
        parser.feed(page.read_text(encoding="utf-8"))
        urls.update(parser.urls)
    return {
        url
        for url in urls
        if not (public_dir / urlsplit(url).path.lstrip("/")).exists()
    }


def scan_missing_css_assets(archive_dir: Path, public_dir: Path) -> set[str]:
    urls: set[str] = set()
    public_resolved = public_dir.resolve()
    for stylesheet in archive_dir.rglob("*.css"):
        try:
            text = stylesheet.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for raw_url in re.findall(
            r"url\(\s*['\"]?([^)'\"\s]+)", text, flags=re.IGNORECASE
        ):
            raw_url = html.unescape(raw_url)
            if raw_url.startswith(("data:", "http://", "https://", "//", "#")):
                continue
            parsed = urlsplit(raw_url)
            if parsed.path.startswith("/archive/hosts/"):
                local_url = parsed.path
            else:
                target = (stylesheet.parent / parsed.path).resolve()
                try:
                    local_url = "/" + target.relative_to(public_resolved).as_posix()
                except ValueError:
                    continue
            if parsed.query:
                local_url += "?" + parsed.query
            if not (public_dir / urlsplit(local_url).path.lstrip("/")).exists():
                urls.add(local_url)
    return urls


def fetch(url: str) -> bytes:
    last_error: Exception | None = None
    for attempt in range(4):
        try:
            request = Request(url, headers={"User-Agent": USER_AGENT})
            with urlopen(request, timeout=45) as response:
                return response.read()
        except (HTTPError, URLError, TimeoutError) as error:
            last_error = error
            if attempt < 3:
                time.sleep(1.5 * (attempt + 1))
    assert last_error is not None
    raise last_error


def main() -> None:
    args = parse_args()
    summary = json.loads(args.summary.read_text(encoding="utf-8"))
    missing_urls = set(summary.get("missing_local_resources", []))
    if args.pages_dir:
        missing_urls.update(scan_missing_assets(args.pages_dir, args.public_dir))
    if args.archive_dir:
        missing_urls.update(
            scan_missing_css_assets(args.archive_dir, args.public_dir)
        )
    failures: list[dict[str, str]] = []
    downloaded = 0
    skipped = 0
    for local_url in sorted(missing_urls):
        local_url = html.unescape(local_url)
        marker = "/archive/hosts/"
        if not local_url.startswith(marker):
            continue
        host_and_path = local_url[len(marker) :]
        host, _, remainder = host_and_path.partition("/")
        source_url = f"https://{host}/{remainder}"
        parsed = urlsplit(local_url)
        destination = args.public_dir / parsed.path.lstrip("/")
        if destination.is_file() and destination.stat().st_size:
            skipped += 1
            continue
        try:
            data = fetch(source_url)
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(data)
            downloaded += 1
            print(f"Downloaded {source_url}", flush=True)
        except Exception as error:
            failures.append({"url": source_url, "error": str(error)})
            print(f"Failed {source_url}: {error}", flush=True)
    remaining_missing: set[str] = set()
    if args.pages_dir:
        remaining_missing.update(
            scan_missing_assets(args.pages_dir, args.public_dir)
        )
    if args.archive_dir:
        remaining_missing.update(
            scan_missing_css_assets(args.archive_dir, args.public_dir)
        )
    summary["missing_local_resources"] = sorted(remaining_missing)
    args.summary.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(
        f"Downloaded: {downloaded}; already present: {skipped}; "
        f"failures: {len(failures)}"
    )
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
