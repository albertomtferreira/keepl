import { LocalizedPageHeader } from "@/components/layout/localized-page-header";
import { ExportImportClient } from "@/features/export-import/export-import-client";

export const metadata = {
  title: "Export and import | Keepl",
};

export default function ExportImportPage() {
  return (
    <div className="space-y-5">
      <LocalizedPageHeader page="exportImport" />
      <ExportImportClient />
    </div>
  );
}
