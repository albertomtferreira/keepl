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

export function resolveInverseRelationshipLabel(label: string) {
  const normalized = normalizeLabel(label);
  return inverseLabels.get(normalized) ?? label;
}

export function getRelationshipLabelFromPerspective(relationship: Relationship, currentPersonId: string) {
  if (relationship.fromPersonId === currentPersonId) {
    return relationship.label;
  }

  if (relationship.toPersonId === currentPersonId) {
    return relationship.inverseLabel || resolveInverseRelationshipLabel(relationship.label);
  }

  return relationship.label;
}

export function getOtherRelationshipPersonId(relationship: Relationship, currentPersonId: string) {
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
