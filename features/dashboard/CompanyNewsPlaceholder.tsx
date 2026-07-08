import { Newspaper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SAMPLE_NEWS = [
  {
    title: "New Project Successfully Launched!",
    body: "We're excited to announce the launch of our new project for a major client.",
    time: "2 hours ago",
  },
  {
    title: "Q3 All-Hands Scheduled",
    body: "Join the company-wide town hall next week to hear about upcoming plans.",
    time: "1 day ago",
  },
  {
    title: "New Office Perks Rolled Out",
    body: "Check out the refreshed break room and updated wellness benefits.",
    time: "3 days ago",
  },
];

export function CompanyNewsPlaceholder() {
  return (
    <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Newspaper className="size-4 text-brand-blue" /> Company News
        </CardTitle>
        <Badge variant="outline" className="rounded-full text-[10px]">Coming soon</Badge>
      </CardHeader>
      <CardContent className="grid gap-3 pt-4 opacity-80 sm:grid-cols-2 lg:grid-cols-3">
        {SAMPLE_NEWS.map((item) => (
          <div key={item.title} className="rounded-xl bg-muted/50 p-3.5">
            <p className="text-sm font-medium">{item.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
            <p className="mt-2 text-[10px] text-muted-foreground/70">{item.time}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
