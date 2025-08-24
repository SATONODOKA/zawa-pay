import { z } from "zod";

export const RoleEnum = z.enum(["EXEC", "MANAGER", "SENIOR", "MEMBER", "JUNIOR"]);

export const CreateMemberSchema = z.object({
  name: z.string().min(1),
  role: RoleEnum.optional(),
  age: z.number().int().min(0).max(120).optional(),
});

export const UpdateMemberSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  role: RoleEnum.optional(),
  age: z.number().int().min(0).max(120).optional(),
});

export const CreateGroupSchema = z.object({
  name: z.string().min(1),
  members: z.array(z.union([z.string(), CreateMemberSchema])).min(1),
  roundingUnit: z.number().int().positive().optional().default(1),
});
