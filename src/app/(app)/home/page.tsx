import { LocalizedPageHeader } from "@/components/layout/localized-page-header";
import { HomeClient } from "@/features/home/home-client";

export const metadata = {
  title: "Home",
};

export default function HomePage() {
  return (
    <>
      <LocalizedPageHeader page="home" />
      <HomeClient />
    </>
  );
}
