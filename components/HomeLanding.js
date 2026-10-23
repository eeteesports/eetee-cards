'use client'
import leagues from '../data/league-logos.json'
import LiveAuctions from './LiveAuctions'
import {SHIPPING_CENTS} from '../lib/storefrontCheckout.mjs'
import {trackShop} from '../lib/storefrontAnalytics.mjs'
import styles from './HomeLanding.module.css'
export default function HomeLanding({teams,cards,onShowCart,cartCount}){
 return <div className={styles.home}>
 <header className={styles.header}><a href="/" className={styles.brand}><img src="/eetee-logo.png" alt=""/><span>eetee.cards</span></a><span className={styles.pcNav}>eetee PC <small>Coming soon</small></span><nav aria-label="Main navigation"><a href="/team-sets">Team Sets</a><a href="/cards">Shop All Cards</a><button onClick={onShowCart}>Cart ({cartCount})</button></nav></header>
 <section className={styles.hero}><img src="/eetee-logo.png" alt="eetee alien"/><h1>eetee.cards</h1><p>Individual sports cards & curated team sets</p></section>
 <main className={styles.main}><div className={styles.paths}>
 <section className={styles.path} aria-labelledby="singles-title"><h2 id="singles-title">Shop All Cards</h2><p className={styles.metric}>{cards.length.toLocaleString('en-US')} cards</p><p className={styles.detail}>All available teams<br/>Every price, from $0.50 and up</p><a className={styles.primary} href="/cards" onClick={()=>trackShop('select_shopping_path',{shopping_path:'individual_cards'})}>Shop All <span aria-hidden="true">→</span></a></section>
 <section className={styles.path} aria-labelledby="value-title"><div className={styles.sticker}>Mix &amp; Match<br/>$15 in bin cards for $10!</div><h2 id="value-title">Shop Value</h2><p className={styles.metric}>$1 and under</p><p className={styles.detail}>$10 minimum order</p><a className={styles.primary} href="/bins" onClick={()=>trackShop('select_bin',{bin:'bins'})}>Shop Value <span aria-hidden="true">→</span></a></section>
 <section className={styles.path} aria-labelledby="sets-title"><div className={styles.sticker}>$30+ in value!</div><h2 id="sets-title">Shop Team Bundles</h2><div className={styles.leaguePreview}>{['NFL','NBA','MLB'].map(name=>{const league=leagues.find(l=>l.name===name);return <div key={name} className={league.available?styles.league:styles.futureLeague}><img src={league.logo} alt={name}/>{!league.available&&<span>Coming soon</span>}</div>})}</div><p className={styles.metric}>$20 per bundle</p><p className={styles.bundleCoverage}>Sets for All Teams</p><a className={styles.primary} href="/team-sets" onClick={()=>trackShop('select_shopping_path',{shopping_path:'team_sets'})}>Shop Team Bundles <span aria-hidden="true">→</span></a></section>
 </div><LiveAuctions/></main>
 <footer className={styles.footer}><a href="mailto:eeteecards@gmail.com">eeteecards@gmail.com</a><a href="/privacy">Privacy</a> <a href="/login?callbackUrl=/admin">Owner login</a><span>${(SHIPPING_CENTS/100).toFixed(2)} USPS Ground Advantage shipping · Secure Stripe checkout.</span></footer></div>
}
