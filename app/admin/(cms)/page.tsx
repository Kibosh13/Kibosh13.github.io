import Link from "next/link";
import { getDashboardStats, listAdminPosts, listCategories } from "@/db/cms";
import { formatRussianDate, type PostStatus } from "@/lib/cms";

const statusLabels: Record<PostStatus, string> = {
  published: "Опубликован",
  draft: "Черновик",
  archived: "В архиве",
};

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    category?: string;
    page?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const status = ["draft", "published", "archived"].includes(params.status || "")
    ? (params.status as PostStatus)
    : "all";
  const categoryId = Number(params.category || 0);
  const page = Math.max(1, Number(params.page || 1));
  const [stats, categories, result] = [
    getDashboardStats(),
    listCategories(),
    listAdminPosts({ search: params.q, status, categoryId, page }),
  ];
  const pages = Math.max(1, Math.ceil(result.total / result.limit));

  return (
    <>
      <div className="cms-page-head">
        <div><h1>Материалы</h1><p>Новости, блоги, творчество и мероприятия в одной редакции.</p></div>
        <Link className="cms-button" href="/admin/posts/new">Добавить материал</Link>
      </div>
      {params.error === "forbidden" ? <div className="cms-alert error">Этот раздел доступен только администратору.</div> : null}
      <section className="cms-stats" aria-label="Статистика материалов">
        <div className="cms-card cms-stat"><strong>{stats.total}</strong><span>Всего</span></div>
        <div className="cms-card cms-stat"><strong>{stats.published || 0}</strong><span>Опубликовано</span></div>
        <div className="cms-card cms-stat"><strong>{stats.drafts || 0}</strong><span>Черновиков</span></div>
        <div className="cms-card cms-stat"><strong>{stats.archived || 0}</strong><span>В архиве</span></div>
      </section>
      <section className="cms-card">
        <form className="cms-filters">
          <input className="cms-input" name="q" defaultValue={params.q} placeholder="Поиск по заголовку…" />
          <select className="cms-select" name="status" defaultValue={status}>
            <option value="all">Все статусы</option>
            <option value="published">Опубликованные</option>
            <option value="draft">Черновики</option>
            <option value="archived">Архив</option>
          </select>
          <select className="cms-select" name="category" defaultValue={categoryId || ""}>
            <option value="">Все категории</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <button className="cms-button secondary" type="submit">Найти</button>
        </form>
        {result.items.length ? (
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead><tr><th>Материал</th><th>Категория</th><th>Статус</th><th>Дата</th><th /></tr></thead>
              <tbody>
                {result.items.map((post) => (
                  <tr key={post.id}>
                    <td><Link className="cms-table-title" href={`/admin/posts/${post.id}`}>{post.title}</Link><div className="cms-muted">/{post.slug}/</div></td>
                    <td>{post.categoryName}</td>
                    <td><span className={`cms-status ${post.status}`}>{statusLabels[post.status]}</span></td>
                    <td>{formatRussianDate(post.publishedAt || post.updatedAt)}</td>
                    <td><Link className="cms-button secondary small" href={`/admin/posts/${post.id}`}>Изменить</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="cms-empty">Материалы не найдены.</div>}
        {pages > 1 ? (
          <nav className="cms-pagination" aria-label="Страницы">
            {page > 1 ? <Link className="cms-button secondary small" href={pageHref(params, page - 1)}>Назад</Link> : null}
            <span className="cms-muted">Страница {page} из {pages}</span>
            {page < pages ? <Link className="cms-button secondary small" href={pageHref(params, page + 1)}>Далее</Link> : null}
          </nav>
        ) : null}
      </section>
    </>
  );
}

function pageHref(params: Record<string, string | undefined>, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value && key !== "page") query.set(key, value);
  query.set("page", String(page));
  return `/admin?${query.toString()}`;
}
