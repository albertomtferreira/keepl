import { PageHeader } from "@/components/layout/page-header";
import { SettingsClient } from "@/features/settings/settings-client";

export const metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Account and integration boundaries are here early, without requesting extra Google permissions."
      />
      <SettingsClient />
    </>
  );
}
