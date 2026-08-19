import { Resend } from 'resend'
import { formatPrice } from './format'

const OWNER_EMAIL = 'eeteecards@gmail.com'

// Order-notification email — the actual "how do I know to go pack this
// up" mechanism until/unless a real fulfillment queue gets built. Never
// throws: a notification failing should never look like the order itself
// failed (the order's already safely recorded by the time this runs).
export async function sendOrderNotification(order) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping order notification email')
    return
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const addr = order.shipping_address || {}
    const addressLines = [
      addr.line1,
      addr.line2,
      [addr.city, addr.state, addr.postal_code].filter(Boolean).join(', '),
    ].filter(Boolean)

    const itemRows = order.items.map((item) => {
      const f = item.card?.fields || {}
      const name = [f.Year, f.Brand, f.Set, f.Player].filter(Boolean).join(' ') || f.Player || 'Card'
      return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">${name}${f['Parallel / Variant'] ? ` — ${f['Parallel / Variant']}` : ''}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${formatPrice(item.price)}</td>
        </tr>`
    }).join('')

    await resend.emails.send({
      from: 'eetee Cards <orders@eetee.cards>',
      to: OWNER_EMAIL,
      subject: `🎉 New order — ${formatPrice(order.total)} (${order.items.length} card${order.items.length !== 1 ? 's' : ''})`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;">
          <div style="background:#0f1b35;padding:16px 20px;border-radius:12px 12px 0 0;">
            <h1 style="color:white;margin:0;font-size:18px;">New Order</h1>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px;">
            <p style="margin:0 0 12px;color:#374151;"><strong>${order.buyer_name || 'Buyer'}</strong> (${order.buyer_email || 'no email'})</p>
            <p style="margin:0 0 16px;color:#6b7280;font-size:14px;">
              Ship to:<br>${addressLines.join('<br>')}
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">${itemRows}</table>
            <table style="width:100%;margin-top:8px;font-size:14px;">
              <tr><td style="color:#6b7280;">Shipping</td><td style="text-align:right;">${order.shipping_method || '—'} · ${formatPrice(order.shipping_cost)}</td></tr>
              <tr><td style="padding-top:6px;font-weight:700;">Total</td><td style="padding-top:6px;text-align:right;font-weight:700;">${formatPrice(order.total)}</td></tr>
            </table>
            <p style="margin-top:20px;font-size:12px;color:#9ca3af;">Check Store Analytics in the eetee app for the full order list.</p>
          </div>
        </div>
      `,
    })
  } catch (err) {
    console.error('Order notification email failed:', err.message || err)
  }
}
