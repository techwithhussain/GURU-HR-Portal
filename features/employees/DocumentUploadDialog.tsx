"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { attachEmployeeDocumentAction } from "@/actions/employeeDocument.actions";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const DOCUMENT_TYPES = [
  { value: "AADHAAR", label: "Aadhaar" },
  { value: "PAN", label: "PAN" },
  { value: "RESUME", label: "Resume" },
  { value: "OFFER_LETTER", label: "Offer Letter" },
  { value: "EXPERIENCE_LETTER", label: "Experience Letter" },
  { value: "OTHER", label: "Other" },
] as const;

export function DocumentUploadDialog({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<(typeof DOCUMENT_TYPES)[number]["value"]>("RESUME");
  const [storedPath, setStoredPath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/employees/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      setStoredPath(data.path);
      setFileName(data.fileName);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleAttach() {
    if (!storedPath || !fileName) {
      setError("Choose a file to upload first.");
      return;
    }
    startTransition(async () => {
      const result = await attachEmployeeDocumentAction({ employeeId, type, storagePath: storedPath, fileName });
      if (!result.success) {
        toast.error(result.error ?? "Failed to attach document");
        return;
      }
      toast.success("Document added");
      setOpen(false);
      setStoredPath(null);
      setFileName(null);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="docType">Document Type</Label>
            <select
              id="docType"
              className={selectClass}
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="docFile">File (PDF, JPG, PNG — max 5MB)</Label>
            <Input id="docFile" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} disabled={uploading} />
            {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
            {fileName && !uploading && <p className="text-xs text-muted-foreground">Ready: {fileName}</p>}
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" disabled={isPending || uploading || !storedPath} onClick={handleAttach}>
            {isPending ? "Saving..." : "Add Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
