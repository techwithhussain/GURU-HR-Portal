"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteEmployeeDocumentAction } from "@/actions/employeeDocument.actions";

export function DeleteDocumentButton({ documentId, employeeId }: { documentId: string; employeeId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Delete this document?")) return;

    startTransition(async () => {
      const result = await deleteEmployeeDocumentAction(documentId, employeeId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete document");
        return;
      }
      toast.success("Document deleted");
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="destructive" size="sm" disabled={isPending} onClick={handleClick}>
      Delete
    </Button>
  );
}
