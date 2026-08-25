import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parseExternalLinks, sanitizePostHtml, slugify } from "../lib/cms";
import { hashPassword, verifyPassword } from "../lib/passwords";
import { detectAllowedUpload } from "../lib/upload-validation";

test("CMS utilities create safe slugs, links and article HTML", () => {
  assert.equal(slugify("Новая Жизнь и Свет!"), "novaja-zhizn-i-svet");
  assert.deepEqual(parseExternalLinks("Источник | https://example.com/a\nплохо | javascript:alert(1)"), [
    { label: "Источник", url: "https://example.com/a" },
  ]);
  const cleaned = sanitizePostHtml('<p>Текст</p><script>alert(1)</script><a href="https://example.com">Ссылка</a>');
  assert.match(cleaned, /<p>Текст<\/p>/);
  assert.doesNotMatch(cleaned, /script|alert/);
  assert.match(cleaned, /rel="noopener noreferrer"/);
});

test("password hashes are salted and verifiable", () => {
  const first = hashPassword("very-strong-password");
  const second = hashPassword("very-strong-password");
  assert.notEqual(first, second);
  assert.equal(verifyPassword("very-strong-password", first), true);
  assert.equal(verifyPassword("wrong", first), false);
});

test("uploads are accepted by their real file signature", () => {
  assert.deepEqual(detectAllowedUpload(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), {
    mimeType: "image/png",
    extension: ".png",
  });
  assert.deepEqual(detectAllowedUpload(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])), {
    mimeType: "application/pdf",
    extension: ".pdf",
  });
  assert.equal(detectAllowedUpload(new TextEncoder().encode("<script>alert(1)</script>")), null);
});

test("database migration imports categories, administrator and legacy news", async () => {
  const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), "hroniki-cms-"));
  process.env.CMS_DATA_DIR = temporaryDirectory;
  process.env.CMS_ADMIN_EMAIL = "test@example.com";
  process.env.CMS_ADMIN_PASSWORD = "test-password-2026";
  process.env.CMS_ADMIN_NAME = "Тестовый администратор";
  process.env.CMS_NEWS_SEED_PATH = path.join(process.cwd(), "data", "news-posts.json");
  process.env.CMS_IMPORT_NEWS = "true";
  const expectedPosts = (await import("../data/news-posts.json", { with: { type: "json" } })).default.length;

  const { getSqlite } = await import("../db/index");
  const sqlite = getSqlite();
  const counts = sqlite.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM categories) AS categories,
      (SELECT COUNT(*) FROM posts WHERE status = 'published') AS posts
  `).get() as { users: number; categories: number; posts: number };
  assert.equal(counts.users, 1);
  assert.equal(counts.categories, 15);
  assert.equal(counts.posts, expectedPosts);

  const plan = sqlite
    .prepare("EXPLAIN QUERY PLAN SELECT * FROM posts WHERE category_id = ? AND status = 'published' ORDER BY published_at DESC")
    .all(1) as Array<{ detail: string }>;
  assert.ok(plan.some((row) => row.detail.includes("idx_posts_category_status_published_at")));
  sqlite.close();
  rmSync(temporaryDirectory, { recursive: true, force: true });
});
