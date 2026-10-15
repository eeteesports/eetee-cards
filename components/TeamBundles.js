'use client'
import {useEffect,useMemo,useState} from 'react'
import styles from './TeamBundles.module.css'
import {bundleStats} from '../lib/bundleStats.mjs'
import InlineCardBadges from './InlineCardBadges'
import {cardSetLabel} from '../lib/cardLabels.mjs'
export default function TeamBundles({inventory,onAddBundle,onShowCart,cartCount,selectedBundles=[]}){
 const[team,setTeam]=useState(''),[open,setOpen]=useState(null),[back,setBack]=useState(false)
 useEffect(()=>{if(open)document.getElementById('bundle-contents')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})},[open])
 const bundles=useMemo(()=>inventory.bundles.filter(b=>b.team===team),[inventory,team])
 const counts=useMemo(()=>Object.fromEntries(inventory.teams.map(t=>[t,inventory.bundles.filter(b=>b.team===t).length])),[inventory])
 function choose(t){setTeam(t);setOpen(null);setBack(false)}
 return <div className={styles.site}>
  <header className={`${styles.header} ${styles.largeHeader}`}><a href="/" className={`${styles.brand} ${styles.largeBrand}`}><img src="/eetee-logo.png" alt="eetee alien"/><span className={styles.brandText}>eetee.cards</span></a><nav className={styles.headerNav}><a href="/bins">$1 & 50¢ bins</a><button onClick={onShowCart}>Your selection ({cartCount})</button></nav></header>
  <section id="bundles" className={`${styles.shop} ${styles.focusedShop}`}>
   <div className={styles.sectionHeading}><div><h1 className={styles.mainTitle}>Team sets</h1><p className={styles.plainIntro}>$20 per set + shipping. $30+ in value. No duplicates within a set.</p></div></div>
   <div className={styles.teamPicker}><label htmlFor="team-select">Select a team</label><select id="team-select" value={team} onChange={e=>choose(e.target.value)}><option value="">Select a team…</option>{inventory.teams.map(t=><option key={t} value={t}>{t} · {counts[t]} {counts[t]===1?'set':'sets'}</option>)}</select><span>{team?`${bundles.length} available ${bundles.length===1?'set':'sets'}`:`${inventory.bundles.length} sets across ${inventory.teams.filter(t=>counts[t]).length} teams`}</span></div>
   {!team?<p className={styles.selectPrompt}>Select a team to see its available sets and complete card lists.</p>:!bundles.length?<div className={styles.pickPrompt}><h2>No {team} sets available yet.</h2><p>More sets will be added as inventory allows.</p><a href="/bins">Browse individual cards in the bins →</a></div>:<>
   <div className={styles.teamHeading}><h2>{team}</h2><span>Each set contains the exact cards shown in its full list.</span></div>
   <div className={styles.bundleGrid}>{bundles.map(bundle=>{const stats=bundleStats(bundle.cards);const showcase=Array.from(new Map(bundle.cards.map(c=>[c.player,c])).values()).slice(0,6);return <article className={styles.bundle} key={bundle.id}>
    <div className={styles.previewLabel}><h3>{bundle.name}</h3><span>Preview: {showcase.length} of {bundle.cards.length} cards</span></div>
    <div className={styles.bundlePhotos}>{showcase.map(c=><div key={c.id}><img src={c.front} alt={`${c.year} ${c.set} ${c.player}`} loading="lazy"/></div>)}</div>
    <button className={styles.allCardsButton} aria-expanded={open===bundle.id} onClick={()=>{setOpen(open===bundle.id?null:bundle.id);setBack(false)}}>{open===bundle.id?'Hide full card list':`View all ${bundle.cards.length} cards — fronts & backs`} <span>{open===bundle.id?'−':'→'}</span></button>
    <div className={styles.bundleBody}><dl className={styles.bundleStats}><div className={styles.prominentStat}><dt>Cards</dt><dd>{bundle.cards.length}</dd></div><div className={styles.prominentStat}><dt>Players</dt><dd>{bundle.playerCount}</dd></div><div><dt>Rookie Cards</dt><dd>{stats.rookies}</dd></div><div><dt>Inserts</dt><dd>{stats.inserts}</dd></div><div><dt>Parallels</dt><dd>{stats.parallels}</dd></div><div><dt>Vintage (Pre-2000)</dt><dd>{stats.vintage}</dd></div></dl><div className={styles.value}><strong>$30+ in value in each set!</strong></div><div className={styles.price}><strong>$20</strong><span>+ shipping</span></div><button className={styles.request} onClick={()=>onAddBundle(bundle.id)} disabled={selectedBundles.includes(bundle.id)}>{selectedBundles.includes(bundle.id)?'Added to your selection':'Add team set'} <span>＋</span></button><small>{bundle.id}</small></div>
   </article>})}</div>
   {open&&(()=>{const bundle=bundles.find(b=>b.id===open);if(!bundle)return null;return <section id="bundle-contents" className={styles.contents} aria-label={`${bundle.name} contents`}><div className={styles.contentsHeading}><div><h3>{team} · {bundle.name}</h3><p>All {bundle.cards.length} cards in this set · $20 + shipping</p></div><button aria-pressed={back} onClick={()=>setBack(b=>!b)}>{back?'Show fronts':'Show backs'}</button></div><div className={styles.cardGrid}>{bundle.cards.map(c=><article key={c.id}><a href={back?c.back:c.front} target="_blank" rel="noreferrer" aria-label={`Enlarge ${c.player} card`}><img src={back?c.back:c.front} alt={`${c.year} ${c.set} ${c.player}, ${back?'back':'front'}`} loading="lazy"/></a><h4>{c.player}</h4><InlineCardBadges card={c}/><p>{cardSetLabel(c)} · #{c.number}</p><p>{[c.family,c.parallel,c.serial].filter(Boolean).join(' · ')}</p></article>)}</div><button className={styles.request} onClick={()=>onAddBundle(bundle.id)} disabled={selectedBundles.includes(bundle.id)}>{selectedBundles.includes(bundle.id)?'Added to your selection':`Add ${bundle.name} · $20 + shipping`}</button></section>})()}
   </>}
   <div className={styles.binLink}><a href="/bins">Check out the $1 bin and $0.50 bin →</a><p>Mix and match $15 worth of bin cards for $10 + shipping. Minimum $10 spend.</p></div>
  </section>
  <footer className={styles.footer}><a href="mailto:eeteecards@gmail.com">eeteecards@gmail.com</a><p>Availability and shipping confirmed before payment. <a href="/privacy">Privacy</a></p></footer>
 </div>
}
