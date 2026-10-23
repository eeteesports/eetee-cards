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
 <section className={`${styles.path} ${styles.singles}`} aria-labelledby="singles-title"><p className={styles.eyebrow}>The full collection</p><h2 id="singles-title">Shop All</h2><p>Find your next favorite by player, team, set, price, and card type.</p><div className={styles.feature}><strong>{cards.length.toLocaleString('en-US')}</strong><span>individual cards to explore</span></div><p className={styles.detail}>Your players. Your picks. Your collection.</p><a className={styles.primary} href="/cards" onClick={()=>trackShop('select_shopping_path',{shopping_path:'individual_cards'})}>Shop all cards <span aria-hidden="true">→</span></a></section>
 <section className={styles.path} aria-labelledby="value-title"><div className={styles.sticker}>Mix &amp; Match<br/>$15 in bin cards for $10!</div><p className={styles.eyebrow}>Small prices. Great finds.</p><h2 id="value-title">Shop Value</h2><p>Dig through the $0.50 and $1 bins together. Mix your favorites and save.</p><div className={styles.feature}><strong>$0.50 <small>&amp;</small> $1</strong><span>two bins, one place to browse</span></div><p className={styles.detail}>Minimum $10 spend before shipping.</p><a className={styles.secondary} href="/bins" onClick={()=>trackShop('select_bin',{bin:'bins'})}>Shop $0.50 and $1 value bins <span aria-hidden="true">→</span></a></section>
 <section className={styles.path} aria-labelledby="sets-title"><div className={styles.sticker}>$30+ in value!</div><p className={styles.eyebrow}>Curated for your team</p><h2 id="sets-title">Shop Fan Bundles</h2><p>Your team, all in one set. See every card before you choose.</p><div className={styles.teamPreview} aria-hidden="true">{sample.slice(0,4).map(t=><img key={t} src={teamLogos[t].logo} alt=""/>)}</div><div className={styles.setPrice}><strong>$20</strong><span>per set + shipping</span></div><p className={styles.availability}><strong>NFL available now</strong><span>NBA, MLB &amp; more coming soon</span></p><a className={styles.secondary} href="/team-sets" onClick={()=>trackShop('select_shopping_path',{shopping_path:'team_sets'})}>Shop curated team sets <span aria-hidden="true">→</span></a></section>
 </div><LiveAuctions/></main>
 <footer className={styles.footer}><a href="mailto:eeteecards@gmail.com">eeteecards@gmail.com</a><a href="/privacy">Privacy</a><span>$7 USPS Ground Advantage shipping · Secure Stripe checkout.</span></footer></div>
}
