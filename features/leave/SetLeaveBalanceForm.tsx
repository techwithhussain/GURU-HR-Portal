"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setLeaveBalanceAction } from "@/actions/leave.actions";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function SetLeaveBalanceForm({
  employees,
  leaveTypes,
}: {
  employees: { id: string; fullName: string }[];
  leaveTypes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    const payload = {
      employeeId: String(formData.get("employeeId")),
      typeId: String(formData.get("typeId")),
      year: String(formData.get("year")),
      allocated: String(formData.get("allocated")),
    };

    setError(null);
    startTransition(async () => {
      const result = await setLeaveBalanceAction(payload);
      if (!result.success) {
        setError(result.error ?? "Something went wrong");
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      toast.success("Leave balance updated");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="grid max-w-2xl grid-cols-4 items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="employeeId">Employee</Label>
        <select id="employeeId" name="employeeId" required className={selectClass} defaultValue="">
          <option value="" disabled>
            Select
          </option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.fullName}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="typeId">Type</Label>
        <select id="typeId" name="typeId" required className={selectClass} defaultValue="">
          <option value="" disabled>
            Select
          </option>
          {leaveTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="year">Year</Label>
        <Input id="year" name="year" type="number" defaultValue={new Date().getFullYear()} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="allocated">Allocated (days)</Label>
        <Input id="allocated" name="allocated" type="number" min="0" step="0.5" required />
      </div>

      {error && (
        <p role="alert" className="col-span-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Saving..." : "Set balance"}
      </Button>
    </form>
  );
}
