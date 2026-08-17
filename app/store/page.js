import { redirect } from 'next/navigation'

// Updated 2026-08-17 (brand refresh): "/" is a curated landing page again,
// and the full filterable browse grid lives at /shop (see
// app/shop/page.js). This route stays alive for old links/the admin nav's
// "Storefront" icon but now forwards to the actual browse experience.
export default function StoreRedirect() {
  redirect('/shop')
}
