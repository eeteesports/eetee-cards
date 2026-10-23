import {getServerSession} from 'next-auth'
import {redirect} from 'next/navigation'
import {authOptions} from '@/lib/auth'
import styles from './admin.module.css'
export const metadata={title:'Owner admin · eetee.cards',robots:{index:false,follow:false}}
export default async function AdminLayout({children}){if(!await getServerSession(authOptions))redirect('/login?callbackUrl=/admin');return <div className={styles.shell}><aside><a className={styles.brand} href="/admin">eetee.cards <small>OWNER</small></a><nav aria-label="Admin navigation"><a href="/admin">Overview</a><a href="/admin/image-reviews">⚒ Image review</a><a href="/cards">Shop all cards ↗</a><a href="/team-sets">Team bundles ↗</a><a href="/dashboard">Collection dashboard</a><a href="/admin/legacy">Legacy tools</a><a href="/">Storefront ↗</a></nav></aside><main>{children}</main></div>}
