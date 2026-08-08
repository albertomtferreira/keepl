import { format, formatDistanceToNow } from "date-fns";

import type { Interaction, InteractionKind } from "@/types";

export const interactionKindLabels: Record<InteractionKind, string> = {
  call: "Call",
  message: "Message",
  email: "Email",
  visit: "Visit",
  event: "Event",
  other: "Other",
};

export function formatInteractionDate(interaction: Pick<Interaction, "occurredAt">) {
  return format(interaction.occurredAt.toDate(), "MMM d, yyyy");
}

export function formatLastInteraction(interaction: Pick<Interaction, "occurredAt">) {
  return formatDistanceToNow(interaction.occurredAt.toDate(), { addSuffix: true });
}
