import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: "security"
  },
  reactStrictMode: true
};

export default nextConfig;
