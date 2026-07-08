"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SidebarLink {
  href: string;
  label: string;
  icon: ReactNode;
}

export function SidebarNav({ links }: { links: SidebarLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-sidebar-foreground/65 transition-all duration-200 hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              active &&
                "bg-gradient-to-r from-brand-orange to-brand-orange-light text-white shadow-lg shadow-brand-orange/25 hover:translate-x-0 hover:from-brand-orange hover:to-brand-orange-light hover:text-white",
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center transition-transform duration-200 group-hover:scale-110 [&>svg]:size-[18px]",
                active && "group-hover:scale-100",
              )}
            >
              {link.icon}
            </span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
