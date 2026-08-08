import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Keepl",
    short_name: "Keepl",
    description: "A private relationship and memory manager for keeping people close.",
    id: "/home",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#fbfaf7",
    theme_color: "#f8f3ea",
    categories: ["lifestyle", "productivity"],
    orientation: "portrait",
    shortcuts: [
      {
        name: "People",
        short_name: "People",
        description: "Open your people list.",
        url: "/people",
      },
      {
        name: "Upcoming",
        short_name: "Upcoming",
        description: "View upcoming dates and reminders.",
        url: "/upcoming",
      },
      {
        name: "New memory",
        short_name: "Memory",
        description: "Capture a shared memory.",
        url: "/memories/new",
      },
    ],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
