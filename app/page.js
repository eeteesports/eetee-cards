import TeamBundles from '@/components/TeamBundles'
import inventory from '@/data/team-bundles.json'
export const metadata={title:'$20 NFL team card bundles · eetee.cards',description:'Choose your NFL team and browse curated sports card sets. $30–$35 in individually priced cards for $20 plus shipping. Exact cards shown; no duplicates in a lot.'}
export default function Home(){return <TeamBundles inventory={inventory}/>}
