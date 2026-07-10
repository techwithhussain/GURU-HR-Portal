import { randomUUID } from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import { requireSession } from "@/services/sessionService";
import { requirePermission } from "@/lib/rbac/permissions";

const STORAGE_DIR = path.join(process.cwd(), "storage", "employee-documents");

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  const session = await requireSession();
  requirePermission(session, "employee.manage");

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Please choose a file to upload." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be 5MB or smaller." }, { status: 400 });
  }
  const ext = ALLOWED_MIME_TO_EXT[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Only PDF, JPG, or PNG files are allowed." }, { status: 400 });
  }

  await mkdir(STORAGE_DIR, { recursive: true });
  const storedName = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(STORAGE_DIR, storedName), buffer);

  return NextResponse.json({ path: storedName, fileName: file.name });
}
