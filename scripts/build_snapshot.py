#!/usr/bin/env python3
"""Build the multi-page local site from Apple WebArchives and scraped news."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import plistlib
import re
import shutil
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit


SITE_ORIGIN = "https://xn----ctbjbaararyeivphq.xn--p1ai"
SITE_HOST = urlsplit(SITE_ORIGIN).netloc
OLD_SITE_NAME = "Вестники Перемен"
NEW_SITE_NAME = "Хроники преображения Мира"
SNAPSHOT_VERSION = "20260825-05"
ROUTE_ALIASES = {
    "/library/book/": "/books/",
}

TEXT_MIMES = {
    "application/javascript",
    "application/json",
    "application/x-javascript",
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


@dataclass
class Resource:
    url: str
    mime: str
    data: bytes | None = None
    path: Path | None = None
    encoding: str | None = None

    def read(self) -> bytes:
        if self.data is not None:
            return self.data
        if self.path is None:
            return b""
        return self.path.read_bytes()


@dataclass
class Page:
    url: str
    document: bytes
    title: str
    description: str
    kind: str
    source: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--archives-dir", type=Path, required=True)
    parser.add_argument("--news-data", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--app-manifest", type=Path, required=True)
    return parser.parse_args()


def clean_url(url: str) -> str:
    parsed = urlsplit(html.unescape(url))
    scheme = parsed.scheme or "https"
    return parsed._replace(scheme=scheme, fragment="").geturl()


def normalize_route(path: str) -> str:
    route = unquote(path or "/")
    if not route.startswith("/"):
        route = "/" + route
    route = re.sub(r"/{2,}", "/", route)
    return route


def extract_title(document: str) -> str:
    match = re.search(r"<title[^>]*>(.*?)</title>", document, re.I | re.S)
    if not match:
        return NEW_SITE_NAME
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", match.group(1)))).strip()


def extract_description(document: str) -> str:
    patterns = (
        r"<meta[^>]+name=[\"']description[\"'][^>]+content=[\"']([^\"']*)",
        r"<meta[^>]+content=[\"']([^\"']*)[\"'][^>]+name=[\"']description[\"']",
        r"<meta[^>]+property=[\"']og:description[\"'][^>]+content=[\"']([^\"']*)",
    )
    for pattern in patterns:
        match = re.search(pattern, document, re.I | re.S)
        if match:
            return re.sub(r"\s+", " ", html.unescape(match.group(1))).strip()
    return f"Архивная копия материалов сайта «{NEW_SITE_NAME}»."


def replace_site_name(text: str) -> str:
    """Apply the approved name without touching legacy URLs and file paths."""
    return text.replace(OLD_SITE_NAME, NEW_SITE_NAME)


def preferred_archive_document(archive_path: Path, archive: dict) -> bytes:
    standalone = archive_path.with_suffix(".html")
    if standalone.is_file():
        return standalone.read_bytes()

    main = archive["WebMainResource"]
    main_url = main.get("WebResourceURL")
    for item in archive.get("WebSubresources", []):
        if (
            item.get("WebResourceMIMEType") == "text/html"
            and item.get("WebResourceURL") == main_url
        ):
            return item.get("WebResourceData", b"")
    return main.get("WebResourceData", b"")


def load_archives(archives_dir: Path) -> tuple[dict[str, Page], dict[str, Resource]]:
    pages: dict[str, Page] = {}
    resources: dict[str, Resource] = {}
    for archive_path in sorted(archives_dir.glob("*.webarchive")):
        archive = plistlib.loads(archive_path.read_bytes())
        main = archive["WebMainResource"]
        page_url = clean_url(main["WebResourceURL"])
        document = preferred_archive_document(archive_path, archive)
        decoded = document.decode(
            main.get("WebResourceTextEncodingName", "utf-8"), errors="replace"
        )
        pages[page_url] = Page(
            url=page_url,
            document=document,
            title=extract_title(decoded),
            description=extract_description(decoded),
            kind="archive",
            source=archive_path.name,
        )

        for item in archive.get("WebSubresources", []):
            url = item.get("WebResourceURL")
            if not url:
                continue
            url = clean_url(url)
            if item.get("WebResourceMIMEType") == "text/html" and url == page_url:
                continue
            candidate = Resource(
                url=url,
                mime=item.get("WebResourceMIMEType", "application/octet-stream"),
                data=item.get("WebResourceData", b""),
                encoding=item.get("WebResourceTextEncodingName"),
            )
            existing = resources.get(url)
            if existing is None or len(candidate.data or b"") > len(existing.data or b""):
                resources[url] = candidate
    return pages, resources


def load_news(
    news_data: Path | None,
) -> tuple[dict[str, Page], dict[str, Resource], dict]:
    if news_data is None:
        return {}, {}, {}
    manifest_path = news_data / "news-snapshot.json"
    if not manifest_path.is_file():
        return {}, {}, {}
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    pages: dict[str, Page] = {}
    resources: dict[str, Resource] = {}
    for record in manifest.get("pages", []):
        url = clean_url(record["url"])
        document = (news_data / "news-pages" / record["cache"]).read_bytes()
        decoded = document.decode("utf-8", errors="replace")
        pages[url] = Page(
            url=url,
            document=document,
            title=record.get("title") or extract_title(decoded),
            description=record.get("description") or extract_description(decoded),
            kind=record.get("kind", "news"),
            source="current WordPress site",
        )
    for record in manifest.get("assets", []):
        url = clean_url(record["url"])
        resources[url] = Resource(
            url=url,
            mime=record.get("mime", "application/octet-stream"),
            path=news_data / "news-assets" / record["cache"],
        )
    return pages, resources, manifest


def local_resource_path(url: str, mime: str, collides: bool) -> Path:
    parsed = urlsplit(url)
    source_path = unquote(parsed.path) or "/index.html"
    if source_path.endswith("/"):
        source_path += "index.html"
    safe_parts = [part for part in Path(source_path).parts if part not in {"/", "", ".", ".."}]
    path = Path("hosts") / parsed.netloc
    for part in safe_parts:
        path /= part
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


def build_replacement_pattern(
    url_map: dict[str, str],
) -> tuple[re.Pattern[str], dict[str, str]]:
    variants: dict[str, str] = {}
    for source_url, target_url in url_map.items():
        for variant in replacement_variants(source_url):
            variants[variant] = target_url
    pattern = re.compile(
        "|".join(re.escape(value) for value in sorted(variants, key=len, reverse=True))
    )
    return pattern, variants


def rewrite_assets(
    text: str,
    replacement_pattern: re.Pattern[str],
    replacement_values: dict[str, str],
) -> str:
    text = replacement_pattern.sub(
        lambda match: replacement_values[match.group(0)], text
    )

    local_origin = f"/archive/hosts/{SITE_HOST}"
    for scheme in ("https://", "http://", "//"):
        for root in ("wp-content", "wp-includes"):
            text = text.replace(
                f"{scheme}{SITE_HOST}/{root}/", f"{local_origin}/{root}/"
            )
    for root in ("wp-content", "wp-includes"):
        text = text.replace(f'"/{root}/', f'"{local_origin}/{root}/')
        text = text.replace(f"'/{root}/", f"'{local_origin}/{root}/")
    return localize_escaped_asset_roots(text)


def localize_escaped_asset_roots(text: str) -> str:
    local_origin = f"/archive/hosts/{SITE_HOST}"
    for root in ("wp-content", "wp-includes"):
        escaped_origin = f"https:\\/\\/{SITE_HOST}\\/{root}\\/"
        text = text.replace(escaped_origin, f"{local_origin}/{root}/")
    return text


def remove_known_dead_css_assets(text: str) -> str:
    """Neutralize two plugin images that are also 404 on the source server."""
    return text.replace(
        "url('../img/small-logo.png')", "none"
    ).replace(
        'url("owl.video.play.png")', "none"
    )


def strip_tracking(document: str) -> str:
    document = re.sub(
        r"<script\b[^>]*src=[\"'][^\"']*mc\.yandex\.ru/[^\"']*[\"'][^>]*>\s*</script>",
        "",
        document,
        flags=re.I,
    )
    document = re.sub(
        r"<!--\s*Yandex\.Metrika counter\s*-->.*?<!--\s*/Yandex\.Metrika counter\s*-->",
        "",
        document,
        flags=re.I | re.S,
    )
    document = re.sub(
        r"<script\b[^>]*src=[\"'][^\"']*wp-emoji-release\.min\.js[^\"']*[\"'][^>]*>\s*</script>",
        "",
        document,
        flags=re.I,
    )
    document = re.sub(
        r"<script\b[^>]*src=[\"'][^\"']*comment-reply\.min\.js[^\"']*[\"'][^>]*>\s*</script>",
        "",
        document,
        flags=re.I,
    )
    document = re.sub(
        r"<script\b[^>]*id=[\"']wp-emoji-settings[\"'][^>]*>.*?</script>",
        "",
        document,
        flags=re.I | re.S,
    )
    document = re.sub(
        r"<script\b(?=[^>]*type=[\"']module[\"'])[^>]*>"
        r"(?:(?!</script>).)*wpEmojiSettingsSupports.*?</script>",
        "",
        document,
        flags=re.I | re.S,
    )
    return document


def strip_static_post_scripts(document: str) -> str:
    """Keep static news posts free of unused Elementor widget runtimes."""
    script_ids = (
        "swiper-js|single-book-js|q2w3_fixed_widget-js|"
        "elementor-pro-webpack-runtime-js|elementor-webpack-runtime-js|"
        "elementor-frontend-modules-js|elementor-pro-frontend-js|"
        "elementor-waypoints-js|jquery-ui-core-js|elementor-frontend-js|"
        "pro-elements-handlers-js|animate-circle-js|"
        "elementskit-elementor-js|elementskit-elementor-pro-js"
    )
    return re.sub(
        rf"<script\b[^>]*id=[\"'](?:{script_ids})[\"'][^>]*>\s*</script>",
        "",
        document,
        flags=re.I,
    )


def route_aliases(route: str) -> set[str]:
    aliases = {route}
    if route != "/":
        aliases.add(route.rstrip("/"))
        aliases.add(route.rstrip("/") + "/")
    return aliases


def rewrite_internal_links(
    document: str, page_url: str, known_routes: set[str]
) -> str:
    lookup: dict[str, str] = {}
    for route in known_routes:
        for alias in route_aliases(route):
            lookup[alias] = route
    for alias, target in ROUTE_ALIASES.items():
        for variant in route_aliases(alias):
            lookup[variant] = target

    anchor_pattern = re.compile(r"<a\b[^>]*>", re.I)
    href_pattern = re.compile(r"\bhref\s*=\s*([\"'])(.*?)\1", re.I | re.S)

    def replace_anchor(match: re.Match[str]) -> str:
        tag = match.group(0)
        href_match = href_pattern.search(tag)
        if not href_match:
            return tag
        raw_href = html.unescape(href_match.group(2)).strip()
        if not raw_href or raw_href.startswith(("#", "mailto:", "tel:", "javascript:")):
            return tag
        resolved = urlsplit(urljoin(page_url, raw_href))
        if resolved.netloc != SITE_HOST:
            return tag
        normalized = normalize_route(resolved.path)
        route = lookup.get(normalized, normalized)
        local_href = route
        if resolved.query:
            local_href += "?" + resolved.query
        if resolved.fragment:
            local_href += "#" + resolved.fragment
        quote = href_match.group(1)
        replacement = f"href={quote}{html.escape(local_href, quote=True)}{quote}"
        tag = tag[: href_match.start()] + replacement + tag[href_match.end() :]
        target_pattern = re.compile(r"\btarget\s*=\s*([\"']).*?\1", re.I | re.S)
        if target_pattern.search(tag):
            tag = target_pattern.sub('target="_top"', tag, count=1)
        else:
            tag = tag[:-1] + ' target="_top">'
        return tag

    document = anchor_pattern.sub(replace_anchor, document)

    form_pattern = re.compile(r"<form\b[^>]*>", re.I)
    action_pattern = re.compile(r"\baction\s*=\s*([\"'])(.*?)\1", re.I | re.S)

    def replace_form(match: re.Match[str]) -> str:
        tag = match.group(0)
        action_match = action_pattern.search(tag)
        if not action_match:
            return tag
        resolved = urlsplit(urljoin(page_url, html.unescape(action_match.group(2))))
        if resolved.netloc != SITE_HOST:
            return tag
        action = "/search" if "search-form" in tag else normalize_route(resolved.path)
        quote = action_match.group(1)
        replacement = f"action={quote}{action}{quote}"
        tag = tag[: action_match.start()] + replacement + tag[action_match.end() :]
        if "search-form" in tag:
            tag = tag[:-1] + ' target="_top">'
        return tag

    return form_pattern.sub(replace_form, document)


def localize_site_origin(text: str) -> str:
    """Remove the last runtime dependency on the expiring WordPress origin."""
    for origin in (
        f"https://{SITE_HOST}",
        f"http://{SITE_HOST}",
        f"https:\\/\\/{SITE_HOST}",
        f"http:\\/\\/{SITE_HOST}",
        f"//{SITE_HOST}",
    ):
        text = text.replace(origin, "")
    return text


def restoration_css(route: str) -> str:
    rules = [
        ".elementor-nav-menu .dropdown-menu-toggle{display:none!important;width:0!important;height:0!important;padding:0!important}",
        ".elementor-nav-menu a>.sub-arrow+.sub-arrow{display:none!important}",
    ]
    if route == "/":
        rules.extend(
            [
                ".elementor-element-b1f501c .swiper-slide-inner{height:300px;display:flex;align-items:center;justify-content:center}",
                ".elementor-element-b1f501c .swiper-slide-image{width:auto!important;height:300px!important;max-width:100%!important;object-fit:contain!important}",
            ]
        )
    return '<style id="archive-restoration-fixes">' + "".join(rules) + "</style>"


def restoration_script(route: str) -> str:
    runtime_guard = """<script id="archive-runtime-guard">
