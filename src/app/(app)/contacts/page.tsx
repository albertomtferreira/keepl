import { LocalizedPageHeader } from "@/components/layout/localized-page-header";
import { ContactsClient } from "@/features/contacts-sync/contacts-client";

export const metadata = { title: "Google Contacts | Keepl" };
export default function ContactsPage() {
  return (
    <div className="space-y-5">
      <LocalizedPageHeader page="contacts" />
      <ContactsClient />
    </div>
  );
}
