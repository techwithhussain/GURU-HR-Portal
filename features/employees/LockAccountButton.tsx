"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { lockAccountAction, unlockAccountAction } from "@/actions/employee.actions";

export function LockAccountButton({ userId, isLocked }: { userId: string; isLocked: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const action = isLocked ? unlockAccountAction : lockAccountAction;
    if (!isLocked && !confirm("Lock this account? The employee will be signed out and unable to log in until unlocked.")) {
      return;
    }
    startTransition(async () => {
      const result = await action(userId);
      if (!result.success) {
        toast.error(result.error ?? `Failed to ${isLocked ? "unlock" : "lock"} account`);
        return;
      }
      toast.success(isLocked ? "Account unlocked" : "Account locked");
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      {isLocked ? "Unlock Account" : "Lock Account"}
    </Button>
  );
}
