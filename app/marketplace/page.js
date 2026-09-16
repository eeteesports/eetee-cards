import Marketplace from './Marketplace'
import data from '@/data/marketplace-preview.json'

export const metadata = {
  title: 'The marketplace · eetee Cards',
  description: 'Singles, player bundles, and dollar-bin discoveries from eetee Cards.',
  robots: { index: false, follow: false },
}

export default function MarketplacePage() {
  return <Marketplace listings={data.listings} summary={data.summary} />
}
