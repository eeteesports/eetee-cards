import PublicShop from '@/components/PublicShop'
import teams from '@/data/team-bundles.json'
import bins from '@/lib/publicCatalog'
export const metadata={title:'NFL Team Sets · eetee.cards',description:'Choose a team and view every card in our curated $20 NFL team sets. $30+ in value, no duplicates within a set, plus shipping.'}
export default function TeamSets(){return <PublicShop teams={teams} bins={bins} mode="teams"/>}
