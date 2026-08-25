import Link from "next/link";
import type { PostRecord } from "@/db/cms";
import { formatRussianDate, parseStoredLinks } from "@/lib/cms";
import { SiteLayout } from "./SiteLayout";

export function PostView({ post }: { post: PostRecord }) {
  const links = parseStoredLinks(post.externalLinks);
  return (
    <SiteLayout>
      <article className="site-article">
        <div className="site-breadcrumbs"><Link href={`/category/${post.categorySlug}/`}>{post.categoryName}</Link><span>·</span><time>{formatRussianDate(post.publishedAt || post.createdAt)}</time></div>
        <h1>{post.title}</h1>
        {post.featuredImage ? <img className="site-article-cover" src={post.featuredImage} alt={post.featuredImageAlt || post.title} /> : null}
        {post.excerpt ? <p className="site-article-lead">{post.excerpt}</p> : null}
        <div className="site-article-body" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
        {links.length ? (
          <section className="site-external-links"><h2>Ссылки</h2><ul>{links.map((link) => <li key={link.url}><a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a></li>)}</ul></section>
        ) : null}
      </article>
    </SiteLayout>
  );
}
