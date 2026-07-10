"use client";

import { type ReactNode, useState, useTransition } from "react";
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
import { createLeaveTypeAction, updateLeaveTypeAction } from "@/actions/leaveType.actions";

export interface LeaveTypeEditTarget {
  id: string;
  code: string;
  name: string;
  defaultAllocationDays: number | null;
  requiresAttachment: boolean;
  color: string;
}

export function LeaveTypeFormDialog({
  leaveType,
  trigger,
}: {
  leaveType?: LeaveTypeEditTarget;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!leaveType;

  function handleSubmit(formData: FormData) {
    const allocatedRaw = String(formData.get("defaultAllocationDays") ?? "").trim();
    const payload = {
      code: String(formData.get("code")),
      name: String(formData.get("name")),
      defaultAllocationDays: allocatedRaw ? Number(allocatedRaw) : undefined,
      requiresAttachment: formData.get("requiresAttachment") === "on",
      color: String(formData.get("color")),
    };

    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateLeaveTypeAction(leaveType.id, payload)
        : await createLeaveTypeAction(payload);
      if (!result.success) {
        setError(result.error ?? "Something went wrong");
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      toast.success(isEdit ? "Leave type updated" : "Leave type created");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Leave Type" : "Add Leave Type"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" name="code" defaultValue={leaveType?.code} required disabled={isEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={leaveType?.name} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="defaultAllocationDays">Yearly allocation (blank = unlimited)</Label>
              <Input
                id="defaultAllocationDays"
                name="defaultAllocationDays"
                type="number"
                min="0"
                step="0.5"
                defaultValue={leaveType?.defaultAllocationDays ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input id="color" name="color" type="color" defaultValue={leaveType?.color ?? "#f97316"} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="requiresAttachment"
              defaultChecked={leaveType?.requiresAttachment}
              className="size-4 rounded border-input"
            />
            Requires attachment (e.g. medical certificate)
          </label>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Save changes" : "Create leave type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
