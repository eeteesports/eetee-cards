import PublicShop from '@/components/PublicShop'
import teams from '@/data/team-bundles.json'
import bins from '@/data/bin-cards.json'
export const metadata={title:'$1 & 50¢ bins · eetee.cards',description:'Pick individual sports cards from the $1 and 50¢ bins. Mix and match $15 worth of cards for $10 plus shipping. Minimum $10 spend.'}
export default function Bins(){return <PublicShop teams={teams} bins={bins} mode="bins"/>}
