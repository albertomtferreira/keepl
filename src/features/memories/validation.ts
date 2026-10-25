import { z } from "zod";

export function createMemorySchema(
  messages = {
    titleRequired: "Title is required",
    startDateRequired: "Start date is required",
    endDateAfterStart: "End date must be after the start date",
  },
) {
  return z
    .object({
      title: z.string().trim().min(1, messages.titleRequired),
      startDate: z.string().min(1, messages.startDateRequired),
      endDate: z.string().optional(),
      location: z.string().trim().optional(),
      description: z.string().trim().optional(),
      tags: z.string().trim().optional(),
    })
    .refine((values) => !values.endDate || values.endDate >= values.startDate, {
      message: messages.endDateAfterStart,
      path: ["endDate"],
    });
}
