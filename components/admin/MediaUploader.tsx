"use client";

import { useState } from "react";

export function MediaUploader({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setMessage("");
    const body = new FormData();
    body.set("file", file);
    try {
      const response = await fetch("/api/admin/media", { method: "POST", body });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Не удалось загрузить файл.");
      setUrl(result.url);
      setMessage("Файл загружен.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить файл.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="cms-upload">
      {url ? <img className="cms-upload-preview" src={url} alt="Предпросмотр обложки" /> : null}
      <input className="cms-input" name="featuredImage" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="/media/файл.jpg или https://…" />
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => upload(event.target.files?.[0])} disabled={uploading} />
      {message ? <small>{message}</small> : null}
    </div>
  );
}
