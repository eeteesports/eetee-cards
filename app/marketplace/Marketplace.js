'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import Image from 'next/image'
import styles from './marketplace.module.css'

const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
const labels = { single: 'Single', bundle: 'Card bundle', dollar: '$1 & under', fifty: '50¢ bin' }
const setLabel = c => c.brand && !c.set?.toLowerCase().startsWith(c.brand.toLowerCase()) ? `${c.brand} ${c.set}` : c.set
const details = c => [c.card_name !== 'Base' && c.card_name, c.edition, c.card_level, c.parallel, c.serial_number && `#${c.serial_number}`].filter(Boolean).join(' · ') || (c.card_name === 'Base' ? 'Base' : 'See card photos')
function Photo({ card, side = 'f', priority = false, full = false, ...props }) {
  const src = side === 'b' ? card.back_image : full || priority ? card.front_image : card.thumbnail
  return <Image src={src || `/marketplace-cards/${card.copy_id}-${side}.jpg`} alt={`${card.player} ${card.season} ${card.set}, ${side === 'f' ? 'front' : 'back'}`} width={900} height={1200} unoptimized priority={priority} {...props} />
}

export default function Marketplace({ listings, summary }) {
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('featured')
  const [rookies, setRookies] = useState(false)
  const [sport, setSport] = useState('all')
  const [team, setTeam] = useState('all')
  const [limit, setLimit] = useState(72)
  const sports = useMemo(() => [...new Set(listings.flatMap(l => l.cards.map(c => c.sport)))].filter(Boolean).sort(), [listings])
  const teams = useMemo(() => [...new Set(listings.flatMap(l => l.cards.filter(c => sport === 'all' || c.sport === sport).flatMap(c => c.teams || [])))].sort(), [listings, sport])
  const [selected, setSelected] = useState(null)
  const [member, setMember] = useState(0)
  const [side, setSide] = useState('f')
  const [bag, setBag] = useState([])
  const [showBag, setShowBag] = useState(false)
  const dialog = useRef(null)
  const bagDialog = useRef(null)
  const results = useRef(null)
  const featured = listings.find(l => l.cards[0].copy_id === 'B20260909-034') || listings[0]
  const [announcement, setAnnouncement] = useState('')
  const filters = [['all', 'All finds'], ['single', 'Singles'], ['bundle', 'Bundles'], ['dollar', '$1 & under'], ['fifty', '50¢ bin']]
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const items = listings.filter(l => (category === 'all' || l.kind === category) && (sport === 'all' || l.cards.some(c => c.sport === sport)) && (team === 'all' || l.cards.some(c => (c.teams || []).includes(team))) && (!rookies || l.cards.every(c => c.rookie)) && (!q || [l.title, ...l.cards.flatMap(c => [c.player,c.season,c.brand,c.set,details(c),c.card_number, ...(c.teams || [])])].join(' ').toLowerCase().includes(q)))
    if (sort === 'low') items.sort((a,b) => a.price - b.price)
    if (sort === 'high') items.sort((a,b) => b.price - a.price)
    if (sort === 'name') items.sort((a,b) => a.title.localeCompare(b.title))
    return items
  }, [listings, category, query, sort, rookies, sport, team])
  useEffect(() => { setLimit(72) }, [category, query, sort, rookies, sport, team])
  useEffect(() => { if (selected) dialog.current?.showModal() }, [selected])
  useEffect(() => { if (showBag) bagDialog.current?.showModal() }, [showBag])
  function open(item) { setMember(0); setSide('f'); setSelected(item) }
  function add(item) {
    if (!bag.some(l => l.id === item.id)) setBag(prev => [...prev, item])
    setAnnouncement(`${item.title} added to your preview bag.`)
  }
  function browse(kind) { setCategory(kind); setQuery(''); setRookies(false); setSport('all'); setTeam('all'); results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  const activeCard = selected?.cards[member]
  return <div className={styles.market}>
    <div className={styles.preview}>PRIVATE STOREFRONT PREVIEW <span>Try the shop. Checkout is paused.</span><a href="/dashboard">Back to admin ↗</a></div>
    <header className={styles.header}>
      <a href="/marketplace" className={styles.brand}><img src="/eetee-logo.png" alt="" /><span>eetee<span className={styles.brandSub}>CARDS & COLLECTIBLES</span></span></a>
      <nav aria-label="Shop categories"><button onClick={() => browse('single')}>Singles</button><button onClick={() => browse('bundle')}>Bundles</button><button onClick={() => browse('dollar')}>The dollar bin</button></nav>
      <button className={styles.bagButton} onClick={() => setShowBag(true)}>Bag <span>{bag.length}</span></button>
    </header>
    <main>
      <section className={styles.hero}>
        <div className={styles.heroCopy}><div className={styles.eyebrow}>THE COLLECTION / VOL. 02</div><h1>For the love<br />of the <em>find.</em></h1><p>Seattle favorites. New teams. Old-school gems. Explore singles, build a player stack, or find something good for pocket change.</p><div className={styles.heroActions}><button className={styles.primary} onClick={() => browse('all')}>Explore the collection <span>↗</span></button><button className={styles.textButton} onClick={() => browse('bundle')}>Find your player →</button></div><div className={styles.collectionStats}><strong>{summary.offered_cards.toLocaleString()} cards</strong><span>{listings.length.toLocaleString()} ways to find your next favorite</span></div><div className={styles.heroNote}><span>✳</span> Actual card photos. Front and back. Every listing.</div></div>
        <button className={styles.heroArt} onClick={() => open(featured)} aria-label="View Elijah Arroyo autograph card">
          <div className={styles.heroOrbit}/><div className={styles.heroCardBack}><Photo card={listings.find(l => l.cards.some(c => c.copy_id==='B20260909-021')).cards[0]} priority /></div><div className={styles.heroCardFront}><Photo card={featured.cards[0]} priority /></div><div className={styles.heroSticker}>ROOKIE AUTO<br /><strong>63 / 75</strong></div><div className={styles.heroCaption}><span>IN THE SPOTLIGHT<br /><strong>Elijah Arroyo · Purple Lava</strong></span><b>{money(featured.price)} ↗</b></div>
        </button>
      </section>
      <section className={styles.lanes} aria-label="Ways to collect">
        <button onClick={() => browse('single')}><span className={styles.laneNum}>01</span><div><h2>One worth picking.</h2><p>Singles with a little something extra.</p></div><span>↗</span></button>
        <button onClick={() => browse('bundle')}><span className={styles.laneNum}>02</span><div><h2>More of your favorites.</h2><p>Player stacks and team mixes. Every card shown.</p></div><span>↗</span></button>
        <button onClick={() => browse('dollar')}><span className={styles.laneNum}>03</span><div><h2>The good old dollar bin.</h2><p>Small prices. Plenty to dig through.</p></div><span>↗</span></button>
      </section>
      <section className={styles.catalog} ref={results}>
        <div className={styles.catalogHeading}><div><div className={styles.eyebrow}>TAKE A LOOK AROUND</div><h2>Your next find is in here.</h2></div><span>Football · Baseball · Basketball · More</span></div>
        <div className={styles.controls}><div className={styles.tabs} role="group" aria-label="Listing type">{filters.map(([id,label]) => <button key={id} aria-pressed={category === id} className={category === id ? styles.active : ''} onClick={() => setCategory(id)}>{label}<span>{id === 'all' ? listings.length : listings.filter(l=>l.kind===id).length}</span></button>)}</div><div className={styles.searchRow}><input aria-label="Search cards" placeholder="Search a player, set, or parallel…" value={query} onChange={e=>setQuery(e.target.value)} type="search"/><select aria-label="Filter by sport" value={sport} onChange={e=>{setSport(e.target.value);setTeam('all')}}><option value="all">Every sport</option>{sports.map(s=><option key={s} value={s}>{s}</option>)}</select><select className={styles.teamSelect} aria-label="Filter by team" value={team} onChange={e=>setTeam(e.target.value)}><option value="all">Every team</option>{teams.map(t=><option key={t} value={t}>{t}</option>)}</select><label className={styles.rookieToggle}><input type="checkbox" checked={rookies} onChange={e=>setRookies(e.target.checked)}/> Rookies only</label><select aria-label="Sort listings" value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Featured first</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="name">Player / name</option></select></div></div>
        <div className={styles.resultCount} aria-live="polite">{shown.length} {shown.length===1?'listing':'listings'}{category==='dollar'?' · $1 or less per card. Pick the exact cards you like.':''}{category==='fifty'?' · 50¢ per card. Small prices, real finds.':''}{category==='bundle'?' · Each bundle includes all the cards pictured.':''}</div>
        {shown.length ? <div className={styles.grid}>{shown.slice(0,limit).map(item => <article className={styles.product} key={item.id}>
          <button className={`${styles.productImage} ${item.kind==='bundle'?styles.bundleImage:''}`} onClick={() => open(item)} aria-label={`View ${item.title}`}>
            <span className={styles.badge}>{item.kind==='bundle'?`${item.cards.length}-CARD BUNDLE`:item.cards[0].grading_status==='Graded'?'GRADED':item.cards[0].autograph?'AUTOGRAPH':item.cards[0].serial_number?'NUMBERED':item.kind==='fifty'?'50¢ FIND':item.kind==='dollar'?'$1 & UNDER':item.cards[0].rookie?'ROOKIE':'SINGLE'}</span>
            {item.kind==='bundle' ? item.cards.slice(0,3).map((c,i)=><Photo card={c} key={c.copy_id} className={styles[`fan${i}`]}/>) : <Photo card={item.cards[0]}/>}
            <span className={styles.viewPhoto}>{item.kind==='bundle'?'See every card':'View front & back'} ↗</span>
          </button>
          <div className={styles.productInfo}><div className={styles.productMeta}>{item.kind==='bundle'?'THE BUNDLE COLLECTION':`${item.cards[0].season} ${setLabel(item.cards[0])}`}</div><button className={styles.productTitle} onClick={()=>open(item)}>{item.title}</button><p>{item.kind==='bundle'?item.description:details(item.cards[0])}</p><div className={styles.priceRow}><strong>{money(item.price)}</strong><button onClick={()=>add(item)} aria-label={`Add ${item.title} to preview bag`} disabled={bag.some(l=>l.id===item.id)}>{bag.some(l=>l.id===item.id)?'Added ✓':'+ Bag'}</button></div></div>
        </article>)}</div>:<div className={styles.empty}><span>✳</span><h3>{'No finds match these filters.'}</h3><p>{'Try another player, team, or set—or clear your filters.'}</p><button className={styles.primary} onClick={()=>browse('all')}>Show all cards →</button></div>}
        {shown.length > limit && <div className={styles.loadMore}><p>Showing {Math.min(limit,shown.length)} of {shown.length.toLocaleString()} listings</p><button className={styles.primary} onClick={()=>setLimit(n=>n+72)}>Show more finds ↓</button></div>}
      </section>
      <section className={styles.bottomNote}><span>COLLECT WHAT YOU LOVE.</span><h2>A favorite player. A missing rookie.<br />A card that just looks good.</h2><p>There’s no wrong reason to start a stack.</p></section>
    </main>
    <footer className={styles.footer}><strong>eetee Cards</strong><span>From my collection to your next find.</span><span>Preview · Orders are not being accepted</span></footer>
    <div className={styles.srOnly} role="status">{announcement}</div>
    <dialog ref={dialog} aria-labelledby="listing-title" className={styles.dialog} onClose={()=>setSelected(null)} onClick={e=>{if(e.target===dialog.current)dialog.current.close()}}>
      {selected && <><button className={styles.close} onClick={()=>dialog.current.close()} aria-label="Close card details">×</button><div className={styles.detailLayout}><div className={styles.detailPhoto}><Photo card={activeCard} side={side} full/><div className={styles.sideSwitch}><button aria-pressed={side==='f'} onClick={()=>setSide('f')}>Front</button><button aria-pressed={side==='b'} onClick={()=>setSide('b')}>Back</button></div><span className={styles.photoNote}>Actual card · {activeCard.copy_id}</span></div><div className={styles.detailCopy}><div className={styles.eyebrow}>{labels[selected.kind]}{selected.kind==='bundle'?` · ${selected.cards.length} cards`:''}</div><h2 id="listing-title">{selected.title}</h2><div className={styles.detailPrice}>{money(selected.price)}</div><p>{selected.kind==='bundle'?selected.description:`${activeCard.season} ${setLabel(activeCard)} · ${details(activeCard)}`}</p><p className={styles.condition}>{activeCard.grading_status==='Graded' ? `Graded${activeCard.grading_company ? ` by ${activeCard.grading_company}` : ''}${activeCard.condition_grade ? ` · ${activeCard.condition_grade}` : ''}. See the slab label and both photos.` : 'Raw card. Inspect both photos for condition.'} You’re viewing the exact {selected.kind==='bundle'?'cards included in this bundle':'card offered'}.</p><button className={styles.primary} onClick={()=>add(selected)} disabled={bag.some(l=>l.id===selected.id)}>{bag.some(l=>l.id===selected.id)?'In your preview bag ✓':'Add to preview bag'}</button><div className={styles.checkoutNote}>Preview only. Checkout is paused.</div>
        {selected.kind==='bundle'?<div className={styles.memberList}><h3>Everything in this bundle</h3><p>Select a card to inspect its front and back.</p>{selected.cards.map((c,i)=><button key={c.copy_id} aria-pressed={member===i} onClick={()=>{setMember(i);setSide('f')}}><Photo card={c}/><span><strong>{c.season} {setLabel(c)}</strong><small>{c.player}{c.card_number ? ` · #${c.card_number}` : ''}</small><small>{details(c)}</small></span><b>↗</b></button>)}</div>:<dl className={styles.attributes}>{[['Sport',activeCard.sport],['Team',(activeCard.teams||[]).join(' / ')],['Season',activeCard.season],['Set',setLabel(activeCard)],['Card',activeCard.card_name],['Parallel',activeCard.parallel],['Edition / level',[activeCard.edition,activeCard.card_level].filter(Boolean).join(' · ')],['Card number',activeCard.card_number],['Serial number',activeCard.serial_number],['Rookie',activeCard.rookie?'Yes':null]].filter(([,v])=>v).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
      </div></div></>}
    </dialog>
    <dialog ref={bagDialog} aria-labelledby="bag-title" className={`${styles.dialog} ${styles.bagDialog}`} onClose={()=>setShowBag(false)}><button className={styles.close} onClick={()=>bagDialog.current.close()} aria-label="Close bag">×</button><div className={styles.eyebrow}>YOUR NEXT FINDS</div><h2 id="bag-title">Your preview bag</h2><p>This is a shopping preview. Nothing is reserved or ordered.</p>{bag.length?bag.map(item=><div className={styles.bagItem} key={item.id}><Photo card={item.cards[0]}/><div><strong>{item.title}</strong><small>{item.cards.length} {item.cards.length===1?'card':'cards'} · {money(item.price)}</small><button onClick={()=>setBag(bag.filter(l=>l.id!==item.id))}>Remove</button></div></div>):<div className={styles.bagEmpty}>Your next find is waiting. Add a single or a whole bundle.</div>}<div className={styles.bagTotal}><span>Subtotal</span><strong>{money(bag.reduce((sum,l)=>sum+l.price,0))}</strong></div><small>Shipping and tax are not calculated in this preview.</small><button className={styles.primary} disabled>Checkout opens later</button><button className={styles.textButton} onClick={()=>bagDialog.current.close()}>Keep exploring →</button></dialog>
  </div>
}
