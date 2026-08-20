import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — eetee Cards',
}

// Plain content page, no client interactivity needed. Written to be
// accurate to what this specific site actually does (Stripe for
// payment, Resend for order emails, GA4 + Vercel Analytics for traffic)
// rather than a generic template — added 2026-08-20 specifically because
// eBay's OAuth app-registration flow requires a Privacy Policy URL
// before it'll let Evan enable OAuth scopes for the eBay integration.
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-royal-600">
      <div className="bg-navy-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2.5 w-fit">
            <img src="/eetee-logo.png" alt="eetee Cards" className="w-9 h-9 object-contain" />
            <span className="font-display font-semibold text-lg tracking-tight">eetee Cards</span>
          </Link>
        </div>
      </div>
      <div className="max-w-2xl mx-auto bg-gray-50 min-h-[calc(100vh-72px)] px-4 py-10">
        <h1 className="font-display font-semibold text-2xl text-gray-900 mb-1">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-8">Last updated August 20, 2026</p>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed max-w-[65ch]">
          <p>
            eetee Cards (eetee.cards) is a small, family-run sports card storefront. This page explains what
            information we collect when you browse or buy from the site, and how it's used.
          </p>

          <section>
            <h2 className="font-display font-semibold text-gray-900 text-base mb-2">What we collect</h2>
            <p className="mb-2">When you make a purchase, our payment processor (Stripe) collects:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your name, email address, and shipping address</li>
              <li>Payment card details — these go directly to Stripe and are never seen or stored by us</li>
            </ul>
            <p className="mt-2">
              We use that order information only to fulfill your purchase — packing and shipping your cards, and
              emailing you a receipt and tracking number.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-gray-900 text-base mb-2">Browsing &amp; analytics</h2>
            <p>
              We use Google Analytics and Vercel Analytics to understand site traffic (which pages get visited,
              roughly how many people are browsing). These use cookies/similar technology and may collect your
              general location and device information. We don't use this data to identify you personally.
            </p>
            <p className="mt-2">
              Items you add to your cart are stored in your browser only (localStorage) — we don't see your cart
              until you check out.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-gray-900 text-base mb-2">Who we share information with</h2>
            <p className="mb-2">We share order information only with the services required to run the store:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Stripe</strong> — payment processing</li>
              <li><strong>Resend</strong> — sending order confirmation and shipping emails</li>
              <li><strong>USPS / shipping carriers</strong> — delivering your order</li>
            </ul>
            <p className="mt-2">We don't sell your information to anyone, for any reason.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-gray-900 text-base mb-2">Your choices</h2>
            <p>
              You can ask us what information we have about you, or ask us to delete it, by emailing{' '}
              <a href="mailto:eeteecards@gmail.com" className="text-navy-700 hover:underline">eeteecards@gmail.com</a>.
              Since Stripe processes payments directly, some records (like transaction history) are retained by
              Stripe per their own policy regardless of any deletion request made to us.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-gray-900 text-base mb-2">Contact</h2>
            <p>
              Questions about this policy? Email{' '}
              <a href="mailto:eeteecards@gmail.com" className="text-navy-700 hover:underline">eeteecards@gmail.com</a>.
            </p>
          </section>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-navy-700 font-semibold text-sm hover:underline">← Back to eetee Cards</Link>
        </div>
      </div>
    </div>
  )
}
