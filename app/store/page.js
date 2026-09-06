import { redirect } from 'next/navigation'
import { SITE_CLOSED } from '@/lib/maintenanceMode'

// Updated 2026-08-17 (brand refresh): "/" is a curated landing page again,
// and the full filterable browse grid lives at /shop (see
// app/shop/page.js). This route stays alive for old links/the admin nav's
// "Storefront" icon but now forwards to the actual browse experience.
// While SITE_CLOSED (2026-09-06), /shop itself redirects to "/" anyway
// (next.config.mjs) — sending straight there avoids a pointless double
// redirect.
export default function StoreRedirect() {
  redirect(SITE_CLOSED ? '/' : '/shop')
}
