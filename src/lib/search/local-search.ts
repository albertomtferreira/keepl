import { differenceInCalendarDays } from "date-fns";

import { getNextAnnualOccurrence } from "@/lib/dates/flexible-date";
import type {
  Group,
  ImportantDate,
  Interaction,
  Memory,
  Person,
  PersonNote,
  SearchResult,
  SearchScope,
} from "@/types";

export type LocalSearchInput = {
  people: Person[];
  notes: PersonNote[];
  memories: Memory[];
  importantDates: ImportantDate[];
  interactions: Interaction[];
  groups: Group[];
};

type Candidate = SearchResult & {
  haystack: SearchField[];
  boost: number;
};

type SearchField = {
  name: string;
  value?: string;
  weight: number;
};

const scopeToResultTypes: Record<SearchScope, SearchResult["type"][]> = {
  all: ["person", "note", "memory", "date", "interaction", "group"],
  people: ["person"],
  notes: ["note"],
  memories: ["memory"],
  dates: ["date"],
  interactions: ["interaction"],
  groups: ["group"],
};

export function searchLocalRecords(input: LocalSearchInput, query: string, scope: SearchScope = "all"): SearchResult[] {
  const terms = tokenize(query);

  if (!terms.length) {
    return [];
  }

  const peopleById = new Map(input.people.map((person) => [person.id, person]));
  const groupsById = new Map(input.groups.map((group) => [group.id, group]));
  const groupNamesById = new Map(input.groups.map((group) => [group.id, group.name]));
  const allowedTypes = new Set(scopeToResultTypes[scope]);

  return buildCandidates(input, peopleById, groupsById, groupNamesById)
    .filter((candidate) => allowedTypes.has(candidate.type))
    .map((candidate) => scoreCandidate(candidate, terms))
    .filter((result): result is SearchResult => Boolean(result))
    .sort((first, second) => second.score - first.score || first.title.localeCompare(second.title));
}

function buildCandidates(
  input: LocalSearchInput,
  peopleById: Map<string, Person>,
  groupsById: Map<string, Group>,
  groupNamesById: Map<string, string>,
): Candidate[] {
  return [
    ...input.people
      .filter((person) => !person.archivedAt)
      .map((person) => personCandidate(person, groupNamesById)),
    ...input.notes.map((note) => noteCandidate(note, peopleById)),
    ...input.memories.map((memory) => memoryCandidate(memory, peopleById)),
    ...input.importantDates.map((date) => dateCandidate(date, peopleById)),
    ...input.interactions.map((interaction) => interactionCandidate(interaction, peopleById)),
    ...input.groups.map((group) => groupCandidate(group, input.people, groupsById)),
  ];
}

function personCandidate(person: Person, groupNamesById: Map<string, string>): Candidate {
  return {
    id: person.id,
    type: "person",
    title: person.displayName,
    subtitle: [
      person.nickname ? `Nickname: ${person.nickname}` : undefined,
      ...(person.groupIds ?? []).map((id) => groupNamesById.get(id)),
      person.emails?.[0]?.value,
      person.phoneNumbers?.[0]?.value,
    ]
      .filter(Boolean)
      .join(" · "),
    href: `/people/${person.id}`,
    score: 0,
    boost: 25,
    matchedFields: [],
    haystack: [
      { name: "name", value: person.displayName, weight: 32 },
      { name: "first name", value: person.firstName, weight: 24 },
      { name: "last name", value: person.lastName, weight: 24 },
      { name: "nickname", value: person.nickname, weight: 26 },
      { name: "email", value: person.emails?.map((email) => email.value).join(" "), weight: 16 },
      { name: "phone", value: person.phoneNumbers?.map((phone) => phone.value).join(" "), weight: 16 },
      { name: "group", value: (person.groupIds ?? []).map((id) => groupNamesById.get(id)).join(" "), weight: 12 },
      { name: "social", value: person.socialProfiles?.map((profile) => `${profile.platform} ${profile.handle ?? ""} ${profile.url ?? ""}`).join(" "), weight: 8 },
    ],
  };
}

function noteCandidate(note: PersonNote, peopleById: Map<string, Person>): Candidate {
  const person = peopleById.get(note.personId);

  return {
    id: note.id,
    type: "note",
    title: note.title || note.body.slice(0, 64) || "Untitled note",
    subtitle: person ? `Note about ${person.displayName}` : "Note",
    href: `/people/${note.personId}`,
    score: 0,
    boost: note.pinned ? 18 : 4,
    matchedFields: [],
    haystack: [
      { name: "title", value: note.title, weight: 22 },
      { name: "body", value: note.body, weight: 14 },
      { name: "person", value: person?.displayName, weight: 12 },
    ],
  };
}

