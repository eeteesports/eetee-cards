'use client'
import {useEffect,useRef} from 'react'
import {useSession,signOut} from 'next-auth/react'
import {usePathname} from 'next/navigation'
import Link from 'next/link'
import styles from './OwnerWorkspace.module.css'
const modules=[['/admin/inventory','▦','Inventory'],['/admin/card-tasks','⚒','Fix queue'],['/admin/image-reviews','▧','Image review'],['/admin/image-audit','⌕','Image scan'],['/admin/analytics','↗','Analytics'],['/cards','◇','Buyer view'],['/team-sets','▥','Team bundles'],['/admin/legacy','⚙','More tools']]
export default function OwnerWorkspace({children}){
 const {status}=useSession(),pathname=usePathname(),lastResult=useRef(null)
 useEffect(()=>{
  if(status!=='authenticated')return
  const poll=async()=>{if(document.hidden)return;try{const r=await fetch('/api/admin/card-tasks',{cache:'no-store'});if(!r.ok)return;const tasks=(await r.json()).tasks||[],completed=tasks.filter(t=>t.status==='completed').sort((a,b)=>b.updated_at-a.updated_at)[0],token=completed?completed.id+':'+completed.updated_at:'';if(lastResult.current!==null&&token!==lastResult.current){window.dispatchEvent(new Event('eetee-card-updated'));window.dispatchEvent(new Event('eetee-image-corrected'))}lastResult.current=token}catch{}}
  poll();const timer=setInterval(poll,30000);return()=>clearInterval(timer)
 },[status])
 const owner=status==='authenticated'&&pathname!=='/login'
 return <div className={owner?styles.shell:styles.publicShell}>{owner&&<aside key="rail" className={styles.rail}><Link className={styles.brand} href="/admin/inventory">eetee<span>OWNER WORKSPACE</span></Link><nav aria-label="Workspace modules">{modules.map(([href,icon,label])=><Link key={href} href={href} aria-current={pathname===href?'page':undefined}><span aria-hidden="true">{icon}</span>{label}</Link>)}</nav><small>Capture new cards<br/>in eetee Scan on Mac</small><button onClick={()=>signOut({callbackUrl:'/'})}>Sign out</button></aside>}<div key="work" className={owner?styles.work:styles.publicWork}>{owner&&<header key="top" className={styles.top}><span>{modules.find(([href])=>href===pathname)?.[2]||'Collection workspace'}</span><small>Owner mode · {pathname==='/cards'||pathname==='/team-sets'?'Browsing the buyer experience':'Private workspace'}</small><button className={styles.mobileSignOut} onClick={()=>signOut({callbackUrl:'/'})}>Sign out</button></header>}<div key="page" className={owner?styles.page:styles.publicPage}>{children}</div></div></div>
}
