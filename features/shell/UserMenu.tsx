"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth.actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu({
  fullName,
  employeeCode,
  roleName,
}: {
  fullName: string;
  employeeCode: string;
  roleName: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 outline-none transition-colors hover:bg-muted">
          <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-brand-orange-light text-xs font-semibold text-white shadow-soft ring-2 ring-white">
            {initials(fullName)}
          </div>
        <div className="hidden flex-col items-start leading-tight md:flex">
          <span className="text-sm font-medium">{fullName}</span>
          <span className="text-xs text-muted-foreground">{roleName}</span>
        </div>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="font-medium">{fullName}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {employeeCode} · {roleName}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <DropdownMenuItem asChild variant="destructive">
            <button type="submit" className="w-full">
              <LogOut />
              Log out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
