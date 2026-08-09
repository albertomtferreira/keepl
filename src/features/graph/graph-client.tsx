"use client";

import { useEffect, useMemo, useState } from "react";

import { RelationshipGraphView } from "@/features/graph/relationship-graph-view";
import { deriveRelationshipGraph } from "@/lib/graph/relationship-graph";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/i18n-context";
import { groupsRepository } from "@/repositories/groups";
import { peopleRepository } from "@/repositories/people";
import { relationshipsRepository } from "@/repositories/relationships";
import type { Group, Person, Relationship } from "@/types";

export function GraphClient() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [people, setPeople] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedRelationshipTypes, setSelectedRelationshipTypes] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }
    const ownerId = user.uid;

    async function loadGraph() {
      setLoading(true);
      setLoadError(false);

      try {
        const [peopleResult, relationshipsResult, groupsResult] = await Promise.all([
          peopleRepository.listActive(ownerId),
          relationshipsRepository.list(ownerId),
          groupsRepository.listByName(ownerId),
        ]);

        setPeople(peopleResult);
        setRelationships(relationshipsResult);
        setGroups(groupsResult);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }

    void loadGraph();
  }, [user]);

  const graph = useMemo(
    () =>
      deriveRelationshipGraph(people, relationships, {
        filters: {
          relationshipTypes: selectedRelationshipTypes,
          groupIds: selectedGroupIds,
        },
      }),
    [people, relationships, selectedGroupIds, selectedRelationshipTypes],
  );

  if (loading) {
    return <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">{t("graphPage", "loading")}</div>;
  }

  if (loadError) {
    return <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">{t("graphPage", "loadError")}</div>;
  }

  return (
    <RelationshipGraphView
      graph={graph}
      relationships={relationships}
      groups={groups}
      selectedRelationshipTypes={selectedRelationshipTypes}
      selectedGroupIds={selectedGroupIds}
      onRelationshipTypesChange={setSelectedRelationshipTypes}
      onGroupIdsChange={setSelectedGroupIds}
    />
  );
}
