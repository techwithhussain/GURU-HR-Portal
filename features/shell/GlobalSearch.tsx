"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { globalSearchAction, type GlobalSearchResults } from "@/actions/search.actions";

const GROUPS: { key: keyof GlobalSearchResults; label: string }[] = [
  { key: "employees", label: "Employees" },
  { key: "leaves", label: "Leave requests" },
  { key: "attendance", label: "Attendance" },
  { key: "notifications", label: "Notifications" },
];

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }

    setOpen(true);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const r = await globalSearchAction(trimmed);
        setResults(r);
      });
    }, 250);
  }

  const hasAnyResults = results ? GROUPS.some((g) => results[g.key].length > 0) : false;
  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search anything..."
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        className="rounded-full py-2 pl-9 pr-3 shadow-soft"
      />
      {showDropdown && (
        <div className="absolute left-0 top-full z-50 mt-2 max-h-96 w-full overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {isPending && !results && (
            <div className="flex items-center gap-2 px-2.5 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Searching...
            </div>
          )}
          {results && !hasAnyResults && (
            <div className="px-2.5 py-3 text-sm text-muted-foreground">No results for &quot;{query}&quot;.</div>
          )}
          {results &&
            GROUPS.map(
              (g) =>
                results[g.key].length > 0 && (
                  <div key={g.key} className="mb-1 last:mb-0">
                    <div className="px-2.5 py-1 text-xs font-medium text-muted-foreground">{g.label}</div>
                    {results[g.key].map((hit) => (
                      <Link
                        key={hit.id}
                        href={hit.href}
                        onClick={() => setOpen(false)}
                        className="flex flex-col gap-0.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        <span className="font-medium">{hit.title}</span>
                        {hit.subtitle && <span className="text-xs text-muted-foreground">{hit.subtitle}</span>}
                      </Link>
                    ))}
                  </div>
                ),
            )}
        </div>
      )}
    </div>
  );
}
