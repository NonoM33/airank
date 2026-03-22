import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Skip static generation for pages that need DB
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

export default nextConfig
