'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import styles from './IntakeQueue.module.css'
const stages=[['scan','Processing','/admin/scan/processing'],['flags','Flags','/admin/flags'],['valuation','Require Valuation','/admin/valuation'],['ready','Ready to List','/admin/ready']]
export default function IntakeOverview(){
 const [data,setData]=useState(null),[error,setError]=useState('')
 useEffect(()=>{let active=true;fetch('/api/admin/intake',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(active)setData(d)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[])
 const batches=new Map()
 for(const c of data?.cards||[]){if(c.stage==='excluded')continue;const name=c.batch||'Unassigned batch';if(!batches.has(name))batches.set(name,{scan:0,flags:0,valuation:0,ready:0});batches.get(name)[c.stage]++}
 return <section className={styles.page} aria-label="Intake pipeline"><h2>Intake pipeline</h2><nav>{stages.map(([key,label,url])=><Link key={key} href={url}>{label} <b>{data?.counts[key]??'—'}</b></Link>)}</nav>{error&&<p role="alert">{error}</p>}<p>Each card moves independently. Older cards without processing evidence remain in Flags until reconciled.</p><details><summary>Batch progress · {batches.size} batches</summary><div className={styles.table}><table><thead><tr><th>Batch</th>{stages.map(([key,label])=><th key={key}>{label}</th>)}</tr></thead><tbody>{[...batches].sort(([a],[b])=>b.localeCompare(a)).map(([name,counts])=><tr key={name}><th>{name}</th>{stages.map(([key,,url])=><td key={key}><Link href={url+'?batch='+encodeURIComponent(name)}>{counts[key]}</Link></td>)}</tr>)}</tbody></table></div></details></section>
}
