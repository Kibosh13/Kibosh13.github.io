import Link from "next/link";
import { requireCmsUser } from "@/lib/auth";
import { logoutAction } from "@/app/admin/actions";

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await requireCmsUser("/admin");
  return (
    <div className="cms-shell">
      <header className="cms-topbar">
        <Link className="cms-brand" href="/admin">Хроники преображения Мира</Link>
        <nav className="cms-nav" aria-label="Административное меню">
          <Link href="/admin">Материалы</Link>
          <Link href="/admin/posts/new">Новая публикация</Link>
          <Link href="/admin/media">Медиатека</Link>
          {user.role === "admin" ? <Link href="/admin/users">Пользователи</Link> : null}
          <Link href="/admin/profile">Профиль</Link>
          <Link href="/" target="_blank">Открыть сайт</Link>
        </nav>
        <div className="cms-user">
          <div><strong>{user.displayName}</strong><span>{user.role === "admin" ? "Администратор" : "Редактор"}</span></div>
          <form action={logoutAction}><button className="cms-link-button" type="submit">Выйти</button></form>
        </div>
      </header>
      <main className="cms-main">{children}</main>
    </div>
  );
}
