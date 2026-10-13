import { SITE_CLOSED } from './lib/maintenanceMode.js'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com'],
  },
  // Keep legacy single-card shopping and checkout closed.
  // The public homepage is the independently curated team-bundle catalog.
  async redirects() {
    if (!SITE_CLOSED) return []
    return [
      { source: '/shop', destination: '/', permanent: false },
      { source: '/shop/:path*', destination: '/', permanent: false },
      { source: '/cart', destination: '/', permanent: false },
      { source: '/team/:path*', destination: '/', permanent: false },
      { source: '/order/:path*', destination: '/', permanent: false },
    ]
  },
};

export default nextConfig;
