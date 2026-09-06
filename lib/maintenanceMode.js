// Single on/off switch for temporarily closing the public storefront
// (2026-09-06, Evan's ask: "don't want anyone to place an order right
// now" while keeping the brand/logo visible via an Under Construction
// page). Flip to false and redeploy to fully reopen — nothing else needs
// to change. Deliberately a code constant, not an env var: this is a
// business decision made via a deploy, not something that should be
// toggle-able by editing Vercel's dashboard without a code review trail.
//
// What this flag actually gates (grep for SITE_CLOSED to find all of
// them): next.config.mjs redirects /shop, /cart, /team/*, /order/* back
// to "/"; app/store/page.js's redirect target; app/page.js renders the
// ComingSoon view instead of the real curated homepage; and
// app/api/checkout/route.js refuses to create a new Stripe session even
// if someone hits the API directly. The admin/ops area (/dashboard,
// /collection, /add, /bulk-add, /admin, /scout, /tools) is NOT affected —
// Evan can keep managing inventory while the public site is closed.
export const SITE_CLOSED = true
