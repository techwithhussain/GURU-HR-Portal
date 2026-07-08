"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { decideLeaveAction } from "@/actions/leave.actions";

export function LeaveDecisionForm({ leaveId }: { leaveId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");

  function decide(decision: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      const result = await decideLeaveAction(leaveId, {
        decision,
        decisionReason: reason || undefined,
      });
      if (!result.success) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      toast.success(decision === "APPROVED" ? "Leave approved" : "Leave rejected");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Input
        placeholder="Reason (required to reject)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="h-8 w-48"
      />
      <Button
        type="button"
        size="sm"
        disabled={isPending}
        onClick={() => decide("APPROVED")}
      >
        Approve
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => decide("REJECTED")}
      >
        Reject
      </Button>
    </div>
  );
}
