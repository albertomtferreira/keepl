import { z } from "zod";

export const reminderPresetValues = [
  "none",
  "0",
  "1",
  "7",
  "14",
  "30",
] as const;

export const createDateSchema = (messages: {
  validationTitle: string;
  validationDate: string;
}) =>
  z.object({
    title: z.string().trim().min(1, messages.validationTitle),
    date: z.string().min(1, messages.validationDate),
    includeYear: z.boolean(),
    kind: z.enum(["birthday", "anniversary", "holiday", "custom"]),
    repeatsAnnually: z.boolean(),
    reminderPreset: z.enum(reminderPresetValues),
    notes: z.string().trim().optional(),
  });
