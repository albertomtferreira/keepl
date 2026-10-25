import type { NextConfig } from "next";
import withPWAInit, { runtimeCaching } from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    runtimeCaching: [
      { urlPattern: /\/api\/google\/photos\//, handler: "NetworkOnly" },
      ...runtimeCaching,
    ],
  },
  cacheStartUrl: true,
  dynamicStartUrl: true,
  register: true,
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ['192.168.28.16'],
};

export default withPWA(nextConfig);
