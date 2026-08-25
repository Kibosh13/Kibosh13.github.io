import Link from "next/link";
import type { PostRecord } from "@/db/cms";
import { formatRussianDate } from "@/lib/cms";

export function PostCard({ post }: { post: PostRecord }) {
  return (
    <article className="site-post-card">
      {post.featuredImage ? <Link className="site-post-image" href={`/${post.slug}/`}><img src={post.featuredImage} alt={post.featuredImageAlt || post.title} loading="lazy" /></Link> : null}
      <div className="site-post-card-body">
        <div className="site-post-meta">{formatRussianDate(post.publishedAt || post.createdAt)} · {post.categoryName}</div>
        <h2><Link href={`/${post.slug}/`}>{post.title}</Link></h2>
        {post.excerpt ? <p>{post.excerpt}</p> : null}
        <Link className="site-read-more" href={`/${post.slug}/`}>Читать далее</Link>
      </div>
    </article>
  );
}
