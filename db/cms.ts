import { getSqlite } from "./index";
import type { PostStatus } from "@/lib/cms";

export type CategoryRecord = {
  id: number;
  name: string;
  slug: string;
  parentSlug: string | null;
  description: string;
  sortOrder: number;
};

export type PostRecord = {
  id: number;
  legacyWpId: number | null;
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  status: PostStatus;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  featuredImage: string;
  featuredImageAlt: string;
  externalLinks: string;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string | null;
  authorId: number | null;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
};

const postSelect = `
  SELECT
    p.id,
    p.legacy_wp_id AS legacyWpId,
    p.title,
    p.slug,
    p.excerpt,
    p.content_html AS contentHtml,
    p.status,
    p.category_id AS categoryId,
    c.name AS categoryName,
    c.slug AS categorySlug,
    p.featured_image AS featuredImage,
    p.featured_image_alt AS featuredImageAlt,
    p.external_links AS externalLinks,
    p.seo_title AS seoTitle,
    p.seo_description AS seoDescription,
    p.published_at AS publishedAt,
    p.author_id AS authorId,
    u.display_name AS authorName,
    p.created_at AS createdAt,
    p.updated_at AS updatedAt
  FROM posts p
  JOIN categories c ON c.id = p.category_id
  LEFT JOIN users u ON u.id = p.author_id
`;

export function listCategories() {
  return getSqlite()
    .prepare(`
      SELECT id, name, slug, parent_slug AS parentSlug,
             description, sort_order AS sortOrder
      FROM categories
      ORDER BY sort_order, name
    `)
    .all() as CategoryRecord[];
}

export function getCategoryBySlug(slug: string) {
  return getSqlite()
    .prepare(`
      SELECT id, name, slug, parent_slug AS parentSlug,
             description, sort_order AS sortOrder
      FROM categories WHERE slug = ?
    `)
    .get(slug) as CategoryRecord | undefined;
}

export function getPostById(id: number) {
  return getSqlite()
    .prepare(`${postSelect} WHERE p.id = ?`)
    .get(id) as PostRecord | undefined;
}

export function getPublishedPostBySlug(slug: string) {
  return getSqlite()
    .prepare(`
      ${postSelect}
      WHERE p.slug = ?
        AND p.status = 'published'
        AND (p.published_at IS NULL OR p.published_at <= ?)
    `)
    .get(slug, new Date().toISOString()) as PostRecord | undefined;
}

type AdminPostFilters = {
  search?: string;
  status?: PostStatus | "all";
  categoryId?: number;
  page?: number;
  limit?: number;
};

function adminWhere(filters: AdminPostFilters) {
  const clauses: string[] = [];
  const values: Array<string | number> = [];
  if (filters.search?.trim()) {
    clauses.push("(p.title LIKE ? OR p.excerpt LIKE ?)");
    const search = `%${filters.search.trim()}%`;
    values.push(search, search);
  }
  if (filters.status && filters.status !== "all") {
    clauses.push("p.status = ?");
    values.push(filters.status);
  }
  if (filters.categoryId) {
    clauses.push("p.category_id = ?");
    values.push(filters.categoryId);
  }
  return {
    sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
}

export function listAdminPosts(filters: AdminPostFilters = {}) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 30));
  const where = adminWhere(filters);
  const items = getSqlite()
    .prepare(`
      ${postSelect}
      ${where.sql}
      ORDER BY COALESCE(p.published_at, p.updated_at) DESC, p.id DESC
      LIMIT ? OFFSET ?
    `)
    .all(...where.values, limit, (page - 1) * limit) as PostRecord[];
  const total = getSqlite()
    .prepare(`SELECT COUNT(*) AS count FROM posts p ${where.sql}`)
    .get(...where.values) as { count: number };
  return { items, total: total.count, page, limit };
}

export function listPublishedPosts(categorySlug: string, page = 1, limit = 12) {
  const safePage = Math.max(1, page);
  const now = new Date().toISOString();
  const items = getSqlite()
    .prepare(`
      ${postSelect}
      WHERE c.slug = ?
        AND p.status = 'published'
        AND (p.published_at IS NULL OR p.published_at <= ?)
      ORDER BY COALESCE(p.published_at, p.created_at) DESC, p.id DESC
      LIMIT ? OFFSET ?
    `)
    .all(categorySlug, now, limit, (safePage - 1) * limit) as PostRecord[];
  const total = getSqlite()
    .prepare(`
      SELECT COUNT(*) AS count
      FROM posts p JOIN categories c ON c.id = p.category_id
      WHERE c.slug = ? AND p.status = 'published'
        AND (p.published_at IS NULL OR p.published_at <= ?)
    `)
    .get(categorySlug, now) as { count: number };
  return { items, total: total.count, page: safePage, limit };
}

export function searchPublishedPosts(queryValue: string, page = 1, limit = 12) {
  const query = queryValue.trim().slice(0, 160);
  const safePage = Math.max(1, page);
  if (!query) return { items: [] as PostRecord[], total: 0, page: safePage, limit };
  const now = new Date().toISOString();
  const pattern = `%${query}%`;
  const where = `
    WHERE p.status = 'published'
      AND (p.published_at IS NULL OR p.published_at <= ?)
      AND (p.title LIKE ? OR p.excerpt LIKE ? OR p.content_html LIKE ?)
  `;
  const items = getSqlite()
    .prepare(`
      ${postSelect}
      ${where}
      ORDER BY COALESCE(p.published_at, p.created_at) DESC, p.id DESC
      LIMIT ? OFFSET ?
    `)
    .all(now, pattern, pattern, pattern, limit, (safePage - 1) * limit) as PostRecord[];
  const total = getSqlite()
    .prepare(`SELECT COUNT(*) AS count FROM posts p ${where}`)
    .get(now, pattern, pattern, pattern) as { count: number };
  return { items, total: total.count, page: safePage, limit };
}

export function getDashboardStats() {
  return getSqlite()
    .prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archived
      FROM posts
    `)
    .get() as { total: number; published: number; drafts: number; archived: number };
}

export function listUsers() {
  return getSqlite()
    .prepare(`
      SELECT id, email, display_name AS displayName, role,
             is_active AS isActive, created_at AS createdAt
      FROM users ORDER BY is_active DESC, display_name
    `)
    .all() as Array<{
      id: number;
      email: string;
      displayName: string;
      role: "admin" | "editor";
      isActive: 0 | 1;
      createdAt: string;
    }>;
}

export function listMedia(limit = 60) {
  return getSqlite()
    .prepare(`
      SELECT id, storage_name AS storageName, original_name AS originalName,
             mime_type AS mimeType, size, alt_text AS altText,
             created_at AS createdAt
      FROM media ORDER BY id DESC LIMIT ?
    `)
    .all(limit) as Array<{
      id: number;
      storageName: string;
      originalName: string;
      mimeType: string;
      size: number;
      altText: string;
      createdAt: string;
    }>;
}
