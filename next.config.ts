import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // The document limit is 10 MB. Multipart requests need a small amount of
    // additional room for boundaries and field metadata.
    serverActions: {
      bodySizeLimit: '11mb',
    },
  },
}

export default nextConfig
