export type SearchScope =
  | "all"
  | "people"
  | "notes"
  | "memories"
  | "dates"
  | "interactions"
  | "groups";

export type SearchResultType =
  | "person"
  | "note"
  | "memory"
  | "date"
  | "interaction"
  | "group";

export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href: string;
  score: number;
  matchedFields: string[];
};
