import PublicShop from '@/components/PublicShop'
import teams from '@/data/team-bundles.json'
import bins from '@/lib/publicCatalog'
export const metadata={title:'eetee.cards · Team sets & sports cards',description:'Shop curated team sets or individual sports cards. Browse the 50¢ and $1 bins, search the full collection, and bid on current eBay auctions.'}
export default function Home(){return <PublicShop teams={teams} bins={bins}/>}
