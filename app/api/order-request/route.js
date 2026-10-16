import {NextResponse} from 'next/server'
import teams from '@/data/team-bundles.json'
import bins from '@/lib/publicCatalog'
import {quoteCart,requestEmail} from '@/lib/storefrontCart.mjs'
export async function POST(req) {
  try {
    if (Number(req.headers.get('content-length')||0)>200000) return NextResponse.json({error:'Selection too large.'},{status:413})
    const selection=await req.json()
    const quote=quoteCart({cards:bins.cards,bundles:teams.bundles},selection)
    if(!quote.meetsMinimum)return NextResponse.json({error:'Minimum $10 spend before shipping.'},{status:400})
    return NextResponse.json({totalCents:quote.totalCents,savingsCents:quote.savingsCents,mailto:requestEmail(quote)},{headers:{'Cache-Control':'no-store'}})
  }catch(e){return NextResponse.json({error:e.message||'Could not prepare your request.'},{status:400})}
}
