"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateMyProfileAction, type UpdateMyProfileFormState } from "@/actions/employee.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: UpdateMyProfileFormState = {};

export function MyProfileForm({
  phone,
  address,
  emergencyContact,
}: {
  phone: string | null;
  address: string | null;
  emergencyContact: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateMyProfileAction, initialState);

  useEffect(() => {
    if (state.success) toast.success("Profile updated");
  }, [state.success]);

  return (
    <form action={formAction} className="grid max-w-xl gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={phone ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="emergencyContact">Emergency Contact</Label>
          <Input id="emergencyContact" name="emergencyContact" defaultValue={emergencyContact ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" defaultValue={address ?? ""} />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full sm:w-fit">
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
