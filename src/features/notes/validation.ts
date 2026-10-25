import { z } from "zod";

export const createNoteSchema = (messages: { validationBody: string }) =>
  z.object({
    title: z.string().trim().optional(),
    body: z.string().trim().min(1, messages.validationBody),
    pinned: z.boolean(),
  });
