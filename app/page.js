import PublicShop from '@/components/PublicShop'
import {shopCatalog} from '@/lib/storefrontOrders'
export const dynamic='force-dynamic'

export const metadata={title:'eetee.cards · Team sets & sports cards',description:'Shop curated team sets or individual sports cards. Browse the 50¢ and $1 bins, search the full collection, and bid on current eBay auctions.'}
export default async function Home(){const {teams,cards}=await shopCatalog();return <PublicShop teams={teams} bins={cards}/>}
