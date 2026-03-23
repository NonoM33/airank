import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Skip static generation for pages that need DB
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Rewrites will be enabled once api.airank.fr is deployed
  // async rewrites() {
  //   return {
  //     afterFiles: [
  //       {
  //         source: '/api/:path*',
  //         destination: `${process.env.API_URL || 'https://api.airank.fr'}/api/:path*`,
  //       },
  //     ],
  //   }
  // },
  allowedDevOrigins: ['192.168.1.30'],
}

export default nextConfig
