import { z } from "zod";

export const createRelationshipSchema = (messages: {
  validationPerson: string;
  validationLabel: string;
}) =>
  z.object({
    otherPersonId: z.string().min(1, messages.validationPerson),
    label: z.string().trim().min(1, messages.validationLabel),
    inverseLabel: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  });
