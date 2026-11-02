import {validCardId} from './cardEditorInput.mjs'
export const FIX_ISSUES={crop:'Cropping',skew:'Straighten',brightness:'Brightness',metadata:'Card details / badges',other:'Other'}
export function cardTaskInput(body){
 const fail=message=>{throw Object.assign(Error(message),{status:400})}
 if(!body||!validCardId(body.cardId))fail('Choose a card from your inventory.')
 if(!['front','back'].includes(body.side))fail('Choose front or back.')
 if(!Array.isArray(body.issues)||!body.issues.length||body.issues.length>5||body.issues.some(k=>!Object.hasOwn(FIX_ISSUES,k)))fail('Choose what needs fixing.')
 if(typeof body.note!=='string'||body.note.trim().length<3||body.note.length>2000)fail('Describe the requested correction in 3–2,000 characters.')
 return {cardId:body.cardId,side:body.side,issues:[...new Set(body.issues)],note:body.note.trim()}
}
