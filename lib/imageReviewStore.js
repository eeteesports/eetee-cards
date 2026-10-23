import 'server-only'
import {getTurso} from './db'
import publicCards from './publicCatalog'
import teams from '../data/team-bundles.json'
import seeds from '../data/image-review-seeds.json'
import {imageReviewInput,reviewKey} from './imageReviewInput.mjs'
const catalog=new Map([...publicCards.cards,...teams.bundles.flatMap(b=>b.cards)].map(c=>[c.id,c]))
let initialized
export function reviewCard(id){return catalog.get(id)}
export function initializeImageReviews(){
 if(!initialized)initialized=(async()=>{
  await getTurso().execute(`CREATE TABLE IF NOT EXISTS storefront_image_reviews (id TEXT PRIMARY KEY,card_id TEXT NOT NULL,side TEXT NOT NULL,issues TEXT NOT NULL,note TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,source TEXT NOT NULL)`)
  const now=Date.now()
  await getTurso().batch(seeds.filter(s=>catalog.has(s.cardId)).map(s=>({sql:'INSERT OR IGNORE INTO storefront_image_reviews(id,card_id,side,issues,note,status,created_at,updated_at,source) VALUES(?,?,?,?,?,?,?,?,?)',args:[reviewKey(s.cardId,s.side),s.cardId,s.side,JSON.stringify(s.issues),s.note,'open',now,now,'Owner request · 2026-10-23']})),'write')
 })().catch(e=>{initialized=null;throw e})
 return initialized
}
export async function listImageReviews(){
 await initializeImageReviews()
 const {rows}=await getTurso().execute('SELECT * FROM storefront_image_reviews ORDER BY updated_at DESC,id')
 return rows.map(row=>{const card=catalog.get(row.card_id);return {...row,issues:JSON.parse(row.issues),card:card?{id:card.id,player:card.player,year:card.year,set:card.set,number:card.number,front:card.front,back:card.back}:null}})
}
export async function saveImageReview(body){
 const input=imageReviewInput(body),card=catalog.get(input.cardId)
 if(!card?.[input.side])throw Object.assign(Error('That card image is not in the current catalog.'),{status:400})
 await initializeImageReviews()
 const tx=await getTurso().transaction('write'),id=reviewKey(input.cardId,input.side),now=Date.now()
 try{
  const previous=(await tx.execute({sql:'SELECT * FROM storefront_image_reviews WHERE id=?',args:[id]})).rows[0]
  const issues=[...new Set([...(previous?JSON.parse(previous.issues):[]),...input.issues])]
  const note=[previous?.note,input.note&&`${new Date(now).toISOString()} · ${input.note}`].filter(Boolean).join('\n\n')
  if(note.length>30000)throw Object.assign(Error('This request has a long history. Resolve it before adding more notes.'),{status:400})
  await tx.execute({sql:"INSERT INTO storefront_image_reviews(id,card_id,side,issues,note,status,created_at,updated_at,source) VALUES(?,?,?,?,?,'open',?,?,?) ON CONFLICT(id) DO UPDATE SET issues=excluded.issues,note=excluded.note,status='open',updated_at=excluded.updated_at",args:[id,input.cardId,input.side,JSON.stringify(issues),note,now,now,'Owner image flag']})
  await tx.commit();return {id,updated_at:now}
 }catch(e){await tx.rollback();throw e}finally{tx.close()}
}
export async function setImageReviewStatus(body){
 if(!body||typeof body.id!=='string'||!['open','done'].includes(body.status)||!Number.isSafeInteger(body.updatedAt))throw Object.assign(Error('Refresh the request before updating it.'),{status:400})
 await initializeImageReviews()
 const result=await getTurso().execute({sql:'UPDATE storefront_image_reviews SET status=?,updated_at=? WHERE id=? AND updated_at=?',args:[body.status,Date.now(),body.id,body.updatedAt]})
 if(!result.rowsAffected)throw Object.assign(Error('This request changed in another window. Refresh and try again.'),{status:409})
}
