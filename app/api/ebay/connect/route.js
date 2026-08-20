// GET /api/ebay/connect — the "Connect eBay Account" button in the
// desktop app's Store Analytics opens this in a browser tab. It just
// redirects to eBay's own consent page; eBay redirects back to
// /api/ebay/callback once Evan approves. One-time — after this, the
// refresh token in ebay_auth keeps working without asking again.
const SCOPES = [
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
].join(' ')

// No request-based branching in this handler — exactly the shape that
// bit the desktop app's /api/web-orders route (Next.js silently caches a
// GET route handler's response when nothing marks it dynamic). Harmless
// here since the redirect target never changes, but no reason to trust
// that twice.
export const dynamic = 'force-dynamic'

export async function GET() {
  const { EBAY_APP_ID, EBAY_RUNAME } = process.env
  if (!EBAY_APP_ID || !EBAY_RUNAME) {
    return Response.json({ error: 'Missing EBAY_APP_ID or EBAY_RUNAME env var' }, { status: 500 })
  }

  const params = new URLSearchParams({
    client_id: EBAY_APP_ID,
    redirect_uri: EBAY_RUNAME, // eBay's OAuth uses the RuName here, not a literal URL
    response_type: 'code',
    scope: SCOPES,
  })

  return Response.redirect(`https://auth.ebay.com/oauth2/authorize?${params}`)
}
