import { z } from "zod";

export const personSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().optional(),
  nickname: z.string().trim().optional(),
  birthday: z.string().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Use a valid email").or(z.literal("")),
});

export type PersonFormValues = z.infer<typeof personSchema>;