window.onerror=function(message,source,line,column,error){
  if(String(message||'').indexOf("Failed to execute 'observe' on 'MutationObserver'")!==-1){
    window.__archiveObserverError={source:source,line:line,column:column,stack:error&&error.stack};
    return true;
  }
  return false;
};
window.addEventListener('error',function(event){
  if(String(event.message||'').indexOf("Failed to execute 'observe' on 'MutationObserver'")!==-1){
    event.preventDefault();
  }
});
</script>"""
    if route != "/video/":
        return runtime_guard
    return runtime_guard + """<script id="archive-video-link-fixes">
(function(){
  function restoreYouTubeLinks(){
    document.querySelectorAll('a.sby_video_thumbnail[data-video-id]').forEach(function(link){
      var expected='https://www.youtube.com/watch?v='+link.getAttribute('data-video-id');
      if(link.getAttribute('href')!==expected) link.setAttribute('href',expected);
      link.setAttribute('target','_blank');
      link.setAttribute('rel','noopener noreferrer');
      link.setAttribute('data-sby-lightbox','0');
    });
  }
  function watch(){
    restoreYouTubeLinks();
    var feed=document.querySelector('.sb_youtube');
    if(!feed) return;
    new MutationObserver(restoreYouTubeLinks).observe(feed,{subtree:true,attributes:true,attributeFilter:['href']});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',watch,{once:true});
  else watch();
}());
</script>"""


def inject_fixes(document: str, route: str) -> str:
    document = re.sub(
        r'<style\b[^>]*id=["\']archive-restoration-fixes["\'][^>]*>.*?</style>',
        "",
        document,
        flags=re.I | re.S,
    )
    document = re.sub(
        r'<script\b[^>]*id=["\']archive-video-link-fixes["\'][^>]*>.*?</script>',
        "",
        document,
        flags=re.I | re.S,
    )
    document = re.sub(
        r'<script\b[^>]*id=["\']archive-runtime-guard["\'][^>]*>.*?</script>',
        "",
        document,
        flags=re.I | re.S,
    )
    marker = restoration_css(route) + restoration_script(route)
    if "</head>" in document:
        return document.replace("</head>", marker + "</head>", 1)
    return marker + document


def decode_text(data: bytes, encoding: str | None) -> tuple[str, str]:
    for candidate in (encoding, "utf-8", "windows-1251", "latin-1"):
        if not candidate:
            continue
        try:
            return data.decode(candidate), candidate
        except (LookupError, UnicodeDecodeError):
            pass
    return data.decode("utf-8", errors="replace"), "utf-8"


def page_output_path(output: Path, page_url: str) -> Path:
    route = normalize_route(urlsplit(page_url).path)
    parts = [part for part in Path(route).parts if part not in {"/", "", ".", ".."}]
    path = output / "pages"
    for part in parts:
        path /= part
    return path / "index.html"


def main() -> None:
    args = parse_args()
    archive_pages, archive_resources = load_archives(args.archives_dir)
    news_pages, news_resources, news_manifest = load_news(args.news_data)

    pages = dict(archive_pages)
    pages.update(news_pages)
    resources = dict(archive_resources)
    for url, resource in news_resources.items():
        resources.setdefault(url, resource)

    path_counts: Counter[tuple[str, str]] = Counter()
    for resource in resources.values():
        parsed = urlsplit(resource.url)
        path_counts[(parsed.netloc, parsed.path)] += 1

    output_paths: dict[str, Path] = {}
    url_map: dict[str, str] = {}
    for resource in resources.values():
        parsed = urlsplit(resource.url)
        local_path = local_resource_path(
            resource.url,
            resource.mime,
            path_counts[(parsed.netloc, parsed.path)] > 1,
        )
        output_paths[resource.url] = local_path
        url_map[resource.url] = "/archive/" + local_path.as_posix()

    replacement_pattern, replacement_values = build_replacement_pattern(url_map)

    args.output.mkdir(parents=True, exist_ok=True)
    for resource in resources.values():
        destination = args.output / output_paths[resource.url]
        destination.parent.mkdir(parents=True, exist_ok=True)
        data = resource.read()
        if resource.mime in TEXT_MIMES or resource.mime.startswith("text/"):
            content, encoding = decode_text(data, resource.encoding)
            content = rewrite_assets(
                content, replacement_pattern, replacement_values
            )
            if resource.mime == "text/css":
                content = remove_known_dead_css_assets(content)
            try:
                destination.write_text(content, encoding=encoding)
            except UnicodeEncodeError:
                destination.write_text(content, encoding="utf-8")
        else:
            destination.write_bytes(data)

    # Some legacy Elementor bundles request a dependency dynamically without
    # the original query string. Keep a queryless alias for colliding assets so
    # those runtime requests do not turn into 404 responses.
    for (host, path), count in path_counts.items():
        if count < 2:
            continue
        candidates = [
            resource
            for resource in resources.values()
            if urlsplit(resource.url).netloc == host
            and urlsplit(resource.url).path == path
        ]
        if not candidates:
            continue
        preferred = next(
            (
                resource
                for resource in candidates
                if urlsplit(resource.url).query == "ver=5.3.6"
            ),
            candidates[0],
        )
        queryless_url = f"https://{host}{path}"
        alias = args.output / local_resource_path(
            queryless_url,
            preferred.mime,
            False,
        )
        if alias.exists():
            continue
        alias.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(args.output / output_paths[preferred.url], alias)

    known_routes = {
        normalize_route(urlsplit(page.url).path) for page in pages.values()
    }
    app_manifest: dict[str, dict] = {}
    local_missing: set[str] = set()
    old_asset_references = 0

    for page in pages.values():
        route = normalize_route(urlsplit(page.url).path)
        document, _ = decode_text(page.document, "utf-8")
        document = strip_tracking(document)
        if page.kind in {"news-post", "post"}:
            document = strip_static_post_scripts(document)
        document = rewrite_assets(
            document, replacement_pattern, replacement_values
        )
        document = rewrite_internal_links(document, page.url, known_routes)
        document = localize_site_origin(document)
        document = replace_site_name(document)
        document = inject_fixes(document, route)
        destination = page_output_path(args.output, page.url)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(document, encoding="utf-8")

        app_manifest[route] = {
            "archivePath": (
                "/archive/"
                + destination.relative_to(args.output).as_posix()
                + f"?v={SNAPSHOT_VERSION}"
            ),
            "title": replace_site_name(page.title),
            "description": replace_site_name(page.description),
            "kind": page.kind,
            "source": page.source,
        }

        for asset_ref in re.findall(
            r'(?:src|href)=["\'](/archive/hosts/[^"\']+)', document, re.I
        ):
            relative_ref = html.unescape(asset_ref).split("?", 1)[0].lstrip("/")
            candidate = args.output.parent / relative_ref
            if not candidate.is_file():
                local_missing.add(asset_ref)
        old_asset_references += len(
            re.findall(
                rf"https?://{re.escape(SITE_HOST)}/(?:wp-content|wp-includes)/",
                document,
            )
        )

    for alias, target in ROUTE_ALIASES.items():
        if target in app_manifest:
            app_manifest[alias] = {
                **app_manifest[target],
                "source": f"compatibility alias for {target}",
            }

    args.app_manifest.parent.mkdir(parents=True, exist_ok=True)
    args.app_manifest.write_text(
        json.dumps(app_manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    summary = {
        "archive_pages": len(archive_pages),
        "news_pages": len(news_pages),
        "total_pages": len(pages),
        "resources": len(resources),
        "news_posts": news_manifest.get("category", {}).get("post_count", 0),
        "posts": news_manifest.get("posts", {}).get("post_count", 0),
        "books": news_manifest.get("books", {}).get("post_count", 0),
        "missing_local_resources": sorted(local_missing),
        "old_asset_references": old_asset_references,
    }
    (args.output / "build-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
