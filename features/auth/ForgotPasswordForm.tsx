"use client";

import { useActionState } from "react";
import { forgotPasswordAction, type ForgotPasswordFormState } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ForgotPasswordFormState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);

  if (state.submitted) {
    return (
      <p className="text-sm text-muted-foreground">
        If that account exists, a reset link has been generated. Email delivery isn&apos;t wired up
        in this environment yet — check with your administrator for the link.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="identifier">Employee ID or email</Label>
        <Input id="identifier" name="identifier" required />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Submitting..." : "Send reset link"}
      </Button>
    </form>
  );
}
