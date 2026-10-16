'use client'
import teamLogos from '../data/team-logos.json'
import LiveAuctions from './LiveAuctions'
import {trackShop} from '../lib/storefrontAnalytics.mjs'
import styles from './HomeLanding.module.css'
export default function HomeLanding({teams,cards,onShowCart,cartCount}){
 const sample=teams.teams.filter(t=>teams.bundles.some(b=>b.team===t)).slice(0,6)
 return <div className={styles.home}>
 <header className={styles.header}><a href="/" className={styles.brand}><img src="/eetee-logo.png" alt=""/><span>eetee.cards</span></a><nav aria-label="Main navigation"><a href="/team-sets">Team Sets</a><a href="/cards">Shop All Cards</a><button onClick={onShowCart}>Cart ({cartCount})</button></nav></header>
 <section className={styles.hero}><img src="/eetee-logo.png" alt="eetee alien"/><h1>eetee.cards</h1><p>Team sets & individual sports cards</p><span>NFL available now · More sports and leagues coming soon</span></section>
 <main className={styles.main}><div className={styles.paths}>
 <section className={styles.path} aria-labelledby="sets-title"><p className={styles.eyebrow}>Curated bundles</p><h2 id="sets-title">Shop team sets</h2><p>Choose a team and see every card in each set.</p><div className={styles.teamPreview} aria-hidden="true">{sample.map(t=><img key={t} src={teamLogos[t].logo} alt=""/>)}</div><div className={styles.setPrice}><strong>$20</strong><span>per set + shipping</span></div><p className={styles.detail}>$30+ in value. No duplicates within a set.</p><a className={styles.primary} href="/team-sets" onClick={()=>trackShop('select_shopping_path',{shopping_path:'team_sets'})}>Browse {teams.bundles.length} team sets <span>→</span></a></section>
 <section className={styles.path} aria-labelledby="singles-title"><p className={styles.eyebrow}>Pick your own cards</p><h2 id="singles-title">Shop individual cards</h2><p>Search by player, team, set, price, and card type.</p><div className={styles.bins}>{[{label:'$0.50 bin',tier:'50'},{label:'$1 bin',tier:'100'}].map(b=><a key={b.tier} href={'/bins?tier='+b.tier} onClick={()=>trackShop('select_bin',{bin:b.tier})}><strong>{b.label}</strong><span>Browse cards →</span></a>)}</div><p className={styles.deal}>Mix & match $15 in bin cards for $10 + shipping.</p><p className={styles.detail}>Minimum $10 spend before shipping.</p><a className={styles.primary} href="/cards" onClick={()=>trackShop('select_shopping_path',{shopping_path:'individual_cards'})}>Shop all {cards.length.toLocaleString('en-US')} cards <span>→</span></a></section>
 </div><LiveAuctions/></main>
 <footer className={styles.footer}><a href="mailto:eeteecards@gmail.com">eeteecards@gmail.com</a><a href="/privacy">Privacy</a><span>Availability and shipping confirmed before payment.</span></footer></div>
}
