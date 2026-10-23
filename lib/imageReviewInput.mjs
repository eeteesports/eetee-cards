export const IMAGE_ISSUES={crop:'Needs cropping',skew:'Needs deskewing',brightness:'Needs brightness / color review',other:'Other'}
const invalid=message=>Object.assign(Error(message),{status:400})
export function imageReviewInput(body){
 if(!body||typeof body.cardId!=='string'||!/^[a-f0-9]{16}$/.test(body.cardId))throw invalid('Choose a valid card.')
 if(!['front','back'].includes(body.side))throw invalid('Choose the front or back image.')
 if(!Array.isArray(body.issues)||!body.issues.length||body.issues.length>4||body.issues.some(x=>!Object.hasOwn(IMAGE_ISSUES,x)))throw invalid('Choose at least one image issue.')
 if(typeof body.note!=='string'||body.note.length>2000)throw invalid('Notes must be 2,000 characters or fewer.')
 if(body.issues.includes('other')&&!body.note.trim())throw invalid('Describe the other issue in the notes.')
 return {cardId:body.cardId,side:body.side,issues:[...new Set(body.issues)],note:body.note.trim()}
}
export function reviewKey(cardId,side){return `${cardId}:${side}`}
export function sameReviewOrigin(request){try{return request.headers.get('origin')===new URL(request.url).origin}catch{return false}}
