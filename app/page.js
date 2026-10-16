import PublicShop from '@/components/PublicShop'
import teams from '@/data/team-bundles.json'
import bins from '@/lib/publicCatalog'
export const metadata={title:'eetee.cards · Team sets & sports cards',description:'Choose your team and see every card in each $20 set. Also browse the $1 and 50¢ bins: mix and match $15 worth for $10, plus shipping.'}
export default function Home(){return <PublicShop teams={teams} bins={bins}/>}
