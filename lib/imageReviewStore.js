import 'server-only'
import {getTurso,getCard} from './db'
import {cardEditMap,applyPublicEdit} from './cardEdits.mjs'
import publicCards from './publicCatalog'
import teams from '../data/team-bundles.json'
import seeds from '../data/image-review-seeds.json'
import {initializeCorrections,processImageRequest,restoreImage,correctedImageUrl} from './imageCorrections.mjs'
import {imageReviewInput,reviewKey} from './imageReviewInput.mjs'
const catalog=new Map([...publicCards.cards,...teams.bundles.flatMap(b=>b.cards)].map(c=>[c.id,c]))
let initialized
export function reviewCard(id){return catalog.get(id)}
export function initializeImageReviews(){
 if(!initialized)initialized=(async()=>{
  await getTurso().execute(`CREATE TABLE IF NOT EXISTS storefront_image_reviews (id TEXT PRIMARY KEY,card_id TEXT NOT NULL,side TEXT NOT NULL,issues TEXT NOT NULL,note TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,source TEXT NOT NULL)`)
  await initializeCorrections(getTurso())
  const now=Date.now()
  await getTurso().batch(seeds.filter(s=>catalog.has(s.cardId)).map(s=>({sql:'INSERT OR IGNORE INTO storefront_image_reviews(id,card_id,side,issues,note,status,created_at,updated_at,source) VALUES(?,?,?,?,?,?,?,?,?)',args:[reviewKey(s.cardId,s.side),s.cardId,s.side,JSON.stringify(s.issues),s.note,'open',now,now,'Owner request · 2026-10-23']})),'write')
 })().catch(e=>{initialized=null;throw e})
 return initialized
}
export async function listImageReviews(){
 await initializeImageReviews()
 const {rows}=await getTurso().execute(`SELECT r.*,p.message AS processing_message,p.started_at,v.id AS result_id,v.request_version AS result_version,v.summary,v.created_at AS corrected_at,c.revision_id AS current_revision FROM storefront_image_reviews r LEFT JOIN storefront_image_processing p ON p.review_id=r.id LEFT JOIN storefront_image_versions v ON v.id=(SELECT id FROM storefront_image_versions WHERE review_id=r.id ORDER BY created_at DESC LIMIT 1) LEFT JOIN storefront_image_current c ON c.image_key=r.id ORDER BY r.updated_at DESC,r.id`)
 const edits=await cardEditMap(getTurso())
 return Promise.all(rows.map(async row=>{let card=catalog.get(row.card_id);const isPublic=Boolean(card);if(card)card=applyPublicEdit(card,edits.get(card.id));else{const record=await getCard(row.card_id);if(record)card={id:record.id,player:record.fields.Player,year:record.fields.Year,set:record.fields.Set,number:record.fields['Card Number'],front:record.fields['Front Image URL'],back:record.fields['Back Image URL']}}return {...row,status:row.status==='processing'&&Number(row.started_at)<Date.now()-120000?'failed':row.status,issues:JSON.parse(row.issues),before:row.result_id?`/api/admin/image-reviews/${row.result_id}/image?side=before`:card?.[row.side],after:row.result_id?`/api/admin/image-reviews/${row.result_id}/image?side=after`:null,currentImage:row.current_revision?(isPublic?correctedImageUrl(row.card_id,row.side,row.current_revision):`/api/admin/cards/${row.card_id}/image?side=${row.side}&v=${row.current_revision}`):card?.[row.side],card:card?{id:card.id,player:card.player,year:card.year,set:card.set,number:card.number,front:card.front,back:card.back}:null}}))
}
export async function saveImageReview(body){
 const input=imageReviewInput(body),card=catalog.get(input.cardId)
 if(!card?.[input.side])throw Object.assign(Error('That card image is not in the current catalog.'),{status:400})
 await initializeImageReviews()
 const tx=await getTurso().transaction('write'),id=reviewKey(input.cardId,input.side);let now=Date.now()
 try{
  const previous=(await tx.execute({sql:'SELECT * FROM storefront_image_reviews WHERE id=?',args:[id]})).rows[0]
  now=Math.max(now,Number(previous?.updated_at||0)+1)
  const issues=[...new Set([...(previous&&['open','processing','failed','needs_review'].includes(previous.status)?JSON.parse(previous.issues):[]),...input.issues])]
  const note=[previous?.note,input.note&&`${new Date(now).toISOString()} · ${input.note}`].filter(Boolean).join('\n\n')
  if(note.length>30000)throw Object.assign(Error('This request has a long history. Resolve it before adding more notes.'),{status:400})
  await tx.execute({sql:"INSERT INTO storefront_image_reviews(id,card_id,side,issues,note,status,created_at,updated_at,source) VALUES(?,?,?,?,?,'open',?,?,?) ON CONFLICT(id) DO UPDATE SET issues=excluded.issues,note=excluded.note,status='open',updated_at=excluded.updated_at",args:[id,input.cardId,input.side,JSON.stringify(issues),note,now,now,'Owner image flag']})
  await tx.commit()
 }catch(e){await tx.rollback();throw e}finally{tx.close()}
 const review=(await getTurso().execute({sql:'SELECT * FROM storefront_image_reviews WHERE id=?',args:[id]})).rows[0]
 return {id,updated_at:now,...await processImageRequest(getTurso(),review,card)}
}
export async function setImageReviewStatus(body){
 await initializeImageReviews()
 if(body?.action==='restore')return restoreImage(getTurso(),body)
 if(body?.action!=='retry'||typeof body.id!=='string'||!Number.isSafeInteger(body.updatedAt))throw Object.assign(Error('Choose retry or restore. Corrections are marked automatically.'),{status:400})
 const review=(await getTurso().execute({sql:'SELECT * FROM storefront_image_reviews WHERE id=?',args:[body.id]})).rows[0]
 if(!review||Number(review.updated_at)!==body.updatedAt)throw Object.assign(Error('This request changed. Refresh and try again.'),{status:409})
 if(!['open','failed','needs_review','processing','done'].includes(review.status))throw Object.assign(Error('This image already has a result. Flag a new adjustment instead.'),{status:409})
 if(review.status==='processing')await getTurso().execute({sql:"UPDATE storefront_image_reviews SET status='failed' WHERE id=? AND EXISTS(SELECT 1 FROM storefront_image_processing WHERE review_id=? AND started_at<?)",args:[body.id,body.id,Date.now()-120000]})
 return processImageRequest(getTurso(),review,catalog.get(review.card_id))
}
