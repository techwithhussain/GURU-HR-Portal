"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSalarySlipAction } from "@/actions/salarySlip.actions";
import { SalarySlipView } from "@/features/salarySlips/SalarySlipView";
import type { SalarySlipItem } from "@/types/salarySlip";

export function AdminSlipDetailClient({ slip }: { slip: SalarySlipItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete ${slip.employeeName}'s salary slip for ${slip.monthName} ${slip.year}?`))
      return;
    startTransition(async () => {
      await deleteSalarySlipAction(slip.id);
      router.push("/admin/salary-slips");
    });
  }

  return <SalarySlipView slip={slip} onDelete={handleDelete} isDeleting={isPending} />;
}
