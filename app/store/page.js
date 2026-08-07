import { redirect } from 'next/navigation'

// The homepage IS the store now (see app/page.js) — Evan wanted landing
// straight into the browse experience instead of a separate marketing page.
// This route stays alive (old links, the admin nav's "Storefront" icon)
// but just forwards to '/'.
export default function StoreRedirect() {
  redirect('/')
}
