import { PageHeader } from "@/components/layout/page-header";

export const metadata = {
  title: "Settings",
};

const sections = ["Account", "Google", "Contacts", "Photos", "Calendar", "Notifications", "Privacy", "Data"];

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Account and integration boundaries are here early, without requesting extra Google permissions."
      />
      <div className="grid gap-3">
        {sections.map((section) => (
          <section key={section} className="rounded-lg border bg-white p-4">
            <h2 className="font-semibold">{section}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Not connected</p>
          </section>
        ))}
      </div>
    </>
  );
}
