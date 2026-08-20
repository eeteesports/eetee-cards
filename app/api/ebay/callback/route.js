// GET /api/ebay/callback — eBay redirects here after Evan approves (or
// denies) the connection. Exchanges the one-time code for an access +
// refresh token pair and stores them in Turso (ebay_auth, single row) —
// eetee-cards-app reads/refreshes from there when pulling orders/
// listings. This route is the only place that ever sees the raw
// authorization code; nothing about it touches the desktop app directly
// (it isn't publicly reachable, which is the whole reason this lives
// here instead).
import { getTurso } from '@/lib/db'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return new Response(`<h1>eBay connection declined</h1><p>${error}</p>`, { headers: { 'Content-Type': 'text/html' } })
  }
  if (!code) {
    return new Response('<h1>Missing authorization code</h1>', { status: 400, headers: { 'Content-Type': 'text/html' } })
  }

  const { EBAY_APP_ID, EBAY_CERT_ID, EBAY_RUNAME } = process.env
  if (!EBAY_APP_ID || !EBAY_CERT_ID || !EBAY_RUNAME) {
    return new Response('<h1>Server missing EBAY_APP_ID / EBAY_CERT_ID / EBAY_RUNAME</h1>', { status: 500, headers: { 'Content-Type': 'text/html' } })
  }

  const basicAuth = Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString('base64')
  const tokenRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: EBAY_RUNAME,
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenRes.ok || !tokenData.access_token) {
    console.error('eBay token exchange failed:', tokenData)
    return new Response(`<h1>eBay connection failed</h1><pre>${JSON.stringify(tokenData, null, 2)}</pre>`, { status: 500, headers: { 'Content-Type': 'text/html' } })
  }

  const now = new Date()
  const accessExpiresAt = new Date(now.getTime() + tokenData.expires_in * 1000).toISOString()
  const refreshExpiresAt = tokenData.refresh_token_expires_in
    ? new Date(now.getTime() + tokenData.refresh_token_expires_in * 1000).toISOString()
    : null

  const turso = getTurso()
  await turso.execute({
    sql: `
      INSERT INTO ebay_auth (id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, connected_at, updated_at)
      VALUES ('ebay', @accessToken, @refreshToken, @accessExpiresAt, @refreshExpiresAt, datetime('now'), datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        access_token = @accessToken,
        refresh_token = @refreshToken,
        access_token_expires_at = @accessExpiresAt,
        refresh_token_expires_at = @refreshExpiresAt,
        updated_at = datetime('now')
    `,
    args: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      accessExpiresAt,
      refreshExpiresAt,
    },
  })

  return new Response(
    '<h1>eBay account connected!</h1><p>You can close this tab and go back to the eetee app.</p>',
    { headers: { 'Content-Type': 'text/html' } }
  )
}
