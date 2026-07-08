import { Circle, CircleCheck, ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SAMPLE_TASKS = [
  { label: "Work on Facebook Campaign", due: "11:00 AM", done: true },
  { label: "Client Meeting", due: "02:00 PM", done: false },
  { label: "Report Submission", due: "05:00 PM", done: false },
];

export function TodaysTasksPlaceholder() {
  return (
    <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ListTodo className="size-4 text-brand-blue" /> Today&apos;s Tasks
        </CardTitle>
        <Badge variant="outline" className="rounded-full text-[10px]">Coming soon</Badge>
      </CardHeader>
      <CardContent className="space-y-1 pt-4 opacity-80">
        {SAMPLE_TASKS.map((task) => (
          <div key={task.label} className="flex items-center gap-3 rounded-xl px-1 py-2">
            {task.done ? (
              <CircleCheck className="size-4.5 shrink-0 text-emerald-500" />
            ) : (
              <Circle className="size-4.5 shrink-0 text-muted-foreground/50" />
            )}
            <div className="min-w-0">
              <p className={`truncate text-sm font-medium ${task.done ? "text-muted-foreground line-through" : ""}`}>
                {task.label}
              </p>
              <p className="text-xs text-muted-foreground">Due: {task.due}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
