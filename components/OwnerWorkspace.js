'use client'
import {useEffect,useRef} from 'react'
import {useSession,signOut} from 'next-auth/react'
import {usePathname} from 'next/navigation'
import Link from 'next/link'
import styles from './OwnerWorkspace.module.css'
const workflow=[['/admin/scan','▣','Scan'],['/admin/flags','⚑','Flags'],['/admin/valuation','$','Require Valuation'],['/admin/ready','✓','Ready to List']]
const management=[['/admin/list','↗','Listings'],['/admin/bundles','▥','Bundles'],['/admin/inventory','▦','Inventory'],['/admin/analytics','◷','Analytics'],['/admin/collecting','◇','Collecting'],['/admin/buying','⌕','Buying Tools']]
const modules=[...workflow,...management]
const modulePath=path=>path.startsWith('/admin/ebay')?'/admin/list':path.startsWith('/admin/image-')||path.startsWith('/admin/card-tasks')?'/admin/flags':path.startsWith('/admin/capture')?'/admin/scan':modules.find(([href])=>path===href||path.startsWith(href+'/'))?.[0]
export default function OwnerWorkspace({children}){
 const {status}=useSession(),pathname=usePathname(),lastResult=useRef(null)
 useEffect(()=>{
  if(status!=='authenticated')return
  const poll=async()=>{if(document.hidden)return;try{const r=await fetch('/api/admin/card-tasks',{cache:'no-store'});if(!r.ok)return;const tasks=(await r.json()).tasks||[],completed=tasks.filter(t=>t.status==='completed').sort((a,b)=>b.updated_at-a.updated_at)[0],token=completed?completed.id+':'+completed.updated_at:'';if(lastResult.current!==null&&token!==lastResult.current){window.dispatchEvent(new Event('eetee-card-updated'));window.dispatchEvent(new Event('eetee-image-corrected'))}lastResult.current=token}catch{}}
  poll();const timer=setInterval(poll,30000);return()=>clearInterval(timer)
 },[status])
 const owner=status==='authenticated'&&pathname!=='/login'
 return <div className={owner?styles.shell:styles.publicShell}>{owner&&<aside key="rail" className={styles.rail}><Link className={styles.brand} href="/admin/inventory">eetee<span>OWNER WORKSPACE</span></Link><nav aria-label="Workspace modules"><p className={styles.groupLabel}>WORKFLOW</p>{workflow.map(([href,icon,label])=><Link key={href} href={href} aria-current={modulePath(pathname)===href?'page':undefined}><span aria-hidden="true">{icon}</span>{label}</Link>)}<p className={styles.groupLabel}>MANAGE & EXPLORE</p>{management.map(([href,icon,label])=><Link key={href} href={href} aria-current={modulePath(pathname)===href?'page':undefined}><span aria-hidden="true">{icon}</span>{label}</Link>)}</nav><small>Capture on iPad<br/>or eetee Scan on Mac</small><button onClick={()=>signOut({callbackUrl:'/'})}>Sign out</button></aside>}<div key="work" className={owner?styles.work:styles.publicWork}>{owner&&<header key="top" className={styles.top}><span>{modules.find(([href])=>href===modulePath(pathname))?.[2]||'Collection workspace'}</span><small>Owner mode · {pathname==='/cards'||pathname==='/team-sets'?'Browsing the buyer experience':'Private workspace'}</small><button className={styles.mobileSignOut} onClick={()=>signOut({callbackUrl:'/'})}>Sign out</button></header>}<div key="page" className={owner?styles.page:styles.publicPage}>{children}</div></div></div>
}
