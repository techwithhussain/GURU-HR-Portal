import { z } from "zod";
import { PERMISSION_KEYS } from "@/types/permissions";

export const updateRolePermissionsSchema = z.object({
  updates: z.array(
    z.object({
      roleId: z.string().min(1),
      permissionKeys: z.array(z.enum(PERMISSION_KEYS)),
    }),
  ),
});

export type UpdateRolePermissionsInput = z.infer<typeof updateRolePermissionsSchema>;
