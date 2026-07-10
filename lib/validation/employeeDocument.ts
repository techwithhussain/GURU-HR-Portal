import { z } from "zod";

export const employeeDocumentTypeSchema = z.enum([
  "AADHAAR",
  "PAN",
  "RESUME",
  "OFFER_LETTER",
  "EXPERIENCE_LETTER",
  "OTHER",
]);

export const attachEmployeeDocumentSchema = z.object({
  employeeId: z.string().min(1),
  type: employeeDocumentTypeSchema,
  storagePath: z.string().min(1),
  fileName: z.string().min(1),
});

export type AttachEmployeeDocumentInput = z.infer<typeof attachEmployeeDocumentSchema>;
