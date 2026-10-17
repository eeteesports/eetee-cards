import PublicShop from '@/components/PublicShop'
import {shopCatalog} from '@/lib/storefrontOrders'
export const dynamic='force-dynamic'

export const metadata={title:'Shop All Cards · eetee.cards',description:'Browse individual cards by player, team, and price. Shop the 50¢ and $1 bins or choose higher-value cards. Minimum $10 spend plus shipping.'}
export default async function Cards(){const {teams,cards}=await shopCatalog();return <PublicShop teams={teams} bins={cards} mode="cards"/>}
