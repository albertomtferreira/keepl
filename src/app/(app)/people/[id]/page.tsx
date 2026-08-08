import { PersonProfileClient } from "@/features/people/person-profile-client";

export const metadata = {
  title: "Person",
};

export default async function PersonPage(props: PageProps<"/people/[id]">) {
  const { id } = await props.params;

  return <PersonProfileClient personId={id} />;
}
