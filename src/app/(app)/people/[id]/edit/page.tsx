import { PersonEditClient } from "@/features/people/person-edit-client";

export const metadata = {
  title: "Edit Person",
};

export default async function EditPersonPage(props: PageProps<"/people/[id]/edit">) {
  const { id } = await props.params;

  return <PersonEditClient personId={id} />;
}