function memoryCandidate(memory: Memory, peopleById: Map<string, Person>): Candidate {
  const people = memory.peopleIds.map((id) => peopleById.get(id)?.displayName).filter(Boolean);
  const ageDays = Math.max(0, differenceInCalendarDays(new Date(), memory.startDate.toDate()));
  const recentBoost = Math.max(0, 18 - Math.floor(ageDays / 14));

  return {
    id: memory.id,
    type: "memory",
    title: memory.title,
    subtitle: [people.join(", "), memory.location].filter(Boolean).join(" · "),
    href: `/memories/${memory.id}`,
    score: 0,
    boost: recentBoost,
    matchedFields: [],
    haystack: [
      { name: "title", value: memory.title, weight: 24 },
      { name: "description", value: memory.description, weight: 12 },
      { name: "location", value: memory.location, weight: 10 },
      { name: "tag", value: memory.tags?.join(" "), weight: 10 },
      { name: "person", value: people.join(" "), weight: 12 },
    ],
  };
}

function dateCandidate(date: ImportantDate, peopleById: Map<string, Person>): Candidate {
  const person = peopleById.get(date.personId);
  const nextOccurrence = date.repeatsAnnually ? getNextAnnualOccurrence(date.date) : null;
  const daysUntil = nextOccurrence ? differenceInCalendarDays(nextOccurrence, new Date()) : null;
  const upcomingBoost = daysUntil !== null && daysUntil >= 0 && daysUntil <= 30 ? 16 - Math.floor(daysUntil / 2) : 0;

  return {
    id: date.id,
    type: "date",
    title: date.title,
    subtitle: person ? `Date for ${person.displayName}` : "Important date",
    href: `/people/${date.personId}`,
    score: 0,
    boost: upcomingBoost,
    matchedFields: [],
    haystack: [
      { name: "title", value: date.title, weight: 22 },
      { name: "kind", value: date.kind, weight: 12 },
      { name: "notes", value: date.notes, weight: 10 },
      { name: "person", value: person?.displayName, weight: 12 },
    ],
  };
}

function interactionCandidate(interaction: Interaction, peopleById: Map<string, Person>): Candidate {
  const person = peopleById.get(interaction.personId);

  return {
    id: interaction.id,
    type: "interaction",
    title: interaction.summary || `${interaction.kind[0].toUpperCase()}${interaction.kind.slice(1)}`,
    subtitle: person ? `Interaction with ${person.displayName}` : "Interaction",
    href: `/people/${interaction.personId}`,
    score: 0,
    boost: 2,
    matchedFields: [],
    haystack: [
      { name: "summary", value: interaction.summary, weight: 18 },
      { name: "notes", value: interaction.notes, weight: 12 },
      { name: "kind", value: interaction.kind, weight: 10 },
      { name: "person", value: person?.displayName, weight: 12 },
    ],
  };
}

function groupCandidate(group: Group, people: Person[], groupsById: Map<string, Group>): Candidate {
  const memberNames = people
    .filter((person) => person.groupIds?.includes(group.id))
    .map((person) => person.displayName)
    .join(" ");

  return {
    id: group.id,
    type: "group",
    title: group.name,
    subtitle: group.description || "Group",
    href: `/people?group=${group.id}`,
    score: 0,
    boost: 8,
    matchedFields: [],
    haystack: [
      { name: "name", value: groupsById.get(group.id)?.name, weight: 24 },
      { name: "description", value: group.description, weight: 10 },
      { name: "member", value: memberNames, weight: 10 },
    ],
  };
}

function scoreCandidate(candidate: Candidate, terms: string[]): SearchResult | null {
  const matchedFields = new Set<string>();
  let score = 0;

  for (const term of terms) {
    let termMatched = false;

    for (const field of candidate.haystack) {
      const normalizedValue = normalize(field.value);

      if (!normalizedValue) {
        continue;
      }

      const fieldScore = scoreField(normalizedValue, term, field.weight);

      if (fieldScore > 0) {
        termMatched = true;
        score += fieldScore;
        matchedFields.add(field.name);
      }
    }

    if (!termMatched) {
      return null;
    }
  }

  return {
    id: candidate.id,
    type: candidate.type,
    title: candidate.title,
    subtitle: candidate.subtitle,
    href: candidate.href,
    score: score + candidate.boost,
    matchedFields: [...matchedFields],
  };
}

function scoreField(value: string, term: string, weight: number) {
  if (value === term) {
    return weight * 3;
  }

  if (value.startsWith(term)) {
    return weight * 2;
  }

  return value.includes(term) ? weight : 0;
}

function tokenize(query: string) {
  return normalize(query).split(/\s+/).filter(Boolean);
}

function normalize(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
