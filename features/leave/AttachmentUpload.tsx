"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AttachmentUpload() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [storedPath, setStoredPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/leave/attachments", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed");
        return;
      }
      setStoredPath(data.path);
      setFileName(data.fileName);
      toast.success("Attachment uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="attachment">Attachment (medical certificate, etc.)</Label>
      <Input
        id="attachment"
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleChange}
        disabled={uploading}
      />
      {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
      {fileName && !uploading && <p className="text-xs text-muted-foreground">Uploaded: {fileName}</p>}
      <input type="hidden" name="attachmentPath" value={storedPath ?? ""} />
      <input type="hidden" name="attachmentFileName" value={fileName ?? ""} />
    </div>
  );
}
