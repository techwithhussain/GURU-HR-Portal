"use client";

import { motion } from "framer-motion";
import { Coffee, Droplets, Utensils, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const BREAK_OPTIONS = [
  {
    type: "LUNCH",
    label: "Meal Break",
    duration: "30 Minutes",
    maxMinutes: 30,
    icon: Utensils,
    soft: "bg-orange-50 text-orange-600",
  },
  {
    type: "WASHROOM",
    label: "Bio Break",
    duration: "20 Minutes",
    maxMinutes: 20,
    icon: Droplets,
    soft: "bg-blue-50 text-blue-600",
  },
  {
    type: "PERSONAL",
    label: "Casual Break",
    duration: "10 Minutes",
    maxMinutes: 10,
    icon: Coffee,
    soft: "bg-amber-50 text-amber-600",
  },
  {
    type: "MEETING",
    label: "Super Break",
    duration: "1 Hour",
    maxMinutes: 60,
    icon: Zap,
    soft: "bg-indigo-50 text-indigo-600",
  },
] as const;

export type BreakOptionType = (typeof BREAK_OPTIONS)[number]["type"];

export const BREAK_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  BREAK_OPTIONS.map((o) => [o.type, o.label]),
);

export const BREAK_TYPE_MAX_MINUTES: Record<string, number> = Object.fromEntries(
  BREAK_OPTIONS.map((o) => [o.type, o.maxMinutes]),
);

export function BreakSelectDialog({
  open,
  onOpenChange,
  onSelect,
  disabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: BreakOptionType) => void;
  disabled?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[20px] border border-white/40 bg-white/85 p-6 shadow-elevated backdrop-blur-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Select Break</DialogTitle>
          <DialogDescription>Choose a break type to pause your work session.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-1">
          {BREAK_OPTIONS.map(({ type, label, duration, icon: Icon, soft }, i) => (
            <motion.button
              key={type}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(type)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              className="group flex flex-col items-center gap-2.5 rounded-2xl border border-border/60 bg-white/60 px-4 py-5 text-center shadow-soft transition-colors hover:border-brand-orange/50 hover:bg-orange-50/70 disabled:pointer-events-none disabled:opacity-50"
            >
              <span
                className={`flex size-12 items-center justify-center rounded-2xl ${soft} transition-transform duration-200 group-hover:scale-110`}
              >
                <Icon className="size-6" />
              </span>
              <span className="text-sm font-semibold text-foreground">{label}</span>
              <span className="text-xs text-muted-foreground">{duration}</span>
            </motion.button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
