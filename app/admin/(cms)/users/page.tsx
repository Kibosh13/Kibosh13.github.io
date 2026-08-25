import Link from "next/link";
import {
  resetUserPasswordAction,
  setUserRoleAction,
  toggleUserAction,
} from "@/app/admin/actions";
import { UserForm } from "@/components/admin/UserForm";
import { listUsers } from "@/db/cms";
import { requireCmsAdmin } from "@/lib/auth";
import { formatRussianDate } from "@/lib/cms";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    reset?: string;
    role?: string;
    error?: string;
  }>;
}) {
  const current = await requireCmsAdmin();
  const { created, reset, role, error } = await searchParams;
  const users = listUsers();
  return (
    <>
      <div className="cms-page-head"><div><h1>Пользователи</h1><p>Администраторы управляют доступом, редакторы работают с материалами.</p></div></div>
      {created ? <div className="cms-alert success">Пользователь создан.</div> : null}
      {reset ? <div className="cms-alert success">Пароль изменён, прежние сеансы пользователя завершены.</div> : null}
      {role ? <div className="cms-alert success">Роль пользователя изменена.</div> : null}
      {error ? <div className="cms-alert error">Не удалось выполнить действие. Проверьте данные или используйте страницу своего профиля.</div> : null}
      <div className="cms-two-columns">
        <UserForm />
        <section className="cms-card">
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead><tr><th>Пользователь</th><th>Роль</th><th>Создан</th><th /></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td><strong>{user.displayName}</strong><div className="cms-muted">{user.email}</div></td>
                    <td>
                      {user.id === current.id ? (
                        <span>{user.role === "admin" ? "Администратор" : "Редактор"} · вы</span>
                      ) : (
                        <form className="cms-inline-controls" action={setUserRoleAction}>
                          <input type="hidden" name="id" value={user.id} />
                          <select className="cms-select compact" name="role" defaultValue={user.role} aria-label={`Роль пользователя ${user.displayName}`}>
                            <option value="editor">Редактор</option>
                            <option value="admin">Администратор</option>
                          </select>
                          <button className="cms-button secondary small" type="submit">Сохранить</button>
                        </form>
                      )}
                    </td>
                    <td>{formatRussianDate(user.createdAt)}</td>
                    <td>
                      {user.id === current.id ? (
                        <Link className="cms-button secondary small" href="/admin/profile">Мой профиль</Link>
                      ) : (
                        <div className="cms-user-actions">
                          <form action={toggleUserAction}>
                            <input type="hidden" name="id" value={user.id} />
                            <button className={`cms-button small ${user.isActive ? "danger" : "secondary"}`} type="submit">{user.isActive ? "Отключить" : "Включить"}</button>
                          </form>
                          <details className="cms-reset-password">
                            <summary>Новый пароль</summary>
                            <form action={resetUserPasswordAction}>
                              <input type="hidden" name="id" value={user.id} />
                              <input className="cms-input compact" name="password" type="password" minLength={10} autoComplete="new-password" aria-label={`Новый пароль для ${user.displayName}`} placeholder="Не менее 10 символов" required />
                              <button className="cms-button secondary small" type="submit">Сменить</button>
                            </form>
                          </details>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
