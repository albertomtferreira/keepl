"use client";

import { Network, SlidersHorizontal, UsersRound, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getGroupOptions, getRelationshipTypeOptions } from "@/lib/graph/relationship-graph";
import { useI18n } from "@/lib/i18n/i18n-context";
import { cn } from "@/lib/utils";
import type { Group, Relationship, RelationshipGraph } from "@/types";

type Props = {
  graph: RelationshipGraph;
  relationships: Relationship[];
  groups: Group[];
  selectedRelationshipTypes?: string[];
  selectedGroupIds?: string[];
  onRelationshipTypesChange?: (values: string[]) => void;
  onGroupIdsChange?: (values: string[]) => void;
  compact?: boolean;
};

export function RelationshipGraphView({
  compact = false,
  graph,
  groups,
  onGroupIdsChange,
  onRelationshipTypesChange,
  relationships,
  selectedGroupIds = [],
  selectedRelationshipTypes = [],
}: Props) {
  const { t } = useI18n();
  const relationshipTypes = getRelationshipTypeOptions(relationships);
  const groupOptions = getGroupOptions(groups);
  const positions = getNodePositions(graph.nodes.length);

  if (graph.nodes.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-5 text-sm text-muted-foreground">
        {t("graphPage", "empty")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!compact ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <FilterGroup
            icon={SlidersHorizontal}
            label={t("graphPage", "relationshipTypeFilter")}
            values={relationshipTypes}
            selectedValues={selectedRelationshipTypes}
            onChange={onRelationshipTypesChange}
            allLabel={t("graphPage", "allRelationshipTypes")}
          />
          <FilterGroup
            icon={UsersRound}
            label={t("graphPage", "groupFilter")}
            values={groupOptions.map((group) => group.id)}
            valueLabels={Object.fromEntries(groupOptions.map((group) => [group.id, group.name]))}
            selectedValues={selectedGroupIds}
            onChange={onGroupIdsChange}
            allLabel={t("graphPage", "allGroups")}
          />
        </div>
      ) : null}

      <div className={cn("overflow-hidden rounded-lg border bg-white shadow-sm", compact ? "p-3" : "p-4")}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Network className="size-4 text-muted-foreground" aria-hidden="true" />
            {compact ? t("graphPage", "miniTitle") : t("graphPage", "title")}
          </h2>
          {compact ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/graph">{t("graphPage", "openFullGraph")}</Link>
            </Button>
          ) : null}
        </div>
        <svg className="h-[18rem] w-full md:h-[28rem]" viewBox="0 0 720 420" role="img" aria-label={t("graphPage", "graphAria")}>
          {graph.edges.map((edge) => {
            const fromIndex = graph.nodes.findIndex((node) => node.id === edge.fromId);
            const toIndex = graph.nodes.findIndex((node) => node.id === edge.toId);
            const from = positions[fromIndex];
            const to = positions[toIndex];

            if (!from || !to) {
              return null;
            }

            return (
              <g key={edge.id}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="stroke-border" strokeWidth="2" />
                <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8} textAnchor="middle" className="fill-muted-foreground text-[12px]">
                  {edge.label}
                </text>
              </g>
            );
          })}
          {graph.nodes.map((node, index) => {
            const position = positions[index];

            return (
              <a key={node.id} href={`/people/${node.id}`}>
                <g className="focus:outline-none">
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={node.isFocus ? 35 : 29}
                    className={node.isFocus ? "fill-[#e7f0dc] stroke-foreground" : "fill-[#f1ede4] stroke-border"}
                    strokeWidth="2"
                  />
                  <text x={position.x} y={position.y + 5} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">
                    {node.initials}
                  </text>
                  <text x={position.x} y={position.y + 51} textAnchor="middle" className="fill-foreground text-[12px]">
                    {node.label}
                  </text>
                </g>
              </a>
            );
          })}
        </svg>
      </div>

      <RelationshipList graph={graph} />
    </div>
  );
}

function FilterGroup({
  allLabel,
  icon: Icon,
  label,
  onChange,
  selectedValues,
  valueLabels = {},
  values,
}: {
  allLabel: string;
  icon: LucideIcon;
  label: string;
  onChange?: (values: string[]) => void;
  selectedValues: string[];
  valueLabels?: Record<string, string>;
  values: string[];
}) {
  return (
    <fieldset className="rounded-lg border bg-white p-4">
      <legend className="sr-only">{label}</legend>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterButton active={selectedValues.length === 0} onClick={() => onChange?.([])}>
          {allLabel}
        </FilterButton>
        {values.map((value) => (
          <FilterButton
            key={value}
            active={selectedValues.includes(value)}
            onClick={() => {
              const nextValues = selectedValues.includes(value)
                ? selectedValues.filter((selectedValue) => selectedValue !== value)
                : [...selectedValues, value];
              onChange?.(nextValues);
            }}
          >
            {valueLabels[value] ?? value}
          </FilterButton>
        ))}
      </div>
    </fieldset>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <Button type="button" variant={active ? "default" : "outline"} size="sm" onClick={onClick}>
      {children}
    </Button>
  );
}

function RelationshipList({ graph }: { graph: RelationshipGraph }) {
  const { t } = useI18n();
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));

  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold">{t("graphPage", "listTitle")}</h2>
      {graph.edges.length > 0 ? (
        <ul className="space-y-2">
          {graph.edges.map((edge) => (
            <li key={edge.id} className="text-sm">
              <Link className="font-medium underline-offset-2 hover:underline" href={`/people/${edge.fromId}`}>
                {nodesById.get(edge.fromId)?.label}
              </Link>
              <span className="text-muted-foreground"> {edge.label} </span>
              <Link className="font-medium underline-offset-2 hover:underline" href={`/people/${edge.toId}`}>
                {nodesById.get(edge.toId)?.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("graphPage", "noRelationships")}</p>
      )}
    </section>
  );
}

function getNodePositions(count: number) {
  if (count === 1) {
    return [{ x: 360, y: 210 }];
  }

  const center = { x: 360, y: 205 };
  const radiusX = 255;
  const radiusY = 135;

  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    return {
      x: center.x + Math.cos(angle) * radiusX,
      y: center.y + Math.sin(angle) * radiusY,
    };
  });
}
