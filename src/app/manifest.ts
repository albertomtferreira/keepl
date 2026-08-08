import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Keepl",
    short_name: "Keepl",
    description: "A private relationship and memory manager for keeping people close.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#fbfaf7",
    theme_color: "#f8f3ea",
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
