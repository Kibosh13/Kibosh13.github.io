import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { getSqlite, getUploadsDirectory } from "@/db";
import { getCurrentCmsUser } from "@/lib/auth";
import { detectAllowedUpload } from "@/lib/upload-validation";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 12 * 1024 * 1024;
const MAX_REQUEST_SIZE = 13 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentCmsUser();
  if (!user) return Response.json({ error: "Требуется вход." }, { status: 401 });

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_SIZE) {
    return Response.json({ error: "Максимальный размер файла — 12 МБ." }, { status: 413 });
  }

  const body = await request.formData();
  const file = body.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Файл не выбран." }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) return Response.json({ error: "Максимальный размер файла — 12 МБ." }, { status: 413 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const detected = detectAllowedUpload(bytes);
  if (!detected || (file.type && file.type !== detected.mimeType)) {
    return Response.json({ error: "Содержимое файла не соответствует разрешённому формату JPG, PNG, WebP, GIF или PDF." }, { status: 415 });
  }

  const storageName = `${randomUUID()}${detected.extension}`;
  const destination = path.join(/* turbopackIgnore: true */ getUploadsDirectory(), storageName);
  await writeFile(destination, bytes, { flag: "wx" });
  getSqlite()
    .prepare(`
      INSERT INTO media (storage_name, original_name, mime_type, size, uploaded_by)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(storageName, file.name.slice(0, 300), detected.mimeType, bytes.length, user.id);
  return Response.json({ url: `/media/${storageName}`, name: storageName }, { status: 201 });
}
