import {randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {correctCardImage,ImageNeedsReview} from './cardImageProcessor.mjs'
export async function originalCatalogImage(url,sourceRoot=path.join(process.cwd(),'public')){
 if(!new RegExp('^[/]team-bundles[/][a-f0-9]{16}-(front|back)[.]webp$').test(url))throw Error('Unknown catalog image.')
 try{return await readFile(path.join(sourceRoot,url.slice(1)))}catch(e){if(e.code!=='ENOENT')throw e}
 const r=await fetch(new URL(url,'https://eetee.cards'),{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Original image unavailable.');const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>8000000)throw Error('Original is too large.');return bytes
}
export async function initializeCorrections(db){
 await db.batch([
 `CREATE TABLE IF NOT EXISTS storefront_image_versions(id TEXT PRIMARY KEY,review_id TEXT NOT NULL,request_version INTEGER NOT NULL,source_revision TEXT,source_url TEXT NOT NULL,source_bytes TEXT NOT NULL,output_bytes TEXT NOT NULL,summary TEXT NOT NULL,created_at INTEGER NOT NULL,processor TEXT NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS storefront_image_versions_review ON storefront_image_versions(review_id,created_at)`,
 `CREATE TABLE IF NOT EXISTS storefront_image_current(image_key TEXT PRIMARY KEY,card_id TEXT NOT NULL,side TEXT NOT NULL,revision_id TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS storefront_image_processing(review_id TEXT PRIMARY KEY,request_version INTEGER NOT NULL,token TEXT NOT NULL,started_at INTEGER NOT NULL,message TEXT NOT NULL)`],'write')
}
export async function activeImages(db){return (await db.execute('SELECT card_id,side,revision_id FROM storefront_image_current')).rows}
export function correctedImageUrl(cardId,side,revision){return `/api/card-images/${cardId}/${side}?v=${revision}`}
export async function currentImage(db,cardId,side){const {rows}=await db.execute({sql:'SELECT v.* FROM storefront_image_current c JOIN storefront_image_versions v ON v.id=c.revision_id WHERE c.image_key=?',args:[cardId+':'+side]});return rows[0]||null}
export async function processImageRequest(db,review,card,{sourceRoot=path.join(process.cwd(),'public')}={}){
 const id=review.id,version=Number(review.updated_at),token=randomUUID(),now=Date.now(),side=review.side
 if(!card||!['front','back'].includes(side)||!/^\/team-bundles\/[a-f0-9]{16}-(front|back)\.webp$/.test(card[side]||''))throw Error('Unknown source image.')
 // A persisted claim prevents duplicate processors or stale tabs from publishing over a newer request.
 const claim=await db.execute({sql:`INSERT INTO storefront_image_processing(review_id,request_version,token,started_at,message) VALUES(?,?,?,?,'Processing') ON CONFLICT(review_id) DO UPDATE SET request_version=excluded.request_version,token=excluded.token,started_at=excluded.started_at,message='Processing' WHERE (storefront_image_processing.request_version!=excluded.request_version OR storefront_image_processing.started_at<?) AND EXISTS(SELECT 1 FROM storefront_image_reviews WHERE id=? AND updated_at=?)`,args:[id,version,token,now,now-120000,id,version]})
 if(!claim.rowsAffected)return {status:'processing',message:'This image is already being processed.'}
 const started=await db.execute({sql:"UPDATE storefront_image_reviews SET status='processing' WHERE id=? AND updated_at=? AND status IN ('open','failed','needs_review','done')",args:[id,version]})
 if(!started.rowsAffected){await db.execute({sql:'DELETE FROM storefront_image_processing WHERE review_id=? AND token=?',args:[id,token]});return {status:'stale',message:'This request changed. Refresh to see its current result.'}}
 try{
  const previous=await currentImage(db,review.card_id,side),source=previous?Buffer.from(previous.output_bytes,'base64'):await originalCatalogImage(card[side],sourceRoot)
  const result=await correctCardImage(source,{issues:JSON.parse(review.issues),note:review.note.split(/\n\n(?=\d{4}-\d{2}-\d{2}T)/).at(-1)})
  const revision=randomUUID(),tx=await db.transaction('write')
  try{
   const live=(await tx.execute({sql:'SELECT r.updated_at,p.token FROM storefront_image_reviews r JOIN storefront_image_processing p ON p.review_id=r.id WHERE r.id=?',args:[id]})).rows[0]
   if(Number(live?.updated_at)!==version||live?.token!==token){await tx.rollback();return {status:'stale',message:'A newer request replaced this one; no image was published.'}}
   await tx.execute({sql:'INSERT INTO storefront_image_versions VALUES(?,?,?,?,?,?,?,?,?,?)',args:[revision,id,version,previous?.id||null,card[side],source.toString('base64'),result.bytes.toString('base64'),result.summary,Date.now(),result.processor]})
   await tx.execute({sql:'INSERT INTO storefront_image_current VALUES(?,?,?,?) ON CONFLICT(image_key) DO UPDATE SET revision_id=excluded.revision_id',args:[review.card_id+':'+side,review.card_id,side,revision]})
   await tx.execute({sql:"UPDATE storefront_image_reviews SET status='corrected' WHERE id=? AND updated_at=?",args:[id,version]})
   await tx.execute({sql:'DELETE FROM storefront_image_processing WHERE review_id=? AND token=?',args:[id,token]})
   await tx.commit();return {status:'corrected',message:result.summary,revision}
  }catch(e){await tx.rollback();throw e}finally{tx.close()}
 }catch(e){
  const status=e instanceof ImageNeedsReview?'needs_review':'failed',message=e instanceof ImageNeedsReview?e.message:'Automatic processing could not finish. The previous image is still in place; retry is available.'
  await db.execute({sql:'UPDATE storefront_image_reviews SET status=? WHERE id=? AND updated_at=? AND EXISTS(SELECT 1 FROM storefront_image_processing WHERE review_id=? AND token=?)',args:[status,id,version,id,token]})
  await db.execute({sql:'UPDATE storefront_image_processing SET message=?,started_at=0 WHERE review_id=? AND token=?',args:[message,id,token]})
  if(!(e instanceof ImageNeedsReview))console.error('Card image processing failed',e.code||e.name)
  return {status,message}
 }
}
export async function restoreImage(db,{id,updatedAt,revision}){
 if(typeof id!=='string'||!Number.isSafeInteger(updatedAt)||typeof revision!=='string')throw Object.assign(Error('Refresh before restoring an image.'),{status:400})
 const tx=await db.transaction('write')
 try{
  const row=(await tx.execute({sql:'SELECT r.card_id,r.side,r.updated_at,v.source_revision FROM storefront_image_reviews r JOIN storefront_image_current c ON c.image_key=r.id JOIN storefront_image_versions v ON v.id=c.revision_id WHERE r.id=? AND c.revision_id=?',args:[id,revision]})).rows[0]
  if(!row||Number(row.updated_at)!==updatedAt)throw Object.assign(Error('This image changed in another window. Refresh and try again.'),{status:409})
  if(row.source_revision)await tx.execute({sql:'UPDATE storefront_image_current SET revision_id=? WHERE image_key=?',args:[row.source_revision,id]});else await tx.execute({sql:'DELETE FROM storefront_image_current WHERE image_key=?',args:[id]})
  await tx.execute({sql:"UPDATE storefront_image_reviews SET status='restored' WHERE id=?",args:[id]});await tx.commit();return {status:'restored'}
 }catch(e){await tx.rollback();throw e}finally{tx.close()}
}
