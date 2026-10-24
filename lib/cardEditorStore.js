import 'server-only'
import {randomUUID} from 'node:crypto'
import {getTurso,getCard} from './db'
import {reviewCard,initializeImageReviews} from './imageReviewStore'
import {currentImage,correctedImageUrl,originalCatalogImage} from './imageCorrections.mjs'
import {cardEditMap,initializeCardEdits} from './cardEdits.mjs'
import {TEXT_FIELDS,FLAG_FIELDS,editorMetadata,imageSettings,validCardId,LEGACY_FIELDS} from './cardEditorInput.mjs'
import {renderManualImage} from './cardImageProcessor.mjs'
const error=(message,status)=>Object.assign(Error(message),{status})
export async function editableCard(id){
 if(!validCardId(id))throw error('Invalid card.',400)
 await initializeImageReviews();await initializeCardEdits(getTurso())
 const publicCard=reviewCard(id),record=publicCard?null:await getCard(id);if(!publicCard&&!record)throw error('Card not found.',404)
 const base=publicCard||Object.fromEntries(Object.entries(LEGACY_FIELDS).map(([k,v])=>[k,record.fields[v]]))
 if(record){base.teams=String(record.fields.Team||'').split(' / ').filter(Boolean);base.autograph=record.fields.Tags?.includes('Auto')||null;base.memorabilia=record.fields.Tags?.includes('Patch')||null;base.front=record.fields['Front Image URL'];base.back=record.fields['Back Image URL']}
 const edit=(await cardEditMap(getTurso())).get(id),meta={};for(const k of TEXT_FIELDS)meta[k]=String(base[k]??'');for(const k of FLAG_FIELDS)meta[k]=typeof base[k]==='boolean'?base[k]:null;meta.teams=base.teams||[];for(const k of ['cost','value','printRun'])meta[k]=typeof base[k]==='number'?base[k]:null;Object.assign(meta,publicCard?(edit?.data||{}):Object.fromEntries(Object.entries(edit?.data||{}).filter(([k])=>!LEGACY_FIELDS[k]&&k!=='teams')))
 const images={};for(const side of ['front','back']){const current=await currentImage(getTurso(),id,side);images[side]={url:base[side]?`/api/admin/cards/${id}/image?side=${side}&v=${current?.id||'original'}`:null,revision:current?.id||null,source:base[side]||null}}
 return {id,metadata:meta,revision:edit?.revision||0,images,isPublic:Boolean(publicCard)}
}
export async function editorImageBytes(card,side){
 if(!['front','back'].includes(side))throw error('Choose front or back.',400)
 const current=await currentImage(getTurso(),card.id,side);if(current)return Buffer.from(current.output_bytes,'base64')
 const url=card.images[side].source;if(!url)throw error('This card has no image on that side.',404)
 if(new RegExp('^[/]team-bundles[/][a-f0-9]{16}-(front|back)[.]webp$').test(url))return originalCatalogImage(url)
 // Only the existing trusted image provider is fetched; the editor cannot supply URLs.
 const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='res.cloudinary.com')throw error('This image source needs to be imported before it can be edited.',422)
 const r=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(10000)});if(!r.ok)throw error('Image could not be loaded.',422);const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>8000000)throw error('Source image is too large.',422);return bytes
}
export async function saveEditedCard(id,body){
 const card=await editableCard(id),incoming=editorMetadata(body.metadata);let metadata=incoming
 if(body.changedFields!==undefined){if(!Array.isArray(body.changedFields)||body.changedFields.some(k=>!Object.hasOwn(incoming,k)))throw error('Invalid changed attributes.',400);metadata=editorMetadata({...card.metadata,...Object.fromEntries(body.changedFields.map(k=>[k,incoming[k]]))})}
 if(!Number.isSafeInteger(body.revision)||body.revision!==card.revision)throw error('This card changed in another window. Reopen it before saving.',409)
 const requested=body.images||{};if(typeof requested!=='object'||Array.isArray(requested)||Object.keys(requested).some(s=>!['front','back'].includes(s)))throw error('Choose front or back image settings.',400)
 const generated=[]
 for(const [side,input]of Object.entries(requested)){if(input.revision!==card.images[side].revision)throw error('This image changed. Reopen the card before saving.',409);const settings=imageSettings(input.settings),before=await editorImageBytes(card,side),after=await renderManualImage(before,settings);generated.push({side,before,after,settings,sourceRevision:card.images[side].revision,id:randomUUID()})}
 const db=getTurso(),tx=await db.transaction('write');let revision=Date.now()
 try{
  const previous=(await tx.execute({sql:'SELECT * FROM storefront_card_edits WHERE card_id=?',args:[id]})).rows[0];if(Number(previous?.revision||0)!==body.revision)throw error('This card changed while you were editing. Reopen it before saving.',409);revision=Math.max(revision,body.revision+1)
  for(const g of generated){const live=(await tx.execute({sql:'SELECT revision_id FROM storefront_image_current WHERE image_key=?',args:[id+':'+g.side]})).rows[0];if((live?.revision_id||null)!==g.sourceRevision)throw error('Another image update finished while you were editing. Reopen the card before saving.',409)}
  await tx.execute({sql:'INSERT INTO storefront_card_edits VALUES(?,?,?) ON CONFLICT(card_id) DO UPDATE SET data=excluded.data,revision=excluded.revision',args:[id,JSON.stringify(metadata),revision]})
  await tx.execute({sql:'INSERT INTO storefront_card_edit_history VALUES(?,?,?,?,?)',args:[randomUUID(),id,previous?.data||JSON.stringify(card.metadata),JSON.stringify(metadata),revision]})
  // For legacy inventory cards, persist recognized fields into their established data table too.
  if(!card.isPublic){const columns={player:'player',cardName:'card_name',year:'year',brand:'brand',set:'set_name',number:'card_number',parallel:'parallel_variant',serial:'serial_number',sport:'sport',league:'league',rookie:'rookie',graded:'graded',grader:'grader',grade:'grade',printRun:'print_run',condition:'condition',cost:'cost_paid',value:'estimated_value',notes:'notes'};const tagsRow=(await tx.execute({sql:'SELECT tags FROM cards WHERE id=?',args:[id]})).rows[0];const tags=(JSON.parse(tagsRow?.tags||'[]')).filter(t=>!['Auto','Patch'].includes(t)).concat(metadata.autograph?['Auto']:[],metadata.memorabilia?['Patch']:[]);await tx.execute({sql:'UPDATE cards SET tags=? WHERE id=?',args:[JSON.stringify(tags),id]});const args=Object.keys(columns).map(k=>typeof metadata[k]==='boolean'?Number(metadata[k]):metadata[k]);args.push(metadata.teams.join(' / '),id);await tx.execute({sql:`UPDATE cards SET ${Object.values(columns).map(k=>k+'=?').join(',')},team=? WHERE id=?`,args})}
  for(const g of generated){const key=id+':'+g.side,old=(await tx.execute({sql:'SELECT updated_at FROM storefront_image_reviews WHERE id=?',args:[key]})).rows[0],version=Math.max(revision,Number(old?.updated_at||0)+1),issues=[...(g.settings.left||g.settings.top||g.settings.right!==1||g.settings.bottom!==1?['crop']:[]),...(g.settings.rotation?['skew']:[]),...(['brightness','contrast','saturation','gamma'].some(k=>g.settings[k]!==1)?['brightness']:[])];const summary='Edited by owner: '+(issues.map(i=>i==='brightness'?'lighting / color':i).join(', ')||'image adjustment')+'.'
   await tx.execute({sql:"INSERT INTO storefront_image_reviews VALUES(?,?,?,?,?,'corrected',?,?,?) ON CONFLICT(id) DO UPDATE SET issues=excluded.issues,note=storefront_image_reviews.note||char(10)||char(10)||excluded.note,status='corrected',updated_at=excluded.updated_at,source=excluded.source",args:[key,id,g.side,JSON.stringify(issues),`${new Date(version).toISOString()} · Saved in Fix Card editor.`,version,version,'Owner · Fix Card editor']})
   await tx.execute({sql:'INSERT INTO storefront_image_versions VALUES(?,?,?,?,?,?,?,?,?,?)',args:[g.id,key,version,g.sourceRevision,card.images[g.side].source,g.before.toString('base64'),g.after.toString('base64'),summary,version,'owner-editor-v1 '+JSON.stringify(g.settings)]})
   await tx.execute({sql:'INSERT INTO storefront_image_current VALUES(?,?,?,?) ON CONFLICT(image_key) DO UPDATE SET revision_id=excluded.revision_id',args:[key,id,g.side,g.id]});await tx.execute({sql:'DELETE FROM storefront_image_processing WHERE review_id=?',args:[key]})
  }
  await tx.commit()
 }catch(e){await tx.rollback();throw e}finally{tx.close()}
 return {ok:true,revision,updatedImages:generated.map(g=>({side:g.side,revision:g.id})),card:await editableCard(id)}
}
