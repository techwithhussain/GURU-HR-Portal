"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminResetPasswordAction } from "@/actions/employee.actions";

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  function handleClick() {
    if (!confirm("Reset this employee's password? They will be signed out everywhere and must set a new password.")) {
      return;
    }
    startTransition(async () => {
      const result = await adminResetPasswordAction(userId);
      if (!result.success || !result.data) {
        toast.error(result.error ?? "Failed to reset password");
        return;
      }
      setTempPassword(result.data.tempPassword);
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
        Reset Password
      </Button>
      <Dialog open={tempPassword !== null} onOpenChange={(o) => !o && setTempPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Reset</DialogTitle>
            <DialogDescription>
              Share this temporary password with the employee — it will not be shown again. They must change it on
              next login.
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-lg bg-muted px-3 py-2 text-center font-mono text-lg tracking-wide">{tempPassword}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
