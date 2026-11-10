import CaptureDesk from '../capture/CaptureDesk'
import Link from 'next/link'
export default function Page(){return <><p style={{padding:'12px 28px'}}><Link href='/admin/scan/processing'>View cards being processed →</Link> · Physical scanner capture remains available in eetee Scan on your Mac.</p><CaptureDesk/></>}
