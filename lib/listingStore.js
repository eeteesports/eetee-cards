import 'server-only'
import sharp from 'sharp'
import {isPersonalCollection} from './collectionScope.mjs'
import {randomUUID,createHash} from 'node:crypto'
import {getTurso} from './db'
import {editableCard,editorImageBytes} from './cardEditorStore'
import {lookupCard} from './inventoryLookupStore'
import {reviewCard} from './imageReviewStore'
import {initializeStorefrontOrders} from './storefrontOrders'
import teams from '../data/team-bundles.json'
import reservations from '../data/marketplace-reservations.json'
import {listingFeeReport} from './listingFeeReport.mjs'
import {initialListing,validateListing,listingXml} from './listingDraft.mjs'
import {tradingCall,listingFees,verifyNoDuplicate,hostedImage,sellerAllowance} from './listingEbay'
const fail=(message,status=409)=>Object.assign(Error(message),{status})
let initialized
async function initialize(){
 if(!initialized)initialized=(async()=>{await initializeStorefrontOrders();await getTurso().execute(`CREATE TABLE IF NOT EXISTS marketplace_listing_drafts (id TEXT PRIMARY KEY,card_id TEXT NOT NULL,marketplace TEXT NOT NULL,data TEXT NOT NULL,status TEXT NOT NULL,revision INTEGER NOT NULL,source_revision TEXT NOT NULL,verified TEXT,result TEXT,updated_at INTEGER NOT NULL,UNIQUE(card_id,marketplace))`)})().catch(e=>{initialized=null;throw e});return initialized
}
const sourceRevision=c=>createHash('sha256').update(JSON.stringify([c.metadata,c.images,c.askingPrice,c.ownership])).digest('hex')
async function listingCard(id){const card=await editableCard(id),lookup=await lookupCard(id);return {...card,askingPrice:(reviewCard(id)?.priceCents||reviewCard(id)?.binPriceCents||0)/100,ownership:lookup?.ownership||'unknown',copyId:lookup?.id}}
const decode=r=>r?{...r,data:JSON.parse(r.data),verified:r.verified?JSON.parse(r.verified):null,result:r.result?JSON.parse(r.result):null}:null
async function draftRow(id){await initialize();const row=decode((await getTurso().execute({sql:'SELECT * FROM marketplace_listing_drafts WHERE id=?',args:[id]})).rows[0]);if(!row)throw fail('Draft not found.',404);return row}
async function assertAvailable(card){
 if(isPersonalCollection(card.metadata))throw fail('This card is in your personal collection. Change its allocation before listing.')
 if(card.ownership!=='owned')throw fail('This copy is not confirmed owned in the scanner inventory. Reconcile ownership first.')
 const bundle=teams.bundles.find(b=>b.cards.some(c=>c.id===card.id))
 if(bundle&&[...reservations.bundles,...(reservations.soldBundles||[]).map(b=>b.id)].includes(bundle.id))throw fail('This card belongs to a reserved or sold team bundle.')
 const locks=(await getTurso().execute({sql:'SELECT status FROM storefront_copy_locks WHERE copy_id=?',args:[card.id]})).rows
 if(locks.length)throw fail('This physical card is sold, reserved, or already listed. Review its current sale before listing again.')
}
export async function loadListing(cardId,marketplace){
 await initialize();if(!['ebay','facebook'].includes(marketplace))throw fail('Choose a marketplace.',400)
 const card=await listingCard(cardId),row=decode((await getTurso().execute({sql:'SELECT * FROM marketplace_listing_drafts WHERE card_id=? AND marketplace=?',args:[cardId,marketplace]})).rows[0])
 let availabilityError='';try{await assertAvailable(card)}catch(e){availabilityError=e.message}
 return {card,availabilityError,sourceRevision:sourceRevision(card),draft:row||{id:null,revision:0,status:'draft',data:initialListing({...card,askingPrice:(reviewCard(cardId)?.priceCents||0)/100},marketplace)},sourceChanged:row?row.source_revision!==sourceRevision(card):false}
}
export async function saveListing(body){
 await initialize();const data=validateListing(body.data),card=await listingCard(body.cardId)
 if(body.sourceRevision!==sourceRevision(card))throw fail('Card details, photos or site price changed. Reopen before saving.')
 if(!Number.isSafeInteger(body.revision))throw fail('Invalid draft version.',400)
 const tx=await getTurso().transaction('write')
 try{
  const old=(await tx.execute({sql:'SELECT * FROM marketplace_listing_drafts WHERE card_id=? AND marketplace=?',args:[card.id,data.marketplace]})).rows[0]
  if(Number(old?.revision||0)!==body.revision)throw fail('Draft changed in another window. Reopen before saving.')
  if(old&&['publishing','published','uncertain'].includes(old.status))throw fail('This draft has already been submitted. Check its marketplace status.')
  const id=old?.id||randomUUID(),revision=body.revision+1
  await tx.execute({sql:`INSERT INTO marketplace_listing_drafts VALUES(?,?,?,?,'draft',?,?,NULL,NULL,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,status='draft',revision=excluded.revision,source_revision=excluded.source_revision,verified=NULL,updated_at=excluded.updated_at`,args:[id,card.id,data.marketplace,JSON.stringify(data),revision,sourceRevision(card),Date.now()]})
  await tx.commit();return {id,revision,status:'draft',data}
 }catch(e){await tx.rollback();throw e}finally{tx.close()}
}
export async function verifyListing(body){
 const row=await draftRow(body.id)
 if(row.revision!==body.revision||!['draft','verified'].includes(row.status))throw fail('Save the current draft before verifying.')
 const d=validateListing(row.data,{complete:true}),card=await listingCard(row.card_id)
 if(sourceRevision(card)!==row.source_revision)throw fail('Card details or photos changed. Reopen and review before saving again.')
 await assertAvailable(card)
 if(d.marketplace!=='ebay')throw fail('Facebook publishing requires a local Chrome connection. Use the prepared listing handoff.',422)
 await verifyNoDuplicate(d.title,row.card_id,card,d.duplicateAcknowledged)
 const pictures=[]
 for(const side of ['front','back']){
  if(!card.images[side].url)throw fail('Add both front and back photos before listing.',422)
  const image=sharp(await editorImageBytes(card,side)),meta=await image.metadata()
  if(Math.max(meta.width||0,meta.height||0)<500)throw fail('The '+side+' photo must be at least 500 pixels on its longest side.',422)
  pictures.push(await hostedImage(await image.jpeg({quality:95}).toBuffer()))
 }
 const xml=listingXml(d,{id:row.card_id,pictures,uuid:row.id}),r=await tradingCall(d.format==='fixed'?'VerifyAddFixedPriceItem':'VerifyAddItem',xml),verified={xml,feeReport:listingFeeReport(r),allowance:await sellerAllowance().catch(()=>null),fees:listingFees(r),warnings:(Array.isArray(r.Errors)?r.Errors:r.Errors?[r.Errors]:[]).map(e=>e.LongMessage||e.ShortMessage),at:Date.now(),sourceRevision:sourceRevision(card)}
 if(sourceRevision(await listingCard(row.card_id))!==row.source_revision)throw fail('Card details changed during validation. Reopen and review again.')
 const update=await getTurso().execute({sql:"UPDATE marketplace_listing_drafts SET verified=?,status='verified' WHERE id=? AND revision=? AND status IN ('draft','verified')",args:[JSON.stringify(verified),row.id,row.revision]})
 if(!update.rowsAffected)throw fail('Draft changed during verification. Verify it again.')
 return {id:row.id,revision:row.revision,status:'verified',feeReport:verified.feeReport,allowance:verified.allowance,at:verified.at,fees:verified.fees,warnings:verified.warnings}
}
export async function publishListing(body){
 const row=await draftRow(body.id)
 if(row.status==='published')return {status:'published',...row.result}
 if(row.status!=='verified'||row.revision!==body.revision||!row.verified||Date.now()-row.verified.at>15*60*1000)throw fail('Verify this draft again before publishing.')
 if(body.confirmed!==true)throw fail('Review and confirm this listing.',400)
 const card=await listingCard(row.card_id)
 if(sourceRevision(card)!==row.verified.sourceRevision)throw fail('Card details changed after verification. Save and verify again.')
 await assertAvailable(card);await verifyNoDuplicate(row.data.title,row.card_id,card,row.data.duplicateAcknowledged)
 const db=getTurso(),tx=await db.transaction('write')
 try{
  const changed=await tx.execute({sql:"UPDATE marketplace_listing_drafts SET status='publishing',updated_at=? WHERE id=? AND revision=? AND status='verified'",args:[Date.now(),row.id,row.revision]})
  if(!changed.rowsAffected)throw fail('This listing is already being submitted.')
  await tx.execute({sql:"INSERT INTO storefront_copy_locks VALUES(?,?,'marketplace')",args:[row.card_id,`listing:${row.id}`]});await tx.commit()
 }catch(e){await tx.rollback();throw fail(e.status?e.message:'This card is already reserved or being listed.')}finally{tx.close()}
 try{
  const r=await tradingCall(row.data.format==='fixed'?'AddFixedPriceItem':'AddItem',row.verified.xml),itemId=r.ItemID
  if(!/^\d+$/.test(itemId||''))throw Error('No listing ID returned')
  const result={itemId,url:`https://www.ebay.com/itm/${itemId}`,feeReport:listingFeeReport(r,'publication'),fees:listingFees(r),publishedAt:new Date().toISOString()}
  await db.execute({sql:"UPDATE marketplace_listing_drafts SET status='published',result=?,updated_at=? WHERE id=?",args:[JSON.stringify(result),Date.now(),row.id]})
  return {status:'published',...result}
 }catch(e){
  // A timeout or persistence error can follow a successful AddItem. Keep the
  // physical-copy lock and never retry automatically, even on a definite error.
  await db.execute({sql:"UPDATE marketplace_listing_drafts SET status='uncertain',result=?,updated_at=? WHERE id=?",args:[JSON.stringify({message:'Check eBay Seller Hub and reconcile this draft before retrying.'}),Date.now(),row.id]})
  throw fail('eBay publication was not confirmed. Check Seller Hub before retrying. This card remains reserved.',409)
 }
}
