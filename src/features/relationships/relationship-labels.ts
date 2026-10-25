import { createTranslator, messages } from "@/lib/i18n/translate";
import type { Locale } from "@/types/i18n";
import type { Relationship } from "@/types";

const inverseLabels = new Map<string, string>([
  ["parent", "child"],
  ["child", "parent"],
  ["mother", "child"],
  ["father", "child"],
  ["son", "parent"],
  ["daughter", "parent"],
  ["sibling", "sibling"],
  ["brother", "sibling"],
  ["sister", "sibling"],
  ["spouse", "spouse"],
  ["husband", "spouse"],
  ["wife", "spouse"],
  ["partner", "partner"],
  ["friend", "friend"],
  ["best friend", "best friend"],
  ["cousin", "cousin"],
  ["aunt", "niece/nephew"],
  ["uncle", "niece/nephew"],
  ["niece", "aunt/uncle"],
  ["nephew", "aunt/uncle"],
  ["grandparent", "grandchild"],
  ["grandchild", "grandparent"],
  ["grandmother", "grandchild"],
  ["grandfather", "grandchild"],
  ["colleague", "colleague"],
  ["mentor", "mentee"],
  ["mentee", "mentor"],
]);

export function resolveInverseRelationshipLabel(
  label: string,
  locale: Locale = "en",
) {
  const normalized = normalizeLabel(label);
  const inferred = inverseLabels.get(normalized);
  if (!inferred) return label;
  return inferred in messages.en.relationshipInverses
    ? createTranslator(locale)(
        "relationshipInverses",
        inferred as keyof typeof messages.en.relationshipInverses,
      )
    : inferred;
}

export function getRelationshipLabelFromPerspective(
  relationship: Relationship,
  currentPersonId: string,
  locale: Locale = "en",
) {
  if (relationship.fromPersonId === currentPersonId) {
    return relationship.label;
  }

  if (relationship.toPersonId === currentPersonId) {
    return (
      relationship.inverseLabel ||
      resolveInverseRelationshipLabel(relationship.label, locale)
    );
  }

  return relationship.label;
}

export function getOtherRelationshipPersonId(
  relationship: Relationship,
  currentPersonId: string,
) {
  if (relationship.fromPersonId === currentPersonId) {
    return relationship.toPersonId;
  }

  if (relationship.toPersonId === currentPersonId) {
    return relationship.fromPersonId;
  }

  return null;
}

function normalizeLabel(label: string) {
  return label.trim().toLocaleLowerCase();
}
