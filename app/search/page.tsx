import type { Metadata } from "next";
import Link from "next/link";
import { PostCard } from "@/components/site/PostCard";
import { SiteLayout } from "@/components/site/SiteLayout";
import { searchPublishedPosts } from "@/db/cms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Поиск — Хроники преображения Мира",
  description: "Поиск по сохранённым и новым материалам сайта.",
  openGraph: { images: ["/og.png"] },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; page?: string }>;
}) {
  const { s = "", page: pageValue } = await searchParams;
  const page = Math.max(1, Number(pageValue || 1));
  const result = searchPublishedPosts(s, page);
  const pages = Math.max(1, Math.ceil(result.total / result.limit));
  return (
    <SiteLayout>
      <section className="site-category-head">
        <span>Поиск по сайту</span>
        <h1>{s ? `Результаты для «${s}»` : "Найти материал"}</h1>
        <form className="site-search-form" action="/search">
          <label className="site-sr-only" htmlFor="siteSearch">Поисковый запрос</label>
          <input id="siteSearch" name="s" defaultValue={s} placeholder="Введите слова для поиска" />
          <button type="submit">Найти</button>
        </form>
      </section>
      {s && result.items.length ? (
        <div className="site-post-grid">{result.items.map((post) => <PostCard post={post} key={post.id} />)}</div>
      ) : s ? <p className="site-empty">По вашему запросу ничего не найдено.</p> : null}
      {pages > 1 ? (
        <nav className="site-pagination" aria-label="Страницы">
          {page > 1 ? <Link href={`/search?s=${encodeURIComponent(s)}&page=${page - 1}`}>← Назад</Link> : <span />}
          <span>{page} из {pages}</span>
          {page < pages ? <Link href={`/search?s=${encodeURIComponent(s)}&page=${page + 1}`}>Далее →</Link> : <span />}
        </nav>
      ) : null}
    </SiteLayout>
  );
}
