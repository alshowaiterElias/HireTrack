import withPWA from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Empty turbopack config silences the "webpack config with no turbopack config" error
  // in Next.js 16 — many apps work fine under Turbopack with no extra config.
  turbopack: {},

  // Still needed for production builds (non-Turbopack) to strip Node-only modules
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    return config;
  },
};

export default withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  workboxOptions: {
    disableDevLogs: true,
  },
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
