'use client'
import ReviewableImage from './ImageReview'
import {useEffect,useMemo,useState} from 'react'
import styles from './TeamBundles.module.css'
import {bundleStats} from '../lib/bundleStats.mjs'
import InlineCardBadges from './InlineCardBadges'
import {cardSetLabel} from '../lib/cardLabels.mjs'
import teamLogos from '../data/team-logos.json'
import leagues from '../data/league-logos.json'
import {trackShop,analyticsItem} from '../lib/storefrontAnalytics.mjs'
export default function TeamBundles({inventory,onAddBundle,onShowCart,cartCount,selectedBundles=[]}){
 const[team,setTeam]=useState(''),[open,setOpen]=useState(null),[back,setBack]=useState(false)
 useEffect(()=>{if(open)document.getElementById('bundle-contents')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})},[open])
 useEffect(()=>{if(team)document.getElementById('team-results')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})},[team])
 const bundles=useMemo(()=>inventory.bundles.filter(b=>b.team===team),[inventory,team])
 const counts=useMemo(()=>Object.fromEntries(inventory.teams.map(t=>[t,inventory.bundles.filter(b=>b.team===t).length])),[inventory])
 function choose(t){trackShop('select_team',{team:t,league:'NFL',available_sets:counts[t]});setTeam(t);setOpen(null);setBack(false)}
 useEffect(()=>{if(team&&bundles.length)trackShop('view_item_list',{item_list_id:'team_sets',item_list_name:team+' team sets',team,league:'NFL',items:bundles.map(b=>analyticsItem(b,'bundle'))})},[team,bundles])
 return <div className={styles.site}>
  <header className={styles.header}><a href="/" className={styles.brand}><img src="/eetee-logo.png" alt=""/><span>eetee.cards</span></a><nav className={styles.headerNav} aria-label="Main navigation"><a href="/team-sets">Team Sets</a><a href="/cards">Shop All Cards</a><button onClick={onShowCart}>Cart ({cartCount})</button></nav></header>
  <section className={styles.hero} aria-labelledby="home-title"><img className={styles.heroLogo} src="/eetee-logo.png" alt="eetee alien" width="200" height="225"/><h1 id="home-title">eetee.cards</h1><p className={styles.heroDescription}>Team sets & individual cards</p><p className={styles.collectionNote}><span/>NFL cards available now. More leagues and teams coming soon.</p><p className={styles.uploadNote}>The rest of the collection is being scanned, inventoried, and uploaded.</p></section>
  <section id="leagues" className={styles.leagues} aria-labelledby="league-title"><h2 id="league-title">Shop by league</h2><div className={styles.leagueGrid}>{leagues.map(league=>league.available?<a key={league.name} className={`${styles.leagueTile} ${styles.activeLeague}`} href="#team-selector" onClick={()=>trackShop('select_league',{league:'NFL'})} aria-label="NFL — shop available team sets"><span className={styles.leagueStatus}>Available now</span><img src={league.logo} alt="" width="64" height="64"/><strong>{league.name}</strong></a>:<button key={league.name} className={`${styles.leagueTile} ${styles.futureLeague}`} disabled aria-label={`${league.name} — coming soon`}><span className={styles.leagueStatus}>Coming Soon</span><img src={league.logo} alt="" width="64" height="64"/><strong>{league.name}</strong></button>)}</div></section>
  <section id="bundles" className={styles.shop}>
   <div className={styles.sectionHeading}><div><h2 className={styles.mainTitle}>NFL team sets</h2><p className={styles.plainIntro}>$20.00 per set + shipping. $30+ in value. No duplicates within a set.</p></div></div>
   <section id="team-selector" aria-labelledby="team-selector-title" className={styles.logoPicker}>
    <div className={styles.pickerHeading}><h2 id="team-selector-title">Select a team</h2><span>{inventory.bundles.length} sets across {inventory.teams.filter(t=>counts[t]).length} teams</span></div>
    <div className={styles.teamLogoGrid}>{inventory.teams.map(t=><button key={t} className={`${styles.teamTile} ${team===t?styles.selectedTeam:''} ${!counts[t]?styles.unavailableTeam:''}`} aria-label={`${t}, ${counts[t]} team ${counts[t]===1?'set':'sets'}`} aria-pressed={team===t} aria-controls="team-results" onClick={()=>choose(t)}><img src={teamLogos[t].logo} alt="" width="72" height="64"/><span className={styles.teamName}>{t}</span><span className={styles.teamSetCount}>{counts[t]} team {counts[t]===1?'set':'sets'}</span></button>)}</div>
   </section>
   <div id="team-results" className={styles.teamResults}>

   {!team?<p className={styles.selectPrompt}>Select a team to see its available sets and complete card lists.</p>:!bundles.length?<div className={styles.pickPrompt}><h2>No {team} sets available yet.</h2><p>More sets will be added as inventory allows.</p><a href="/bins">Browse individual cards in the bins →</a></div>:<>
   <div className={styles.teamHeading}><div><h2>{team}</h2><a className={styles.changeTeam} href="#team-selector">Choose another team ↑</a></div><span>Each set contains the exact cards shown in its full list.</span></div>
   <div className={styles.bundleGrid}>{bundles.map(bundle=>{const stats=bundleStats(bundle.cards);const showcase=Array.from(new Map(bundle.cards.map(c=>[c.player,c])).values()).slice(0,6);return <article className={styles.bundle} key={bundle.id}>
    <div className={styles.previewLabel}><h3>{bundle.name}</h3><span>Preview: {showcase.length} of {bundle.cards.length} cards</span></div>
    <div className={styles.bundlePhotos}>{showcase.map(c=><div key={c.id}><ReviewableImage card={c}><img src={c.front} alt={`${c.year} ${c.set} ${c.player}`} loading="lazy"/></ReviewableImage></div>)}</div>
    <button className={styles.allCardsButton} aria-expanded={open===bundle.id} onClick={()=>{if(open!==bundle.id){trackShop('select_item',{item_list_id:'team_sets',items:[analyticsItem(bundle,'bundle')]});trackShop('view_item',{currency:'USD',value:20,items:[analyticsItem(bundle,'bundle')]})}setOpen(open===bundle.id?null:bundle.id);setBack(false)}}>{open===bundle.id?'Hide full card list':`View all ${bundle.cards.length} cards — fronts & backs`} <span>{open===bundle.id?'−':'→'}</span></button>
    <div className={styles.bundleBody}><dl className={styles.bundleStats}><div className={styles.prominentStat}><dt>Cards</dt><dd>{bundle.cards.length}</dd></div><div className={styles.prominentStat}><dt>Players</dt><dd>{bundle.playerCount}</dd></div><div><dt>Rookie Cards</dt><dd>{stats.rookies}</dd></div><div><dt>Inserts</dt><dd>{stats.inserts}</dd></div><div><dt>Parallels</dt><dd>{stats.parallels}</dd></div><div><dt>Vintage (Pre-2000)</dt><dd>{stats.vintage}</dd></div></dl><div className={styles.value}><strong>$30+ in value in each set!</strong></div><div className={styles.price}><strong>$20.00</strong><span>+ shipping</span></div><button className={styles.request} onClick={()=>onAddBundle(bundle.id)} disabled={selectedBundles.includes(bundle.id)}>{selectedBundles.includes(bundle.id)?'Added to your selection':'Add team set'} <span>＋</span></button><small>{bundle.id}</small></div>
   </article>})}</div>
   {open&&(()=>{const bundle=bundles.find(b=>b.id===open);if(!bundle)return null;return <section id="bundle-contents" className={styles.contents} aria-label={`${bundle.name} contents`}><div className={styles.contentsHeading}><div><h3>{team} · {bundle.name}</h3><p>All {bundle.cards.length} cards in this set · $20.00 + shipping</p></div><button aria-pressed={back} onClick={()=>{trackShop('view_card_side',{card_side:back?'front':'back',item_list_id:bundle.id});setBack(b=>!b)}}>{back?'Show fronts':'Show backs'}</button></div><div className={styles.cardGrid}>{bundle.cards.map(c=><article key={c.id}><ReviewableImage card={c} side={back?'back':'front'}><a href={back?c.back:c.front} target="_blank" rel="noreferrer" aria-label={`Enlarge ${c.player} card`}><img src={back?c.back:c.front} alt={`${c.year} ${c.set} ${c.player}, ${back?'back':'front'}`} loading="lazy"/></a></ReviewableImage><h4>{c.player}</h4><InlineCardBadges card={c}/><p>{cardSetLabel(c)} · #{c.number}</p><p>{[c.family,c.parallel,c.serial].filter(Boolean).join(' · ')}</p></article>)}</div><button className={styles.request} onClick={()=>onAddBundle(bundle.id)} disabled={selectedBundles.includes(bundle.id)}>{selectedBundles.includes(bundle.id)?'Added to your selection':`Add ${bundle.name} · $20.00 + shipping`}</button></section>})()}
   </>}
   </div>
  </section>
  <section id="price-bins" className={styles.priceBins} aria-labelledby="price-title"><div className={styles.priceHeading}><h2 id="price-title">Shop by price</h2><p>Mix and match $15 worth of cards from the 50¢ and $1 bins for $10 + shipping.</p><span>Minimum $10 spend before shipping.</span></div><div className={styles.priceGrid}>{[{label:'$0.50 bin',href:'/bins?tier=50',tier:'50'},{label:'$1 bin',href:'/bins?tier=100',tier:'100'},{label:'Shop All Cards',href:'/cards',tier:'all'}].map(bin=><a key={bin.label} href={bin.href} onClick={()=>trackShop('select_bin',{bin:bin.tier})} className={styles.priceTile}><strong>{bin.label}</strong><span>Browse cards →</span></a>)}</div></section>

  <footer className={styles.footer}><a href="mailto:eeteecards@gmail.com">eeteecards@gmail.com</a><p>Availability and shipping confirmed before payment. <a href="/privacy">Privacy</a> <a href="/login?callbackUrl=/admin">Owner login</a></p></footer>
 </div>
}
