import 'server-only'
import audit from '../data/image-audits/fronts-2026-10-24.json'
import {getTurso} from './db'
import {initializeImageReviews} from './imageReviewStore'
import {editableCard,saveEditedCard} from './cardEditorStore'
export async function imageAuditStatus(){
 await initializeImageReviews()
 const [current,versions]=await Promise.all([getTurso().execute("SELECT card_id FROM storefront_image_reviews WHERE side='front'"),getTurso().execute({sql:'SELECT DISTINCT review_id FROM storefront_image_versions WHERE processor LIKE ?',args:['inventory-audit-v1 '+audit.id+' %']})])
 const done=new Set(versions.rows.map(r=>r.review_id.replace(/:front$/,''))),edited=new Set(current.rows.map(r=>r.card_id)),remaining=audit.corrections.filter(p=>!done.has(p.cardId)&&!edited.has(p.cardId))
 return {id:audit.id,screened:audit.screened,visuallyReviewed:audit.visuallyReviewed,planned:audit.corrections.length,applied:audit.corrections.filter(p=>done.has(p.cardId)).length,skipped:audit.corrections.filter(p=>!done.has(p.cardId)&&edited.has(p.cardId)).length,remaining:remaining.map(p=>p.cardId)}
}
export async function applyReviewedImageBatch(){
 const status=await imageAuditStatus(),results=[]
 for(const id of status.remaining.slice(0,5)){
  const plan=audit.corrections.find(p=>p.cardId===id)
  try{const card=await editableCard(id);if(card.images.front.revision){results.push({id,status:'kept newer edit'});continue}
   await saveEditedCard(id,{metadata:card.metadata,changedFields:[],revision:card.revision,images:{front:{revision:null,settings:plan.settings}}},{auditId:audit.id,reason:plan.reason,sourceSha256:plan.sourceSha256});results.push({id,status:'corrected'})
  }catch(e){results.push({id,status:'needs review',error:e.status===409?e.message:'Could not finish this correction; current image retained.'});break}
 }
 return {...await imageAuditStatus(),results}
}
