import Link from "next/link";
import { notFound } from "next/navigation";
import { archivePostAction } from "@/app/admin/actions";
import { PostForm } from "@/components/admin/PostForm";
import { getPostById, listCategories } from "@/db/cms";

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const post = getPostById(Number(id));
  if (!post) notFound();
  const { saved } = await searchParams;
  return (
    <>
      <div className="cms-page-head">
        <div><h1>Редактирование</h1><p>{post.categoryName} · /{post.slug}/</p></div>
        <div className="cms-form-actions">
          {post.status === "published" ? <Link className="cms-button secondary" href={`/${post.slug}/`} target="_blank">Посмотреть</Link> : null}
          <form action={archivePostAction}><input type="hidden" name="id" value={post.id} /><button className="cms-button danger" type="submit">В архив</button></form>
        </div>
      </div>
      {saved ? <div className="cms-alert success">Изменения сохранены.</div> : null}
      <PostForm categories={listCategories()} post={post} />
    </>
  );
}
