import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSqlite, getUploadsDirectory } from "@/db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  if (!/^[a-f0-9-]{36}\.(?:jpg|png|webp|gif|pdf)$/i.test(name)) return new Response("Not found", { status: 404 });
  const record = getSqlite()
    .prepare("SELECT mime_type AS mimeType, original_name AS originalName FROM media WHERE storage_name = ?")
    .get(name) as { mimeType: string; originalName: string } | undefined;
  if (!record) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(
      path.join(/* turbopackIgnore: true */ getUploadsDirectory(), name),
    );
    return new Response(bytes, {
      headers: {
        "content-type": record.mimeType,
        "content-disposition": record.mimeType === "application/pdf"
          ? `attachment; filename*=UTF-8''${encodeURIComponent(record.originalName)}`
          : "inline",
        "cache-control": "public, max-age=31536000, immutable",
        "content-security-policy": "default-src 'none'; sandbox",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
