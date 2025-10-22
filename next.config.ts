import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Only ignore ESLint errors in development
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  typescript: {
    // Only ignore TypeScript errors in development
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;
