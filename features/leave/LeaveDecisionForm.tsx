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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { decideLeaveAction } from "@/actions/leave.actions";

export function LeaveDecisionForm({ leaveId }: { leaveId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [reason, setReason] = useState("");

  function decide(decision: "APPROVED" | "REJECTED") {
    if (!reason.trim()) {
      toast.error("A remark is required.");
      return;
    }
    startTransition(async () => {
      const result = await decideLeaveAction(leaveId, { decision, decisionReason: reason });
      if (!result.success) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      toast.success(decision === "APPROVED" ? "Leave approved" : "Leave rejected");
      setOpen(null);
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogTrigger asChild>
          <Button type="button" size="sm" onClick={() => setOpen("APPROVED")}>
            Approve
          </Button>
        </DialogTrigger>
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen("REJECTED")}>
            Reject
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{open === "APPROVED" ? "Approve" : "Reject"} leave request</DialogTitle>
            <DialogDescription>A remark is required to record this decision.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="decisionReason">Remark</Label>
            <Input
              id="decisionReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Add a remark..."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              disabled={isPending}
              variant={open === "REJECTED" ? "destructive" : "default"}
              onClick={() => open && decide(open)}
            >
              {isPending ? "Saving..." : open === "APPROVED" ? "Confirm Approve" : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
