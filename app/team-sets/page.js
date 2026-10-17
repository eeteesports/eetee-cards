import PublicShop from '@/components/PublicShop'
import {shopCatalog} from '@/lib/storefrontOrders'
export const dynamic='force-dynamic'

export const metadata={title:'NFL Team Sets · eetee.cards',description:'Choose a team and view every card in our curated $20 NFL team sets. $30+ in value, no duplicates within a set, plus shipping.'}
export default async function TeamSets(){const {teams,cards}=await shopCatalog();return <PublicShop teams={teams} bins={cards} mode="teams"/>}
