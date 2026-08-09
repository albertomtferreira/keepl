import { LocalizedPageHeader } from "@/components/layout/localized-page-header";
import { GraphClient } from "@/features/graph/graph-client";

export const metadata = {
  title: "Relationship graph | Keepl",
};

export default function GraphPage() {
  return (
    <div className="space-y-5">
      <LocalizedPageHeader page="graph" />
      <GraphClient />
    </div>
  );
}
