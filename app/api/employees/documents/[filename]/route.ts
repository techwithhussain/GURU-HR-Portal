import path from "path";
import { readFile } from "fs/promises";
import { getSessionContext } from "@/services/sessionService";
import { hasPermission } from "@/lib/rbac/permissions";
import { prisma } from "@/lib/prisma";

const STORAGE_DIR = path.join(process.cwd(), "storage", "employee-documents");

const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
};

export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const session = await getSessionContext();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { filename } = await params;
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const doc = await prisma.employeeDocument.findFirst({
    where: { storagePath: filename },
    select: { employeeId: true, fileName: true },
  });
  if (!doc) return new Response("Not found", { status: 404 });

  const isOwner = session.employeeId === doc.employeeId;
  const isAdmin = hasPermission(session, "employee.manage");
  if (!isOwner && !isAdmin) return new Response("Forbidden", { status: 403 });

  const ext = filename.split(".").pop() ?? "";
  const mimeType = EXT_TO_MIME[ext] ?? "application/octet-stream";

  try {
    const buffer = await readFile(path.join(STORAGE_DIR, filename));
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${doc.fileName}"`,
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
