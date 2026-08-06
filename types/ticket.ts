// Shared ticket types — safe to import in both Server and Client Components

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";

export const TICKET_CATEGORIES = [
  "IT Issue",
  "HR Query",
  "Payroll Issue",
  "Facility Issue",
  "Policy Question",
  "Other",
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export interface TicketItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  adminReply: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  employeeName: string;
  employeeCode: string;
  departmentName: string | null;
}
