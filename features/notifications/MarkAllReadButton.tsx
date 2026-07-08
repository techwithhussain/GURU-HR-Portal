"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markAllAsReadAction } from "@/actions/notification.actions";

export function MarkAllReadButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await markAllAsReadAction();
      if (!result.success) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? "Marking..." : "Mark all as read"}
    </Button>
  );
}
