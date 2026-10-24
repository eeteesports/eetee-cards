import {getTurso} from '@/lib/db'
import {initializeImageReviews,reviewCard} from '@/lib/imageReviewStore'
import {currentImage} from '@/lib/imageCorrections.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request,{params}){
 const {cardId,side}=params,card=reviewCard(cardId)
 if(!['front','back'].includes(side)||!card?.[side])return new Response(null,{status:404})
 try{await initializeImageReviews();const image=await currentImage(getTurso(),cardId,side)
 if(image)return new Response(Buffer.from(image.output_bytes,'base64'),{headers:{'Content-Type':'image/webp','Cache-Control':'public, max-age=0, must-revalidate',ETag:`"${image.id}"`,'X-Content-Type-Options':'nosniff'}})
 }catch{ /* Preserve access to the original if correction storage is unavailable. */ }
 return Response.redirect(new URL(card[side],request.url),307)
}
