import { fetchEbayComps } from '@/lib/ebay'

export async function GET() {
  try {
    const result = await fetchEbayComps('Patrick Mahomes', '2020', 'Prizm', null, null, null, null)
    return Response.json({
      appIdPresent:  !!process.env.EBAY_APP_ID,
      certIdPresent: !!process.env.EBAY_CERT_ID,
      dataType:      result.dataType,
      keywords:      result.keywords,
      itemCount:     result.items.length,
      firstItem:     result.items[0] || null,
      error:         result.error || null,
    })
  } catch (err) {
    return Response.json({ error: err.message })
  }
}
