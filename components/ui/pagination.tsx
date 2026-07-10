import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function pageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("ellipsis");
    result.push(p);
    prev = p;
  }
  return result;
}

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const linkClass =
    "flex h-8 min-w-8 items-center justify-center rounded-md border border-input px-2 text-sm transition-colors hover:bg-muted";
  const disabledClass = "pointer-events-none opacity-40";
  const activeClass = "bg-primary text-primary-foreground border-primary hover:bg-primary";

  return (
    <nav className="flex items-center gap-1.5" aria-label="Pagination">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={cn(linkClass, page <= 1 && disabledClass)}
      >
        <ChevronLeft className="size-4" />
      </Link>
      {pageNumbers(page, totalPages).map((p, i) =>
        p === "ellipsis" ? (
          <span key={`e-${i}`} className="flex h-8 min-w-8 items-center justify-center text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Link key={p} href={buildHref(p)} className={cn(linkClass, p === page && activeClass)}>
            {p}
          </Link>
        ),
      )}
      <Link
        href={buildHref(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={cn(linkClass, page >= totalPages && disabledClass)}
      >
        <ChevronRight className="size-4" />
      </Link>
    </nav>
  );
}
