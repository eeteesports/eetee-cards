export const REPORT_PATHS=['/','/cards','/bins','/team-sets','/privacy']
export const REPORT_EVENTS=['page_view','select_shopping_path','select_bin','select_team','view_item','add_to_cart','remove_from_cart','view_cart','minimum_not_met','begin_checkout','ebay_store_click','ebay_auction_click','shop_error']
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
export function ownerAnalyticsInput(body){
 if(!body||typeof body.id!=='string'||typeof body.session!=='string'||!uuid.test(body.id)||!uuid.test(body.session)||!REPORT_PATHS.includes(body.path)||!REPORT_EVENTS.includes(body.event))return null
 const details={select_shopping_path:['individual_cards','team_sets'],select_bin:['50','100','all','bins','higher'],shop_error:['image_load_failed','javascript_error']}
 let detail=''
 if(details[body.event]?.includes(body.detail))detail=body.detail
 if(body.event==='select_team'&&typeof body.detail==='string'&&/^[A-Za-z .'-]{1,70}$/.test(body.detail))detail=body.detail
 let referrer='';try{const h=new URL(body.referrer).hostname;if(h.length<=120&&/^[a-z0-9.-]+$/i.test(h))referrer=h}catch{}
 return {id:body.id,session:body.session,path:body.path,event:body.event,detail,referrer,device:['mobile','tablet','desktop'].includes(body.device)?body.device:'unknown'}
}
export function reportDays(value){return [7,30,90].includes(Number(value))?Number(value):30}
