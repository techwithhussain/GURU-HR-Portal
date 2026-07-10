"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyLeaveAction } from "@/actions/leave.actions";
import { AttachmentUpload } from "@/features/leave/AttachmentUpload";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export interface LeaveTypeOption {
  id: string;
  name: string;
  requiresAttachment: boolean;
}

export function ApplyLeaveForm({ leaveTypes }: { leaveTypes: LeaveTypeOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [typeId, setTypeId] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);

  const selectedType = useMemo(() => leaveTypes.find((t) => t.id === typeId), [leaveTypes, typeId]);

  function handleSubmit(formData: FormData) {
    const startDate = String(formData.get("startDate"));
    const payload = {
      typeId: String(formData.get("typeId")),
      startDate,
      endDate: isHalfDay ? startDate : String(formData.get("endDate")),
      isHalfDay,
      reason: String(formData.get("reason") ?? "") || undefined,
      attachmentPath: String(formData.get("attachmentPath") ?? "") || undefined,
      attachmentFileName: String(formData.get("attachmentFileName") ?? "") || undefined,
    };

    setError(null);
    startTransition(async () => {
      const result = await applyLeaveAction(payload);
      if (!result.success) {
        setError(result.error ?? "Something went wrong");
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      toast.success("Leave request submitted");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="grid max-w-xl gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="typeId">Leave type</Label>
          <select
            id="typeId"
            name="typeId"
            required
            className={selectClass}
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
          >
            <option value="" disabled>
              Select a type
            </option>
            {leaveTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reason">Reason (optional)</Label>
          <Input id="reason" name="reason" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" name="endDate" type="date" required disabled={isHalfDay} />
        </div>
      </div>

      <label className="flex w-fit items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isHalfDay}
          onChange={(e) => setIsHalfDay(e.target.checked)}
          className="size-4 rounded border-input"
        />
        Half Day
      </label>

      {selectedType?.requiresAttachment && <AttachmentUpload />}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Submitting..." : "Apply for leave"}
      </Button>
    </form>
  );
}
