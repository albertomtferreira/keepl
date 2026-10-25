import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    runtimeCaching: [
      // Only immutable, same-origin assets may enter a runtime cache. Documents,
      // RSC payloads, provider media and Firebase responses remain network-only.
      {
        urlPattern: ({ url, sameOrigin }) =>
          sameOrigin && url.pathname.startsWith("/_next/static/"),
        handler: "CacheFirst",
        options: {
          cacheName: "keepl-static-v1",
          expiration: { maxEntries: 128, maxAgeSeconds: 2592000 },
        },
      },
      { urlPattern: /.*/, handler: "NetworkOnly", options: {} },
    ],
  },
  cacheStartUrl: false,
  dynamicStartUrl: false,
  register: true,
});

const nextConfig: NextConfig = {
  distDir:
    process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true"
      ? ".next-test"
      : ".next",
  reactCompiler: true,
  allowedDevOrigins: ["192.168.28.16"],
  async redirects() {
    return [
      {
        source: "/manifest.json",
        destination: "/manifest.webmanifest",
        permanent: true,
      },
    ];
  },
};

export default withPWA(nextConfig);
