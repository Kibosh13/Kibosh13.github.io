import { PostForm } from "@/components/admin/PostForm";
import { listCategories } from "@/db/cms";

export default function NewPostPage() {
  return (
    <>
      <div className="cms-page-head"><div><h1>Новый материал</h1><p>Сохраните черновик или сразу опубликуйте его на сайте.</p></div></div>
      <PostForm categories={listCategories()} />
    </>
  );
}
