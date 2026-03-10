import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
  },
});

const nextConfig: NextConfig = {
  output: 'standalone',
  // Turbopack config (Next 16 default) - empty enables it with webpack compat
  turbopack: {},
  experimental: {
    viewTransition: true,
  },
};

export default withPWA(nextConfig);