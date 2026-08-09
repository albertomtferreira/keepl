import { getPersonInitials } from "@/features/people/person-format";
import type { Group, Person, Relationship, RelationshipGraph, RelationshipGraphFilters } from "@/types";

export function deriveRelationshipGraph(
  people: Person[],
  relationships: Relationship[],
  options: {
    focusPersonId?: string;
    filters?: RelationshipGraphFilters;
  } = {},
): RelationshipGraph {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const relationshipTypes = new Set(options.filters?.relationshipTypes ?? []);
  const groupIds = new Set(options.filters?.groupIds ?? []);

  const validRelationships = relationships.filter((relationship) => {
    if (!peopleById.has(relationship.fromPersonId) || !peopleById.has(relationship.toPersonId)) {
      return false;
    }

    if (options.focusPersonId && relationship.fromPersonId !== options.focusPersonId && relationship.toPersonId !== options.focusPersonId) {
      return false;
    }

    if (relationshipTypes.size > 0 && !relationshipTypes.has(normalizeRelationshipType(relationship.label))) {
      return false;
    }

    if (groupIds.size > 0) {
      const fromPerson = peopleById.get(relationship.fromPersonId);
      const toPerson = peopleById.get(relationship.toPersonId);
      const fromMatches = fromPerson?.groupIds?.some((groupId) => groupIds.has(groupId)) ?? false;
      const toMatches = toPerson?.groupIds?.some((groupId) => groupIds.has(groupId)) ?? false;

      if (!fromMatches && !toMatches) {
        return false;
      }
    }

    return true;
  });

  const includedPersonIds = new Set<string>();

  if (options.focusPersonId && peopleById.has(options.focusPersonId)) {
    includedPersonIds.add(options.focusPersonId);
  }

  for (const relationship of validRelationships) {
    includedPersonIds.add(relationship.fromPersonId);
    includedPersonIds.add(relationship.toPersonId);
  }

  if (!options.focusPersonId && validRelationships.length === 0 && groupIds.size > 0) {
    for (const person of people) {
      if (person.groupIds?.some((groupId) => groupIds.has(groupId))) {
        includedPersonIds.add(person.id);
      }
    }
  }

  const nodes = Array.from(includedPersonIds)
    .map((id) => peopleById.get(id))
    .filter((person): person is Person => Boolean(person))
    .sort((first, second) => first.displayName.localeCompare(second.displayName))
    .map((person) => ({
      id: person.id,
      label: person.displayName,
      initials: getPersonInitials(person),
      groupIds: person.groupIds ?? [],
      isFocus: person.id === options.focusPersonId,
    }));

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = validRelationships
    .filter((relationship) => nodeIds.has(relationship.fromPersonId) && nodeIds.has(relationship.toPersonId))
    .map((relationship) => ({
      id: relationship.id,
      fromId: relationship.fromPersonId,
      toId: relationship.toPersonId,
      label: relationship.label,
      inverseLabel: relationship.inverseLabel,
    }));

  return { nodes, edges };
}

export function getRelationshipTypeOptions(relationships: Relationship[]) {
  return Array.from(new Set(relationships.map((relationship) => normalizeRelationshipType(relationship.label))))
    .filter(Boolean)
    .sort((first, second) => first.localeCompare(second));
}

export function getGroupOptions(groups: Group[]) {
  return [...groups].sort((first, second) => first.name.localeCompare(second.name));
}

function normalizeRelationshipType(label: string) {
  return label.trim().toLowerCase();
}
