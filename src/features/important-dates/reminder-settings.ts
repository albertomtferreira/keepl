import { z } from "zod";

export const reminderCategories = [
  "birthday",
  "anniversary",
  "holiday",
  "custom",
] as const;
export const reminderRuleSchema = z
  .object({
    enabled: z.boolean(),
    daysBefore: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(3),
      z.literal(7),
    ]),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .strict();
const rules = z.tuple([reminderRuleSchema, reminderRuleSchema]);
export const reminderSettingsSchema = z
  .object({
    birthday: rules,
    anniversary: rules,
    holiday: rules,
    custom: rules,
  })
  .strict();
export type ReminderSettings = z.infer<typeof reminderSettingsSchema>;
export const defaultReminderSettings: ReminderSettings = Object.fromEntries(
  reminderCategories.map((kind) => [
    kind,
    [
      { enabled: true, daysBefore: 0, time: "08:00" },
      { enabled: false, daysBefore: 7, time: "08:00" },
    ],
  ]),
) as ReminderSettings;
