import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { getSqlite } from "@/db";
import type { CmsUser } from "./cms";
import { hashPassword, verifyPassword } from "./passwords";

const SESSION_COOKIE = "cms_session";
const SESSION_DAYS = 14;
const DUMMY_PASSWORD_HASH = hashPassword("invalid-password-placeholder");

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getCurrentCmsUser(): Promise<CmsUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const now = new Date().toISOString();
  const row = getSqlite()
    .prepare(`
      SELECT u.id, u.email, u.display_name AS displayName, u.role
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ? AND u.is_active = 1
    `)
    .get(tokenHash(token), now) as CmsUser | undefined;
  return row || null;
}

export async function requireCmsUser(returnTo = "/admin") {
  const user = await getCurrentCmsUser();
  if (!user) redirect(`/admin/login?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`);
  return user;
}

export async function requireCmsAdmin(returnTo = "/admin/users") {
  const user = await requireCmsUser(returnTo);
  if (user.role !== "admin") redirect("/admin?error=forbidden");
  return user;
}

export async function authenticateCmsUser(emailValue: string, password: string) {
  const email = emailValue.trim().toLowerCase();
  const sqlite = getSqlite();
  const row = sqlite
    .prepare(`
      SELECT id, email, display_name AS displayName, role, password_hash AS passwordHash,
             failed_attempts AS failedAttempts, locked_until AS lockedUntil,
             is_active AS isActive
      FROM users WHERE email = ?
    `)
    .get(email) as (CmsUser & {
      passwordHash: string;
      failedAttempts: number;
      lockedUntil: string | null;
      isActive: 0 | 1;
    }) | undefined;

  const passwordValid = verifyPassword(password, row?.passwordHash || DUMMY_PASSWORD_HASH);
  const now = Date.now();
  if (!row || !row.isActive || (row.lockedUntil && new Date(row.lockedUntil).getTime() > now) || !passwordValid) {
    if (row && row.isActive) {
      const attempts = row.failedAttempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(now + 15 * 60_000).toISOString() : null;
      sqlite
        .prepare("UPDATE users SET failed_attempts = ?, locked_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(lockedUntil ? 0 : attempts, lockedUntil, row.id);
    }
    return null;
  }

  sqlite
    .prepare("UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(row.id);
  return { id: row.id, email: row.email, displayName: row.displayName, role: row.role } satisfies CmsUser;
}

export async function createCmsSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60_000);
  const sqlite = getSqlite();
  sqlite.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString());
  sqlite
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(tokenHash(token), userId, expires.toISOString());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroyCmsSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) getSqlite().prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(token));
  cookieStore.delete(SESSION_COOKIE);
}

export function createEditorPasswordHash(password: string) {
  return hashPassword(password);
}

function safeReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/admin";
  return value.startsWith("/admin") ? value : "/admin";
}
