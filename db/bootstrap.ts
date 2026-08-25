import type Database from "better-sqlite3";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { sanitizePostHtml, slugify, stripHtml } from "@/lib/cms";
import { hashPassword } from "@/lib/passwords";

const OLD_ORIGIN = "https://xn----ctbjbaararyeivphq.xn--p1ai";
const LOCAL_ORIGIN = "/archive/hosts/xn----ctbjbaararyeivphq.xn--p1ai";

const defaultCategories = [
  { name: "Новости", slug: "news", parentSlug: null, sortOrder: 10 },
  { name: "Мероприятия", slug: "meropriyatiya", parentSlug: null, sortOrder: 20 },
  { name: "Творчество", slug: "creation", parentSlug: null, sortOrder: 30 },
  { name: "Стихи", slug: "creation/stihi", parentSlug: "creation", sortOrder: 31 },
  { name: "Песни", slug: "creation/pesni", parentSlug: "creation", sortOrder: 32 },
  { name: "Картинки", slug: "creation/kartinki", parentSlug: "creation", sortOrder: 33 },
  { name: "Прочее творчество", slug: "creation/prochee", parentSlug: "creation", sortOrder: 34 },
  { name: "Блоги", slug: "blog", parentSlug: null, sortOrder: 40 },
  { name: "Блог «Держава Света»", slug: "blog-derzhava-sveta", parentSlug: null, sortOrder: 41 },
  { name: "Блог Александра Липнягова", slug: "blog/blog-aleksanra-lipnyagova", parentSlug: "blog", sortOrder: 42 },
  { name: "Блог для начинающих", slug: "blog-dlya-nachinayushchih", parentSlug: null, sortOrder: 43 },
  { name: "Красноярск", slug: "blog/vestniki-peremen-g-krasnoyarsk", parentSlug: "blog", sortOrder: 44 },
  { name: "Блог «Хроники преображения Мира» г. Красноярск", slug: "blog/vestniki-peremen-g-krasnoyarsk/blog-vestniki-peremen-g-krasnoyarsk", parentSlug: "blog/vestniki-peremen-g-krasnoyarsk", sortOrder: 45 },
  { name: "Челябинск", slug: "blog/vestniki-peremen-g-chelyabinsk", parentSlug: "blog", sortOrder: 46 },
  { name: "Другие материалы", slug: "materials", parentSlug: null, sortOrder: 60 },
] as const;

const legacyCategoryRenames: Record<string, string> = {
  "blog/derzhava-sveta": "blog-derzhava-sveta",
  "blog/aleksandra-lipnyagova": "blog/blog-aleksanra-lipnyagova",
  "blog/dlya-nachinayushhih": "blog-dlya-nachinayushchih",
};

const wordpressCategoryPriority: Array<[number, string]> = [
  [25, "news"],
  [44, "blog/vestniki-peremen-g-chelyabinsk"],
  [1, "blog/vestniki-peremen-g-krasnoyarsk/blog-vestniki-peremen-g-krasnoyarsk"],
  [47, "blog-derzhava-sveta"],
  [41, "blog/blog-aleksanra-lipnyagova"],
  [48, "blog-dlya-nachinayushhih"],
  [38, "creation/kartinki"],
  [43, "meropriyatiya"],
  [37, "creation/pesni"],
  [39, "creation/prochee"],
  [36, "creation/stihi"],
  [42, "blog/vestniki-peremen-g-krasnoyarsk"],
  [40, "blog"],
  [26, "creation"],
  [58, "materials"],
];

type LegacyPost = {
  id: number;
  date?: string;
  modified?: string;
  slug?: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  content?: { rendered?: string };
  categories?: number[];
};

function localizeLegacyContent(value: string) {
  return value
    .replaceAll(`${OLD_ORIGIN}/wp-content/uploads/`, `${LOCAL_ORIGIN}/wp-content/uploads/`)
    .replaceAll(`//xn----ctbjbaararyeivphq.xn--p1ai/wp-content/uploads/`, `${LOCAL_ORIGIN}/wp-content/uploads/`);
}

