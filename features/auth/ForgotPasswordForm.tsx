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
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium">Check your email 📧</p>
        <p className="text-sm text-muted-foreground">
          If an account with that Employee ID or email exists, a password reset link has been sent.
          The link is valid for <strong>30 minutes</strong>.
        </p>
      </div>
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
