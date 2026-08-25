#!/usr/bin/env python3
"""Reapply lightweight HTML-only restoration fixes without rebuilding assets."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from build_snapshot import (
    SITE_ORIGIN,
    inject_fixes,
    localize_escaped_asset_roots,
    localize_site_origin,
    replace_site_name,
    rewrite_internal_links,
    strip_static_post_scripts,
    strip_tracking,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pages_dir", type=Path)
    parser.add_argument("--manifest", type=Path)
    args = parser.parse_args()
    manifest = (
        json.loads(args.manifest.read_text(encoding="utf-8"))
        if args.manifest
        else {}
    )
    changed = 0
    known_routes = set(manifest)
    for page in args.pages_dir.rglob("index.html"):
        source = page.read_text(encoding="utf-8")
        relative_parent = page.parent.relative_to(args.pages_dir)
        route = "/" if relative_parent == Path(".") else f"/{relative_parent.as_posix()}/"
        updated = strip_tracking(source)
        updated = localize_escaped_asset_roots(updated)
        updated = rewrite_internal_links(updated, SITE_ORIGIN + route, known_routes)
        updated = localize_site_origin(updated)
        updated = replace_site_name(updated)
        if manifest.get(route, {}).get("kind") in {"news-post", "post"}:
            updated = strip_static_post_scripts(updated)
        updated = inject_fixes(updated, route)
        if updated != source:
            page.write_text(updated, encoding="utf-8")
            changed += 1
    if args.manifest:
        for record in manifest.values():
            record["title"] = replace_site_name(record.get("title", ""))
            record["description"] = replace_site_name(record.get("description", ""))
        args.manifest.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    print(f"Updated pages: {changed}")


if __name__ == "__main__":
    main()
