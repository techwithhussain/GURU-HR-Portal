"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importEmployeesAction, type ImportActionResult } from "@/actions/employeeImport.actions";

export function ImportEmployeesForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportActionResult | null>(null);

  function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Please choose a CSV file first");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const res = await importEmployeesAction(formData);
      setResult(res);
      if (!res.success) {
        toast.error(res.error ?? "Import failed");
        return;
      }
      toast.success(
        `Import complete: ${res.data!.createdCount} created, ${res.data!.errorCount} error(s)`,
      );
    });
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline" size="sm">
          <a href="/api/employees/import-template">Download template</a>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
        />
        <Button onClick={handleUpload} disabled={isPending}>
          {isPending ? "Uploading..." : "Upload"}
        </Button>
      </div>

      {result?.error && (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}

      {result?.success && result.data && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {result.data.totalRows} row(s) — {result.data.createdCount} created,{" "}
            {result.data.errorCount} error(s)
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Employee Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.results.map((row) => (
                <TableRow key={row.row}>
                  <TableCell>{row.row}</TableCell>
                  <TableCell>{row.employeeCode || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "created" ? "default" : "destructive"}>
                      {row.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md">{row.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
