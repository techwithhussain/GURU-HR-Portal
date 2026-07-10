"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PhotoUpload({ initialPhotoPath }: { initialPhotoPath?: string | null }) {
  const [preview, setPreview] = useState<string | null>(
    initialPhotoPath ? `/api/employees/photo/${initialPhotoPath}` : null,
  );
  const [storedPath, setStoredPath] = useState<string | null>(initialPhotoPath ?? null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/employees/photo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed");
        return;
      }
      setStoredPath(data.path);
      setFileName(data.fileName);
      setPreview(`/api/employees/photo/${data.path}`);
      toast.success("Photo uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="photo">Profile Photo</Label>
      <div className="flex items-center gap-3">
        {preview ? (
          <Image
            src={preview}
            alt=""
            width={56}
            height={56}
            unoptimized
            className="size-14 shrink-0 rounded-full object-cover ring-1 ring-border"
          />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
            No photo
          </div>
        )}
        <Input id="photo" type="file" accept=".jpg,.jpeg,.png" onChange={handleChange} disabled={uploading} />
      </div>
      {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
      {fileName && !uploading && <p className="text-xs text-muted-foreground">Uploaded: {fileName}</p>}
      <input type="hidden" name="photoPath" value={storedPath ?? ""} />
      <input type="hidden" name="photoFileName" value={fileName ?? ""} />
    </div>
  );
}
