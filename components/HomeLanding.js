'use client'
import teamLogos from '../data/team-logos.json'
import LiveAuctions from './LiveAuctions'
import {trackShop} from '../lib/storefrontAnalytics.mjs'
import styles from './HomeLanding.module.css'
export default function HomeLanding({teams,cards,onShowCart,cartCount}){
 const sample=teams.teams.filter(t=>teams.bundles.some(b=>b.team===t)).slice(0,6)
 return <div className={styles.home}>
 <header className={styles.header}><a href="/" className={styles.brand}><img src="/eetee-logo.png" alt=""/><span>eetee.cards</span></a><nav aria-label="Main navigation"><a href="/team-sets">Team Sets</a><a href="/cards">Shop All Cards</a><button onClick={onShowCart}>Cart ({cartCount})</button></nav></header>
 <section className={styles.hero}><img src="/eetee-logo.png" alt="eetee alien"/><h1>eetee.cards</h1><p>Individual sports cards & curated team sets</p><span>Find your players. Build your collection.</span></section>
 <main className={styles.main}><div className={styles.paths}>
 <section className={`${styles.path} ${styles.singles}`} aria-labelledby="singles-title"><p className={styles.eyebrow}>Pick your own cards</p><h2 id="singles-title">Shop individual cards</h2><p>Find your next favorite by player, team, set, price, and card type.</p><a className={styles.primary} href="/cards" onClick={()=>trackShop('select_shopping_path',{shopping_path:'individual_cards'})}>Shop all Cards <span aria-hidden="true">→</span></a><p className={styles.cardCount}>{cards.length.toLocaleString('en-US')} cards to explore</p><div className={styles.binSection}><p className={styles.goldBanner}>Mix &amp; Match $15 in bin cards for $10!</p><div className={styles.bins}>{[{label:'Shop the $0.50 bin',tier:'50'},{label:'Shop the $1 bin',tier:'100'}].map(b=><a key={b.tier} href={'/bins?tier='+b.tier} onClick={()=>trackShop('select_bin',{bin:b.tier})}><strong>{b.label}</strong><span aria-hidden="true">→</span></a>)}</div><p className={styles.detail}>Minimum $10 spend before shipping.</p></div></section>
 <section className={styles.path} aria-labelledby="sets-title"><p className={styles.eyebrow}>Curated bundles</p><h2 id="sets-title">Your team. All in one set.</h2><p>Choose a team and see every card in each set.</p><div className={styles.teamPreview} aria-hidden="true">{sample.map(t=><img key={t} src={teamLogos[t].logo} alt=""/>)}</div><div className={styles.setPrice}><strong>$20</strong><span>per set + shipping</span></div><p className={styles.detail}>No duplicates within a set.</p><div className={styles.setAction}><p className={styles.goldBanner}>$30+ in value!</p><a className={styles.secondary} href="/team-sets" onClick={()=>trackShop('select_shopping_path',{shopping_path:'team_sets'})}>Shop Curated Team Sets <span aria-hidden="true">→</span></a><p className={styles.availability}><strong>NFL available now</strong><span>NBA, MLB &amp; more coming soon</span></p></div></section>
 </div><LiveAuctions/></main>
 <footer className={styles.footer}><a href="mailto:eeteecards@gmail.com">eeteecards@gmail.com</a><a href="/privacy">Privacy</a><span>$7 USPS Ground Advantage shipping · Secure Stripe checkout.</span></footer></div>
}
