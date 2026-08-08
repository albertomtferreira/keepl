import { z } from "zod";

export function createPersonSchema(messages = {
  firstNameRequired: "First name is required",
  validEmail: "Use a valid email",
}) {
  return z.object({
  firstName: z.string().trim().min(1, messages.firstNameRequired),
  lastName: z.string().trim().optional(),
  nickname: z.string().trim().optional(),
  birthday: z.string().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email(messages.validEmail).or(z.literal("")),
  });
}

export const personSchema = createPersonSchema();

export type PersonFormValues = z.infer<typeof personSchema>;
