import { LocalizedPageHeader } from "@/components/layout/localized-page-header";
import { SettingsClient } from "@/features/settings/settings-client";

export const metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <>
      <LocalizedPageHeader page="settings" />
      <SettingsClient />
    </>
  );
}
