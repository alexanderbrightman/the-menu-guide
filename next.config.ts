import type { NextConfig } from "next";

// Validate environment variables at build time
if (process.env.NODE_ENV === 'production') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { validateEnv } = require('./src/lib/env-validation');
    validateEnv();
    console.log('✅ Environment variables validated successfully');
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    // Don't fail the build, but warn the developer
  }
}

const nextConfig: NextConfig = {

  typescript: {
    // Only ignore TypeScript errors in development
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  // Performance optimizations
  // Turbopack configuration (moved from experimental.turbo)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  experimental: {
    // Optimize bundle splitting - add more packages for better code splitting
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-badge',
      '@supabase/supabase-js',
      'qrcode',
    ],
  },
  // Compiler optimizations
  compiler: {
    // Remove console.logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'ydlizmqgfowhhdpncayd.supabase.co',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },
  // Headers for better caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, stale-while-revalidate=300'
          }
        ],
      },
    ]
  },
};

export default nextConfig;
