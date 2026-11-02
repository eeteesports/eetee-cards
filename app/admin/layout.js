import {getServerSession} from 'next-auth'
import {redirect} from 'next/navigation'
import {authOptions} from '@/lib/auth'
import styles from './admin.module.css'
export const metadata={title:'Owner admin · eetee.cards',robots:{index:false,follow:false}}
export default async function AdminLayout({children}){if(!await getServerSession(authOptions))redirect('/login?callbackUrl=/admin');return <div className={styles.content}>{children}</div>}
