import PublicShop from '@/components/PublicShop'
import {shopCatalog} from '@/lib/storefrontOrders'
export const dynamic='force-dynamic'

export const metadata={title:'$1 & 50¢ bins · eetee.cards',description:'Pick individual sports cards from the $1 and 50¢ bins. Mix and match $15 worth of cards for $10 plus shipping. Minimum $10 spend.'}
export default async function Bins({searchParams}){const {teams,cards}=await shopCatalog();return <PublicShop teams={teams} bins={cards} mode="bins" binTier={['50','100'].includes(searchParams?.tier)?searchParams.tier:'bins'}/>}
