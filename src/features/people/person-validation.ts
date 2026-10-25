import { z } from "zod";
import { safeSocialProfileUrl } from "./social-profile";

export function createPersonSchema(
  messages: {
    firstNameRequired: string;
    validEmail: string;
    socialPlatformRequired?: string;
    socialContactRequired?: string;
    socialUrlInvalid?: string;
  } = {
    firstNameRequired: "First name is required",
    validEmail: "Use a valid email",
  },
) {
  return z.object({
    firstName: z.string().trim().min(1, messages.firstNameRequired),
    lastName: z.string().trim().optional(),
    nickname: z.string().trim().optional(),
    birthday: z.string().optional(),
    phone: z.string().trim().optional(),
    email: z.string().trim().email(messages.validEmail).or(z.literal("")),
    socialProfiles: z
      .array(
        z
          .object({
            platform: z
              .string()
              .trim()
              .min(
                1,
                messages.socialPlatformRequired ?? "Enter a platform name",
              ),
            handle: z.string().trim().optional(),
            url: z
              .string()
              .trim()
              .optional()
              .refine(
                (value) => !value || Boolean(safeSocialProfileUrl(value)),
                messages.socialUrlInvalid ??
                  "Use a complete http:// or https:// profile URL",
              ),
          })
          .refine((profile) => Boolean(profile.handle || profile.url), {
            message:
              messages.socialContactRequired ??
              "Enter a username or profile URL",
            path: ["handle"],
          }),
      )
      .optional(),
  });
}

export const personSchema = createPersonSchema();

export type PersonFormValues = z.infer<typeof personSchema>;
