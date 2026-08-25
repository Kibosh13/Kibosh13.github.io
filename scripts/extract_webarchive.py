#!/usr/bin/env python3
"""Extract an Apple .webarchive into a self-contained static page."""

from __future__ import annotations

import argparse
import hashlib
import html
import plistlib
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit


TEXT_MIMES = {
    "application/javascript",
    "application/x-javascript",
    "application/json",
    "text/css",
    "text/html",
    "text/javascript",
    "text/plain",
    "text/xml",
}

MIME_EXTENSIONS = {
    "application/javascript": ".js",
    "application/x-javascript": ".js",
    "font/woff": ".woff",
    "font/woff2": ".woff2",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "text/css": ".css",
    "text/html": ".html",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    parser.add_argument("output", type=Path)
    return parser.parse_args()


def local_resource_path(url: str, mime: str, collides: bool) -> Path:
    parsed = urlsplit(url)
    source_path = parsed.path or "/index.html"
    if source_path.endswith("/"):
        source_path += "index.html"

    path = Path("hosts") / parsed.netloc / source_path.lstrip("/")
    if collides:
        query_hash = hashlib.sha256(parsed.query.encode()).hexdigest()[:10]
        suffix = path.suffix or MIME_EXTENSIONS.get(mime, "")
        stem = path.name[: -len(path.suffix)] if path.suffix else path.name
        path = path.with_name(f"{stem}__q-{query_hash}{suffix}")
    elif not path.suffix and mime in MIME_EXTENSIONS:
        path = path.with_name(path.name + MIME_EXTENSIONS[mime])
    return path


def replacement_variants(url: str) -> set[str]:
    parsed = urlsplit(url)
    variants = {
        url,
        html.escape(url, quote=False),
        url.replace("&", "&#038;"),
        url.replace("/", r"\/"),
    }
    if parsed.scheme and parsed.netloc:
        scheme_relative = f"//{parsed.netloc}{parsed.path}"
        if parsed.query:
            scheme_relative += f"?{parsed.query}"
        variants.update(
            {
                scheme_relative,
                html.escape(scheme_relative, quote=False),
                scheme_relative.replace("&", "&#038;"),
            }
        )
    return variants


def rewrite_text(text: str, url_map: dict[str, str], primary_host: str) -> str:
    for source_url in sorted(url_map, key=len, reverse=True):
        target_url = url_map[source_url]
        for variant in sorted(replacement_variants(source_url), key=len, reverse=True):
            text = text.replace(variant, target_url)

    local_origin = f"/archive/hosts/{primary_host}"
    for scheme in ("https://", "http://", "//"):
        for root in ("wp-content", "wp-includes"):
            text = text.replace(
                f"{scheme}{primary_host}/{root}/", f"{local_origin}/{root}/"
            )
    for root in ("wp-content", "wp-includes"):
        text = text.replace(f'"/{root}/', f'"{local_origin}/{root}/')
        text = text.replace(f"'/{root}/", f"'{local_origin}/{root}/")
    return text


def strip_tracking(document: str) -> str:
    document = re.sub(
        r"<script\b[^>]*src=[\"'][^\"']*mc\.yandex\.ru/[^\"']*[\"'][^>]*>\s*</script>",
        "",
        document,
        flags=re.IGNORECASE,
    )
    document = re.sub(
        r"<!--\s*Yandex\.Metrika counter\s*-->.*?<!--\s*/Yandex\.Metrika counter\s*-->",
        "",
        document,
        flags=re.IGNORECASE | re.DOTALL,
    )
    return document


def decode_text(data: bytes, encoding: str | None) -> tuple[str, str]:
    candidates = [encoding, "utf-8", "windows-1251", "latin-1"]
    for candidate in candidates:
        if not candidate:
            continue
        try:
            return data.decode(candidate), candidate
        except (LookupError, UnicodeDecodeError):
            pass
    return data.decode("utf-8", errors="replace"), "utf-8"


def main() -> None:
    args = parse_args()
    with args.archive.open("rb") as source:
        archive = plistlib.load(source)

    main_resource = archive["WebMainResource"]
    primary_url = main_resource["WebResourceURL"]
    primary_host = urlsplit(primary_url).netloc
    resources = [
        item
        for item in archive.get("WebSubresources", [])
        if not (
            item.get("WebResourceMIMEType") == "text/html"
            and item.get("WebResourceURL") == primary_url
        )
    ]

    path_counts: Counter[tuple[str, str]] = Counter()
    for item in resources:
        parsed = urlsplit(item["WebResourceURL"])
        path_counts[(parsed.netloc, parsed.path)] += 1

    url_map: dict[str, str] = {}
    output_paths: dict[str, Path] = {}
    for item in resources:
        url = item["WebResourceURL"]
        parsed = urlsplit(url)
        local_path = local_resource_path(
            url,
            item.get("WebResourceMIMEType", ""),
            path_counts[(parsed.netloc, parsed.path)] > 1,
        )
        output_paths[url] = local_path
        url_map[url] = "/archive/" + local_path.as_posix()

    args.output.mkdir(parents=True, exist_ok=True)
    for item in resources:
        url = item["WebResourceURL"]
        mime = item.get("WebResourceMIMEType", "")
        data = item.get("WebResourceData", b"")
        destination = args.output / output_paths[url]
        destination.parent.mkdir(parents=True, exist_ok=True)

        if mime in TEXT_MIMES or mime.startswith("text/"):
            content, encoding = decode_text(
                data, item.get("WebResourceTextEncodingName")
            )
            content = rewrite_text(content, url_map, primary_host)
            destination.write_text(content, encoding=encoding)
        else:
            destination.write_bytes(data)

    document, _ = decode_text(
        main_resource["WebResourceData"],
        main_resource.get("WebResourceTextEncodingName"),
    )
    document = strip_tracking(document)
    document = rewrite_text(document, url_map, primary_host)
    document = document.replace(
        "</head>",
        '<meta name="archive-source" content="Apple WebArchive"></head>',
        1,
    )
    (args.output / "index.html").write_text(document, encoding="utf-8")

    total_bytes = sum(len(item.get("WebResourceData", b"")) for item in resources)
    print(
        f"Extracted {len(resources)} resources ({total_bytes:,} bytes) "
        f"to {args.output}"
    )


if __name__ == "__main__":
    main()
