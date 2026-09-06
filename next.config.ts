import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  typescript: {
    // Abaikan error TypeScript saat proses build/deploy
    ignoreBuildErrors: true,
  },
  eslint: {
    // Abaikan error ESLint saat proses build/deploy
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
