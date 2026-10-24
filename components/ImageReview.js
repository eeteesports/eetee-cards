 'use client'
import {useSession,signOut} from 'next-auth/react'
import styles from './ImageReview.module.css'
export function OwnerBar(){const {status}=useSession();return status==='authenticated'?<div className={styles.bar}><strong>Owner mode</strong><a href="/admin">Admin</a><a href="/admin/analytics">Analytics</a><a href="/admin/image-reviews">Image requests</a><button onClick={()=>signOut({callbackUrl:'/'})}>Sign out</button></div>:null}
export default function ReviewableImage({card,side='front',children,onSaved}){
 const {status}=useSession();const player=card.player||card.fields?.Player||'card'
 return <div className={styles.image} data-fix-card-surface="true">{children}{status==='authenticated'&&<button type="button" className={styles.tool} aria-label={`Fix Card: ${player}`} title="Fix card images and attributes" onClick={e=>{e.preventDefault();e.stopPropagation();window.dispatchEvent(new CustomEvent('eetee-open-fix-card',{detail:{cardId:card.id,side,onSaved}}))}}>⚒<span>Fix Card</span></button>}</div>
}
