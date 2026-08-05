"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { sendAdminAnnouncementAction } from "@/actions/notification.actions";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-auto";

const inputClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

type Audience = "ALL" | "DEPARTMENT" | "EMPLOYEE";

export function SendAnnouncementForm({
  departments,
  employees,
}: {
  departments: { id: string; name: string }[];
  employees: { id: string; fullName: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [audience, setAudience] = useState<Audience>("ALL");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await sendAdminAnnouncementAction({
        audience,
        departmentId: audience === "DEPARTMENT" ? departmentId : undefined,
        employeeId: audience === "EMPLOYEE" ? employeeId : undefined,
        subject: subject.trim(),
        message: message.trim(),
        sendEmail,
      });
      if (!result.success) {
        setError(result.error ?? "Failed to send announcement");
        return;
      }
      toast.success(`Sent to ${result.data?.recipientCount ?? 0} employee(s)`);
      setSubject("");
      setMessage("");
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Send to</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <select
            className={selectClass}
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
            disabled={isPending}
          >
            <option value="ALL">All Employees</option>
            <option value="DEPARTMENT">A Department</option>
            <option value="EMPLOYEE">A Specific Employee</option>
          </select>

          {audience === "DEPARTMENT" && (
            <select
              className={selectClass}
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              disabled={isPending}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          {audience === "EMPLOYEE" && (
            <select
              className={selectClass}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={isPending}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <input
          id="subject"
          className={inputClass}
          placeholder="e.g. Office closed tomorrow"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <textarea
          id="message"
          className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
          placeholder="Write your announcement..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isPending}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 rounded accent-orange-500"
          checked={sendEmail}
          onChange={(e) => setSendEmail(e.target.checked)}
          disabled={isPending}
        />
        Also send by email
      </label>

      {error && (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
          {error}
        </p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isPending || !subject.trim() || !message.trim()}
        className="w-full sm:w-auto"
      >
        {isPending ? "Sending..." : "Send Notification"}
      </Button>
    </div>
  );
}