function isoFromWordPress(value: string | undefined) {
  if (!value) return new Date().toISOString();
  const normalized = /z$|[+-]\d\d:\d\d$/i.test(value) ? value : `${value}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.valueOf()) ? new Date().toISOString() : date.toISOString();
}

export function seedCategories(sqlite: Database.Database) {
  for (const [oldSlug, newSlug] of Object.entries(legacyCategoryRenames)) {
    const target = sqlite.prepare("SELECT id FROM categories WHERE slug = ?").get(newSlug);
    if (!target) {
      sqlite.prepare("UPDATE categories SET slug = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ?").run(newSlug, oldSlug);
    }
  }
  const insert = sqlite.prepare(`
    INSERT INTO categories (name, slug, parent_slug, sort_order, is_system)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      parent_slug = excluded.parent_slug,
      sort_order = excluded.sort_order,
      is_system = 1,
      updated_at = CURRENT_TIMESTAMP
  `);
  const transaction = sqlite.transaction(() => {
    for (const category of defaultCategories) {
      insert.run(category.name, category.slug, category.parentSlug, category.sortOrder);
    }
  });
  transaction();
}

export function seedAdmin(sqlite: Database.Database) {
  const email = process.env.CMS_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.CMS_ADMIN_PASSWORD;
  if (!email || !password) return false;

  const displayName = process.env.CMS_ADMIN_NAME?.trim() || "Администратор";
  const existing = sqlite
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email) as { id: number } | undefined;
  if (existing) return false;

  sqlite
    .prepare(`
      INSERT INTO users (email, display_name, role, password_hash, is_active)
      VALUES (?, ?, 'admin', ?, 1)
    `)
    .run(email, displayName, hashPassword(password));
  return true;
}

export function importLegacyNews(sqlite: Database.Database) {
  if (process.env.CMS_IMPORT_NEWS === "false") return 0;

  const seedPath = path.resolve(
    /* turbopackIgnore: true */ process.env.CMS_NEWS_SEED_PATH || path.join(process.cwd(), "data", "news-posts.json"),
  );
  if (!existsSync(/* turbopackIgnore: true */ seedPath)) return 0;

  const records = JSON.parse(
    readFileSync(/* turbopackIgnore: true */ seedPath, "utf8"),
  ) as LegacyPost[];
  const categoryRows = sqlite
    .prepare("SELECT id, slug FROM categories")
    .all() as Array<{ id: number; slug: string }>;
  const categoryIds = new Map(categoryRows.map((category) => [category.slug, category.id]));
  const fallbackCategoryId = categoryIds.get("materials") || categoryIds.get("news");
  if (!fallbackCategoryId) return 0;

  const admin = sqlite
    .prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1")
    .get() as { id: number } | undefined;
  const insert = sqlite.prepare(`
    INSERT OR IGNORE INTO posts (
      legacy_wp_id, title, slug, excerpt, content_html, status, category_id,
      featured_image, featured_image_alt, external_links, seo_title,
      seo_description, published_at, author_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'published', ?, ?, ?, '[]', ?, ?, ?, ?, ?, ?)
  `);

  let imported = 0;
  const transaction = sqlite.transaction(() => {
    for (const record of records) {
      const categorySlug = wordpressCategoryPriority.find(([wordpressId]) =>
        record.categories?.includes(wordpressId)
      )?.[1];
      const categoryId = categoryIds.get(categorySlug || "materials") || fallbackCategoryId;
      const title = stripHtml(record.title?.rendered || "Без названия");
      const excerpt = stripHtml(record.excerpt?.rendered || "").slice(0, 600);
      const contentHtml = sanitizePostHtml(localizeLegacyContent(record.content?.rendered || ""));
      const imageMatch = contentHtml.match(/<img\b[^>]*\bsrc=["']([^"']+)/i);
      const publishedAt = isoFromWordPress(record.date);
      const updatedAt = isoFromWordPress(record.modified || record.date);
      const result = insert.run(
        record.id,
        title,
        slugify(record.slug || title) || `novost-${record.id}`,
        excerpt,
        contentHtml,
        categoryId,
        imageMatch?.[1] || "",
        title,
        title,
        excerpt,
        publishedAt,
        admin?.id || null,
        publishedAt,
        updatedAt,
      );
      imported += Number(result.changes);
    }
  });
  transaction();
  return imported;
}

export function initializeCms(sqlite: Database.Database) {
  seedCategories(sqlite);
  const adminCreated = seedAdmin(sqlite);
  const newsImported = importLegacyNews(sqlite);
  sqlite.pragma("optimize");
  return { adminCreated, newsImported };
}
