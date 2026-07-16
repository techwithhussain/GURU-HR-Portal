"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCompanySettingsAction } from "@/actions/companySettings.actions";
import type { CompanySetting } from "@/lib/prisma-client/client";

function readOfficeIps(value: unknown): string {
  return Array.isArray(value) ? value.join("\n") : "";
}

function readOfficeHours(value: unknown): { start: string; end: string } {
  if (value && typeof value === "object" && "start" in value && "end" in value) {
    const hours = value as { start: unknown; end: unknown };
    return { start: String(hours.start ?? ""), end: String(hours.end ?? "") };
  }
  return { start: "", end: "" };
}

function readHolidayCalendar(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((h) => {
      if (h && typeof h === "object" && "date" in h && "name" in h) {
        const date = String((h as { date: unknown }).date).slice(0, 10);
        const name = String((h as { name: unknown }).name);
        return `${date},${name}`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

export function CompanySettingsForm({ settings }: { settings: CompanySetting | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const officeHours = readOfficeHours(settings?.officeHours);

  function handleSubmit(formData: FormData) {
    const officeIps = String(formData.get("officeIps") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const holidayCalendar = String(formData.get("holidayCalendar") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [date, ...rest] = line.split(",");
        return { date: date?.trim(), name: rest.join(",").trim() };
      });

    const start = String(formData.get("officeHoursStart") ?? "");
    const end = String(formData.get("officeHoursEnd") ?? "");

    const payload = {
      name: String(formData.get("name") ?? ""),
      timezone: String(formData.get("timezone") ?? ""),
      officeIps,
      officeHours: start && end ? { start, end } : undefined,
      holidayCalendar,
      maxConcurrentBreaks: Number(formData.get("maxConcurrentBreaks") ?? 3),
    };

    setError(null);
    startTransition(async () => {
      const result = await updateCompanySettingsAction(payload);
      if (!result.success) {
        setError(result.error ?? "Something went wrong");
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      toast.success("Settings saved");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="grid max-w-xl gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Company name</Label>
          <Input id="name" name="name" defaultValue={settings?.name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone (IANA, e.g. Asia/Kolkata)</Label>
          <Input id="timezone" name="timezone" defaultValue={settings?.timezone} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="officeIps">Office IP allowlist (one CIDR per line, empty = unrestricted)</Label>
        <textarea
          id="officeIps"
          name="officeIps"
          rows={4}
          defaultValue={readOfficeIps(settings?.officeIps)}
          placeholder="203.0.113.5/32"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="officeHoursStart">Office hours start</Label>
          <Input id="officeHoursStart" name="officeHoursStart" type="time" defaultValue={officeHours.start} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="officeHoursEnd">Office hours end</Label>
          <Input id="officeHoursEnd" name="officeHoursEnd" type="time" defaultValue={officeHours.end} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxConcurrentBreaks">Max employees on break at once</Label>
        <Input
          id="maxConcurrentBreaks"
          name="maxConcurrentBreaks"
          type="number"
          min={1}
          max={100}
          defaultValue={settings?.maxConcurrentBreaks ?? 3}
          className="w-32"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="holidayCalendar">Holiday calendar (one per line: YYYY-MM-DD,Label)</Label>
        <textarea
          id="holidayCalendar"
          name="holidayCalendar"
          rows={4}
          defaultValue={readHolidayCalendar(settings?.holidayCalendar)}
          placeholder="2026-01-26,Republic Day"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Saving..." : "Save settings"}
      </Button>
    </form>
  );
}
