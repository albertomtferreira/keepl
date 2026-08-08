import { format } from "date-fns";
import type { Timestamp } from "firebase/firestore";

import type { Memory, Person } from "@/types";

export function timestampToDate(value: Timestamp | Date | undefined) {
  if (!value) {
    return null;
  }

  return "toDate" in value ? value.toDate() : value;
}

export function formatMemoryDate(memory: Memory) {
  const startDate = timestampToDate(memory.startDate);
  const endDate = timestampToDate(memory.endDate);

  if (!startDate) {
    return "No date";
  }

  if (endDate) {
    return `${format(startDate, "d MMM yyyy")} - ${format(endDate, "d MMM yyyy")}`;
  }

  return format(startDate, "d MMM yyyy");
}

export function memoryPeopleNames(memory: Memory, people: Person[]) {
  const peopleById = new Map(people.map((person) => [person.id, person.displayName]));

  return memory.peopleIds.map((id) => peopleById.get(id)).filter(Boolean) as string[];
}

export function dateInputValue(value: Timestamp | Date | undefined) {
  const date = timestampToDate(value);

  return date ? format(date, "yyyy-MM-dd") : "";
}
