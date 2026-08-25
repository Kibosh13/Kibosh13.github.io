"use client";

import { useActionState } from "react";
import { savePostAction, type ActionState } from "@/app/admin/actions";
import type { CategoryRecord, PostRecord } from "@/db/cms";
import { MediaUploader } from "./MediaUploader";
import { RichTextEditor } from "./RichTextEditor";

const initialState: ActionState = {};

export function PostForm({
  categories,
  post,
}: {
  categories: CategoryRecord[];
  post?: PostRecord;
}) {
  const [state, action, pending] = useActionState(savePostAction, initialState);
  const newsCategory = categories.find((category) => category.slug === "news");
  return (
    <form action={action} className="cms-form-layout">
      <input type="hidden" name="id" value={post?.id || ""} />
      <div className="cms-form-main">
        {state.error ? <div className="cms-alert error" role="alert">{state.error}</div> : null}
        <section className="cms-card cms-card-body cms-form-main">
          <div className="cms-field">
            <label htmlFor="title">Заголовок</label>
            <input className="cms-input" id="title" name="title" defaultValue={post?.title} required />
          </div>
          <div className="cms-field">
            <label htmlFor="slug">Адрес страницы</label>
            <input className="cms-input" id="slug" name="slug" defaultValue={post?.slug} placeholder="Создастся из заголовка автоматически" />
            <small>Латинские буквы, цифры и дефисы. После публикации лучше не менять.</small>
          </div>
          <div className="cms-field">
            <label htmlFor="excerpt">Краткое описание</label>
            <textarea className="cms-textarea" id="excerpt" name="excerpt" defaultValue={post?.excerpt} placeholder="Показывается в списках и поисковых системах" />
          </div>
          <div className="cms-field">
            <span>Основной текст</span>
            <RichTextEditor initialHtml={post?.contentHtml || "<p></p>"} />
          </div>
        </section>
        <section className="cms-card cms-card-body cms-form-main">
          <h2>Ссылки и поисковое описание</h2>
          <div className="cms-field">
            <label htmlFor="externalLinks">Дополнительные ссылки</label>
            <textarea className="cms-textarea" id="externalLinks" name="externalLinks" defaultValue={linksToText(post?.externalLinks)} placeholder={'Название | https://example.com\nЕщё одна ссылка | https://…'} />
            <small>По одной ссылке в строке.</small>
          </div>
          <div className="cms-field"><label htmlFor="seoTitle">SEO-заголовок</label><input className="cms-input" id="seoTitle" name="seoTitle" defaultValue={post?.seoTitle} /></div>
          <div className="cms-field"><label htmlFor="seoDescription">SEO-описание</label><textarea className="cms-textarea" id="seoDescription" name="seoDescription" defaultValue={post?.seoDescription} /></div>
        </section>
      </div>
      <aside className="cms-form-side">
        <section className="cms-card cms-card-body cms-form-main">
          <h2>Публикация</h2>
          <div className="cms-field">
            <label htmlFor="status">Статус</label>
            <select className="cms-select" id="status" name="status" defaultValue={post?.status || "draft"}>
              <option value="draft">Черновик</option>
              <option value="published">Опубликован</option>
              <option value="archived">В архиве</option>
            </select>
          </div>
          <div className="cms-field">
            <label htmlFor="categoryId">Категория</label>
            <select className="cms-select" id="categoryId" name="categoryId" defaultValue={post?.categoryId || newsCategory?.id} required>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.parentSlug ? "— " : ""}{category.name}</option>)}
            </select>
          </div>
          <div className="cms-field"><label htmlFor="publishedAt">Дата публикации</label><input className="cms-input" id="publishedAt" name="publishedAt" type="datetime-local" defaultValue={dateTimeLocal(post?.publishedAt)} /></div>
          <div className="cms-form-actions"><button className="cms-button" type="submit" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить"}</button></div>
        </section>
        <section className="cms-card cms-card-body cms-form-main">
          <h2>Обложка</h2>
          <MediaUploader initialUrl={post?.featuredImage || ""} />
          <div className="cms-field"><label htmlFor="featuredImageAlt">Описание изображения</label><input className="cms-input" id="featuredImageAlt" name="featuredImageAlt" defaultValue={post?.featuredImageAlt} /></div>
        </section>
      </aside>
    </form>
  );
}

function linksToText(value: string | undefined) {
  if (!value) return "";
  try {
    const links = JSON.parse(value) as Array<{ label: string; url: string }>;
    return links.map((link) => `${link.label} | ${link.url}`).join("\n");
  } catch {
    return "";
  }
}

function dateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
