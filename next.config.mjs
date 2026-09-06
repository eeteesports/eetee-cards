import { SITE_CLOSED } from './lib/maintenanceMode.js'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com'],
  },
  // Temporary storefront closure (2026-09-06) — see lib/maintenanceMode.js.
  // Bounces every public shopping/checkout route back to "/", which shows
  // the Under Construction page while SITE_CLOSED is true. Admin/ops
  // routes are untouched (not listed here).
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
