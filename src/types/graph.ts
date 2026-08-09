export type RelationshipGraphNode = {
  id: string;
  label: string;
  initials: string;
  groupIds: string[];
  isFocus: boolean;
};

export type RelationshipGraphEdge = {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  inverseLabel?: string;
};

export type RelationshipGraph = {
  nodes: RelationshipGraphNode[];
  edges: RelationshipGraphEdge[];
};

export type RelationshipGraphFilters = {
  relationshipTypes?: string[];
  groupIds?: string[];
};
