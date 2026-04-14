import withPWA from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence build noise from pdfkit/binary in API (not used in web, but shared tsconfig)
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    return config;
  },
};

export default withPWA({
  dest: "public",                  // Output sw.js + workbox files to public/
  cacheOnFrontEndNav: true,        // Cache pages visited client-side
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  workboxOptions: {
    disableDevLogs: true,
  },
  disable: process.env.NODE_ENV === "development", // No SW in dev
})(nextConfig);
