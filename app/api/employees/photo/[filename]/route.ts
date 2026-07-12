import path from "path";
import { readFile } from "fs/promises";
import { getSessionContext } from "@/services/sessionService";
import { hasPermission } from "@/lib/rbac/permissions";
import { prisma } from "@/lib/prisma";

const STORAGE_DIR = path.join(process.cwd(), "storage", "employee-photos");

const EXT_TO_MIME: Record<string, string> = {
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

  const ext = filename.split(".").pop() ?? "";
  const mimeType = EXT_TO_MIME[ext];
  if (!mimeType) return new Response("Not found", { status: 404 });

  const owner = await prisma.employee.findFirst({
    where: { profileImageUrl: filename },
    select: { id: true },
  });
  if (!owner) return new Response("Not found", { status: 404 });

  const isOwner = session.employeeId === owner.id;
  const isAdmin = hasPermission(session, "employee.manage");
  if (!isOwner && !isAdmin) return new Response("Forbidden", { status: 403 });

  try {
    const buffer = await readFile(path.join(STORAGE_DIR, filename));
    return new Response(new Uint8Array(buffer), {
      headers: { "Content-Type": mimeType, "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
