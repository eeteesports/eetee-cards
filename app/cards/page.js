import PublicShop from '@/components/PublicShop'
import teams from '@/data/team-bundles.json'
import catalog from '@/lib/publicCatalog'
export const metadata={title:'Shop All Cards · eetee.cards',description:'Browse individual cards by player, team, and price. Shop the 50¢ and $1 bins or choose higher-value cards. Minimum $10 spend plus shipping.'}
export default function Cards(){return <PublicShop teams={teams} bins={catalog} mode="cards"/>}
