import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    unoptimized: false,
    domains: ["localhost"],
  },
  // Add experimental features for better image handling
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
