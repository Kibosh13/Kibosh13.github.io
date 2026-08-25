"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSqlite } from "@/db";
import {
  authenticateCmsUser,
  createCmsSession,
  createEditorPasswordHash,
  destroyCmsSession,
  requireCmsAdmin,
  requireCmsUser,
} from "@/lib/auth";
import {
  parseExternalLinks,
  sanitizePostHtml,
  slugify,
  type PostStatus,
} from "@/lib/cms";
import { hashPassword, verifyPassword } from "@/lib/passwords";

export type ActionState = {
  error?: string;
};

export async function loginAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const returnTo = safeAdminReturnTo(String(formData.get("returnTo") || "/admin"));
  if (!email || !password) return { error: "Введите почту и пароль." };

  const user = await authenticateCmsUser(email, password);
  if (!user) return { error: "Неверные данные или вход временно заблокирован." };
  await createCmsSession(user.id);
  redirect(returnTo);
}

export async function logoutAction() {
  await destroyCmsSession();
  redirect("/admin/login");
}

export async function savePostAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireCmsUser("/admin/posts/new");
  const sqlite = getSqlite();
  const idValue = Number(formData.get("id") || 0);
  const title = String(formData.get("title") || "").trim();
  const requestedSlug = String(formData.get("slug") || "").trim();
  const slug = slugify(requestedSlug || title);
  const excerpt = String(formData.get("excerpt") || "").trim().slice(0, 1200);
  const contentHtml = sanitizePostHtml(String(formData.get("contentHtml") || ""));
  const categoryId = Number(formData.get("categoryId") || 0);
  const featuredImage = normalizeMediaUrl(String(formData.get("featuredImage") || ""));
  const featuredImageAlt = String(formData.get("featuredImageAlt") || "").trim().slice(0, 300);
  const seoTitle = String(formData.get("seoTitle") || "").trim().slice(0, 200);
  const seoDescription = String(formData.get("seoDescription") || "").trim().slice(0, 500);
  const externalLinks = JSON.stringify(
    parseExternalLinks(String(formData.get("externalLinks") || "")),
  );
  const statusInput = String(formData.get("status") || "draft");
  const status: PostStatus = ["draft", "published", "archived"].includes(statusInput)
    ? (statusInput as PostStatus)
    : "draft";
  const dateInput = String(formData.get("publishedAt") || "");
  const publishedAt = status === "published"
    ? parsePublicationDate(dateInput) || new Date().toISOString()
    : parsePublicationDate(dateInput);

  if (!title) return { error: "Укажите заголовок." };
  if (!slug) return { error: "Не удалось сформировать адрес страницы." };
  if (!categoryId) return { error: "Выберите категорию." };
  if (!contentHtml && !excerpt) return { error: "Добавьте текст или краткое описание." };

  const category = sqlite.prepare("SELECT id, slug FROM categories WHERE id = ?").get(categoryId) as
    | { id: number; slug: string }
    | undefined;
  if (!category) return { error: "Выбранная категория не существует." };

  const conflicting = sqlite
    .prepare("SELECT id FROM posts WHERE slug = ? AND id != ?")
    .get(slug, idValue || 0) as { id: number } | undefined;
  if (conflicting) return { error: "Такой адрес страницы уже используется." };

  let postId = idValue;
  const transaction = sqlite.transaction(() => {
    if (idValue) {
      const previous = sqlite.prepare("SELECT * FROM posts WHERE id = ?").get(idValue) as
        | Record<string, string | number | null>
        | undefined;
      if (!previous) throw new Error("Материал не найден.");
      sqlite.prepare(`
        INSERT INTO post_revisions (
          post_id, title, excerpt, content_html, status, category_id,
          featured_image, external_links, editor_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        idValue,
        previous.title,
        previous.excerpt,
        previous.content_html,
        previous.status,
        previous.category_id,
        previous.featured_image,
        previous.external_links,
        user.id,
      );
      sqlite.prepare(`
        UPDATE posts SET
          title = ?, slug = ?, excerpt = ?, content_html = ?, status = ?,
          category_id = ?, featured_image = ?, featured_image_alt = ?,
          external_links = ?, seo_title = ?, seo_description = ?,
          published_at = ?, author_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        title, slug, excerpt, contentHtml, status, categoryId, featuredImage,
        featuredImageAlt, externalLinks, seoTitle, seoDescription, publishedAt,
        user.id, idValue,
      );
    } else {
      const result = sqlite.prepare(`
        INSERT INTO posts (
          title, slug, excerpt, content_html, status, category_id,
          featured_image, featured_image_alt, external_links, seo_title,
          seo_description, published_at, author_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        title, slug, excerpt, contentHtml, status, categoryId, featuredImage,
        featuredImageAlt, externalLinks, seoTitle, seoDescription, publishedAt,
        user.id,
      );
      postId = Number(result.lastInsertRowid);
    }
  });
  try {
    transaction();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Не удалось сохранить материал." };
  }

  revalidatePath("/admin");
  revalidatePath(`/category/${category.slug}/`);
  revalidatePath(`/${slug}/`);
  redirect(`/admin/posts/${postId}?saved=1`);
}

export async function archivePostAction(formData: FormData) {
  await requireCmsUser("/admin");
  const id = Number(formData.get("id") || 0);
  if (id) {
    const sqlite = getSqlite();
    const post = sqlite.prepare("SELECT slug FROM posts WHERE id = ?").get(id) as
      | { slug: string }
      | undefined;
    sqlite
      .prepare("UPDATE posts SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(id);
    if (post) revalidatePath(`/${post.slug}/`);
  }
  revalidatePath("/admin");
}

export async function createUserAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireCmsAdmin();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") || "").trim();
  const password = String(formData.get("password") || "");
  const role = formData.get("role") === "admin" ? "admin" : "editor";
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Укажите корректную почту." };
  if (!displayName) return { error: "Укажите имя." };
  if (password.length < 10) return { error: "Пароль должен содержать не менее 10 символов." };
  try {
    getSqlite()
      .prepare(`
        INSERT INTO users (email, display_name, role, password_hash, is_active)
        VALUES (?, ?, ?, ?, 1)
      `)
      .run(email, displayName, role, createEditorPasswordHash(password));
  } catch {
    return { error: "Пользователь с такой почтой уже существует." };
  }
  revalidatePath("/admin/users");
  redirect("/admin/users?created=1");
}

export async function toggleUserAction(formData: FormData) {
  const current = await requireCmsAdmin();
  const id = Number(formData.get("id") || 0);
  if (!id || id === current.id) return;
  const sqlite = getSqlite();
  sqlite
    .prepare("UPDATE users SET is_active = CASE is_active WHEN 1 THEN 0 ELSE 1 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(id);
  sqlite.prepare("DELETE FROM sessions WHERE user_id = ? AND NOT EXISTS (SELECT 1 FROM users WHERE id = ? AND is_active = 1)").run(id, id);
  revalidatePath("/admin/users");
}

export async function setUserRoleAction(formData: FormData) {
  const current = await requireCmsAdmin();
  const id = Number(formData.get("id") || 0);
  const role = formData.get("role") === "admin" ? "admin" : "editor";
  if (!id || id === current.id) redirect("/admin/users?error=own-role");
  getSqlite()
    .prepare("UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(role, id);
  revalidatePath("/admin/users");
  redirect("/admin/users?role=1");
}

export async function resetUserPasswordAction(formData: FormData) {
  const current = await requireCmsAdmin();
  const id = Number(formData.get("id") || 0);
  const password = String(formData.get("password") || "");
  if (!id || id === current.id) redirect("/admin/users?error=own-password");
  if (password.length < 10) redirect("/admin/users?error=password");

  const sqlite = getSqlite();
  const user = sqlite.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!user) redirect("/admin/users?error=missing-user");
  const transaction = sqlite.transaction(() => {
    sqlite
      .prepare(`
        UPDATE users
        SET password_hash = ?, failed_attempts = 0, locked_until = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .run(hashPassword(password), id);
    sqlite.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  });
  transaction();
  redirect("/admin/users?reset=1");
}

export async function changeOwnPasswordAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireCmsUser("/admin/profile");
  const currentPassword = String(formData.get("currentPassword") || "");
  const password = String(formData.get("password") || "");
  const confirmation = String(formData.get("confirmation") || "");
  if (password.length < 10) return { error: "Новый пароль должен содержать не менее 10 символов." };
  if (password !== confirmation) return { error: "Новые пароли не совпадают." };
  if (password === currentPassword) return { error: "Новый пароль должен отличаться от текущего." };

  const sqlite = getSqlite();
  const record = sqlite
    .prepare("SELECT password_hash AS passwordHash FROM users WHERE id = ?")
    .get(user.id) as { passwordHash: string } | undefined;
  if (!record || !verifyPassword(currentPassword, record.passwordHash)) {
    return { error: "Текущий пароль указан неверно." };
  }

  const transaction = sqlite.transaction(() => {
    sqlite
      .prepare(`
        UPDATE users
        SET password_hash = ?, failed_attempts = 0, locked_until = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .run(hashPassword(password), user.id);
    sqlite.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
  });
  transaction();
  await createCmsSession(user.id);
  redirect("/admin/profile?changed=1");
}

function parsePublicationDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function normalizeMediaUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed.slice(0, 1000);
  try {
    const url = new URL(trimmed);
    return ["http:", "https:"].includes(url.protocol) ? url.toString().slice(0, 1000) : "";
  } catch {
    return "";
  }
}

function safeAdminReturnTo(value: string) {
  if (!value.startsWith("/admin") || value.startsWith("//")) return "/admin";
  return value;
}
