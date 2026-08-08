import { formatDistanceToNow } from "date-fns";

import { defaultLocale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import type { Interaction, InteractionKind } from "@/types";
import type { Locale } from "@/types/i18n";

export const interactionKindLabels: Record<InteractionKind, string> = {
  call: "Call",
  message: "Message",
  email: "Email",
  visit: "Visit",
  event: "Event",
  other: "Other",
};

export function formatInteractionDate(interaction: Pick<Interaction, "occurredAt">, locale: Locale = defaultLocale) {
  return formatDate(interaction.occurredAt.toDate(), locale);
}

export function formatLastInteraction(interaction: Pick<Interaction, "occurredAt">) {
  return formatDistanceToNow(interaction.occurredAt.toDate(), { addSuffix: true });
}
