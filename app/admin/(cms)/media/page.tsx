import { listMedia } from "@/db/cms";
import { formatRussianDate } from "@/lib/cms";

export default function MediaPage() {
  const items = listMedia();
  return (
    <>
      <div className="cms-page-head"><div><h1>Медиатека</h1><p>Последние изображения и файлы, загруженные через редактор.</p></div></div>
      <section className="cms-card cms-card-body">
        {items.length ? (
          <div className="cms-media-grid">
            {items.map((item) => (
              <article className="cms-media-item" key={item.id}>
                {item.mimeType.startsWith("image/") ? <img src={`/media/${item.storageName}`} alt={item.altText || item.originalName} /> : <div className="cms-file-icon">PDF</div>}
                <strong title={item.originalName}>{item.originalName}</strong>
                <span>{formatRussianDate(item.createdAt)} · {Math.ceil(item.size / 1024)} КБ</span>
                <code>/media/{item.storageName}</code>
              </article>
            ))}
          </div>
        ) : <div className="cms-empty">Файлы появятся здесь после первой загрузки.</div>}
      </section>
    </>
  );
}
