import { PasswordForm } from "@/components/admin/PasswordForm";
import { requireCmsUser } from "@/lib/auth";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ changed?: string }>;
}) {
  const user = await requireCmsUser("/admin/profile");
  const { changed } = await searchParams;
  return (
    <>
      <div className="cms-page-head">
        <div><h1>Профиль</h1><p>{user.displayName} · {user.email}</p></div>
      </div>
      {changed ? <div className="cms-alert success">Пароль изменён. Все прежние сеансы завершены.</div> : null}
      <div className="cms-two-columns">
        <PasswordForm />
        <section className="cms-card cms-card-body">
          <h2>Доступ</h2>
          <p>Роль: <strong>{user.role === "admin" ? "Администратор" : "Редактор"}</strong>.</p>
          <p className="cms-muted">После смены пароля другие устройства потребуется авторизовать заново.</p>
        </section>
      </div>
    </>
  );
}
