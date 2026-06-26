import { Resend } from 'resend'

const OWNER_EMAIL = 'eeteesports@gmail.com'

export async function POST(request) {
  try {
    // Initialize lazily so missing env var doesn't crash the build
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { buyerName, buyerEmail, buyerPhone, message, items } = await request.json()

    if (!buyerName || !buyerEmail || !items?.length) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Build the card list for the email
    const totalAsking = items.reduce((s, i) => s + (i.askingPrice || 0), 0)
    const totalOffered = items.reduce((s, i) => s + (i.offerAmount || i.askingPrice || 0), 0)

    const cardLines = items.map((item, idx) => {
      const asking = item.askingPrice ? `$${Number(item.askingPrice).toLocaleString()}` : 'Price TBD'
      const offer = item.offerAmount
        ? `$${Number(item.offerAmount).toLocaleString()}`
        : item.askingPrice
        ? `$${Number(item.askingPrice).toLocaleString()} (asking price)`
        : 'Open offer'
      return `${idx + 1}. ${item.cardName || item.player}
   Asking: ${asking} → Offer: ${offer}`
    }).join('\n\n')

    const emailBody = `
Hi Evan,

${buyerName} is interested in ${items.length} card${items.length > 1 ? 's' : ''} from your eetee Sports collection.

──────────────────────────────
CARDS
──────────────────────────────
${cardLines}

──────────────────────────────
TOTALS
──────────────────────────────
Total Asking:  $${totalAsking.toLocaleString()}
Total Offered: $${totalOffered.toLocaleString()}

──────────────────────────────
BUYER
──────────────────────────────
Name:  ${buyerName}
Email: ${buyerEmail}${buyerPhone ? `\nPhone: ${buyerPhone}` : ''}

${message ? `Message:\n"${message}"` : ''}

──────────────────────────────
Reply directly to ${buyerEmail} to respond.
View your collection: https://eetee.vercel.app
    `.trim()

    const htmlBody = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
  <div style="background: #0f1b35; padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">🏷️ New Offer on Your Cards</h1>
    <p style="color: #93c5fd; margin: 4px 0 0;">${buyerName} wants to buy ${items.length} card${items.length > 1 ? 's' : ''}</p>
  </div>
  <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">

    <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; margin: 0 0 12px;">Cards</h2>
    ${items.map((item) => {
      const asking = item.askingPrice ? `$${Number(item.askingPrice).toLocaleString()}` : 'TBD'
      const offer = item.offerAmount
        ? `<strong style="color: #16a34a;">$${Number(item.offerAmount).toLocaleString()}</strong>`
        : item.askingPrice
        ? `<strong style="color: #16a34a;">$${Number(item.askingPrice).toLocaleString()}</strong> <span style="color:#6b7280;">(asking)</span>`
        : '<strong>Open offer</strong>'
      return `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
        <div style="font-weight: bold; color: #111;">${item.cardName || item.player}</div>
        <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">
          Asking: ${asking} &nbsp;→&nbsp; Offer: ${offer}
        </div>
      </div>`
    }).join('')}

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin: 16px 0; display: flex; gap: 24px;">
      <div>
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Total Asking</div>
        <div style="font-size: 20px; font-weight: 900;">$${totalAsking.toLocaleString()}</div>
      </div>
      <div>
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Total Offered</div>
        <div style="font-size: 20px; font-weight: 900; color: #16a34a;">$${totalOffered.toLocaleString()}</div>
      </div>
    </div>

    <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; margin: 20px 0 8px;">Buyer</h2>
    <p style="margin: 4px 0;"><strong>${buyerName}</strong></p>
    <p style="margin: 4px 0; color: #2563eb;">${buyerEmail}</p>
    ${buyerPhone ? `<p style="margin: 4px 0; color: #6b7280;">${buyerPhone}</p>` : ''}

    ${message ? `
    <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; margin: 20px 0 8px;">Message</h2>
    <p style="background: #f9fafb; border-left: 3px solid #3b82f6; padding: 10px 14px; border-radius: 0 8px 8px 0; margin: 0; font-style: italic; color: #374151;">${message}</p>
    ` : ''}

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
      <a href="mailto:${buyerEmail}" style="background: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Reply to ${buyerName}</a>
    </div>
  </div>
</body>
</html>
    `.trim()

    await resend.emails.send({
      from: 'eetee Sports <onboarding@resend.dev>',
      to: OWNER_EMAIL,
      replyTo: buyerEmail,
      subject: `🏷️ New offer from ${buyerName} — ${items.length} card${items.length > 1 ? 's' : ''}`,
      text: emailBody,
      html: htmlBody,
    })

    return Response.json({ success: true })
  } catch (err) {
    console.error('Offer email error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
