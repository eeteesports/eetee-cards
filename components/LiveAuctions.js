'use client'
import {useEffect,useState} from 'react'
import {EBAY_AUCTIONS_URL} from '../lib/liveAuctions.mjs'
import {trackShop} from '../lib/storefrontAnalytics.mjs'
import styles from './LiveAuctions.module.css'
const dollars=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v)
const endTime=v=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(v))
export default function LiveAuctions(){
 const[data,setData]=useState(null),[now,setNow]=useState(0)
 useEffect(()=>{let active=true;const controller=new AbortController();async function load(){try{const r=await fetch('/api/auctions',{cache:'no-store',signal:controller.signal});const d=await r.json();if(active){setData(d);setNow(Date.now())}}catch{if(active)setData({unavailable:true,items:[]})}}load();const timer=setInterval(()=>{setNow(Date.now());load()},60000);return()=>{active=false;controller.abort();clearInterval(timer)}},[])
 const items=(data?.items||[]).filter(i=>Date.parse(i.endsAt)>now)
 return <section className={styles.section} aria-labelledby="auctions-title"><header><div><p className={styles.eyebrow}>On eBay</p><h2 id="auctions-title">Current auctions</h2><p>Bid on these cards directly on eBay.</p></div><a href={EBAY_AUCTIONS_URL} target="_blank" rel="noopener noreferrer" onClick={()=>trackShop('ebay_store_click',{placement:'home_auctions'})}>View all eBay auctions ↗</a></header>
 {!data?<p className={styles.message} role="status">Loading current auctions…</p>:!items.length?<p className={styles.message}>{data.unavailable?'Auction details are temporarily unavailable. View current listings on eBay.':'No card auctions are live right now. Check back soon or browse our eBay listings.'}</p>:<><div className={styles.grid}>{items.map(i=><a className={styles.auction} key={i.id} href={i.url} target="_blank" rel="noopener noreferrer" onClick={()=>trackShop('ebay_auction_click',{item_id:i.id,placement:'homepage'})}><div className={styles.photo}><img src={i.image} alt={i.title} loading="lazy"/></div><div className={styles.body}><h3>{i.title}</h3><div className={styles.bid}><div><span>{i.bidCount===0?'Starting bid':'Current bid'}</span><strong>{dollars(i.currentBid)}</strong></div>{i.bidCount!==null&&<span>{i.bidCount} {i.bidCount===1?'bid':'bids'}</span>}</div><p className={styles.ending}>Ends <time dateTime={i.endsAt}>{endTime(i.endsAt)}</time></p><span className={styles.cta}>View auction on eBay ↗</span></div></a>)}</div><p className={styles.note}>Updates about every minute. Bids and availability can change; eBay has the latest details.{data.updatedAt&&` Last checked ${new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York',timeZoneName:'short'}).format(new Date(data.updatedAt))}.`}</p></>}
 </section>
}
