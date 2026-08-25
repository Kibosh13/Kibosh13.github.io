import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveFrame } from "@/app/ArchiveFrame";
import manifest from "@/app/archive-manifest.json";
import { getCategoryBySlug, listPublishedPosts } from "@/db/cms";
import { PostCard } from "@/components/site/PostCard";
import { SiteLayout } from "@/components/site/SiteLayout";

type ArchiveRecord = { archivePath: string; title: string; description: string };
const archive = manifest as Record<string, ArchiveRecord>;

type Props = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ page?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const categorySlug = slug.join("/");
  const category = getCategoryBySlug(categorySlug);
  if (category) {
    const title = `${category.name} — Хроники преображения Мира`;
    const description = category.description || `Материалы раздела «${category.name}».`;
    return { title, description, openGraph: { title, description, images: ["/og.png"] }, twitter: { title, description, images: ["/og.png"] } };
  }
  const record = archive[`/category/${categorySlug}/`];
  return record ? { title: record.title, description: record.description } : {};
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const categorySlug = slug.join("/");
  const category = getCategoryBySlug(categorySlug);
  const archiveRecord = archive[`/category/${categorySlug}/`];
  if (!category) {
    if (archiveRecord) return <ArchiveFrame archivePath={archiveRecord.archivePath} title={archiveRecord.title} />;
    notFound();
  }

  const query = await searchParams;
  const page = Math.max(1, Number(query.page || 1));
  const result = listPublishedPosts(category.slug, page);
  if (!result.total && archiveRecord) return <ArchiveFrame archivePath={archiveRecord.archivePath} title={archiveRecord.title} />;
  const pages = Math.max(1, Math.ceil(result.total / result.limit));
  return (
    <SiteLayout>
      <section className="site-category-head"><span>Раздел сайта</span><h1>{category.name}</h1>{category.description ? <p>{category.description}</p> : null}</section>
      {result.items.length ? <div className="site-post-grid">{result.items.map((post) => <PostCard post={post} key={post.id} />)}</div> : <p className="site-empty">В этом разделе пока нет опубликованных материалов.</p>}
      {pages > 1 ? <nav className="site-pagination" aria-label="Страницы">{page > 1 ? <Link href={`?page=${page - 1}`}>← Назад</Link> : <span /> }<span>{page} из {pages}</span>{page < pages ? <Link href={`?page=${page + 1}`}>Далее →</Link> : <span />}</nav> : null}
      {archiveRecord && category.slug !== "news" ? <p className="site-archive-link"><a href={archiveRecord.archivePath}>Открыть сохранённый архив раздела</a></p> : null}
    </SiteLayout>
  );
}
