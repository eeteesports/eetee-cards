import 'server-only'
import {XMLParser} from 'fast-xml-parser'
import {getTurso} from './db'
const parser=new XMLParser({ignoreAttributes:false,parseTagValue:false}),fail=(message,status=422)=>Object.assign(Error(message),{status}),array=x=>x==null?[]:Array.isArray(x)?x:[x]
export async function sellerToken(){
 const db=getTurso(),row=(await db.execute("SELECT * FROM ebay_auth WHERE id='ebay'")).rows[0]
 if(!row?.refresh_token)throw fail('Connect your eBay seller account first.')
 if(row.access_token&&Date.parse(row.access_token_expires_at)>Date.now()+300000)return row.access_token
 const {EBAY_APP_ID,EBAY_CERT_ID}=process.env;if(!EBAY_APP_ID||!EBAY_CERT_ID)throw fail('eBay seller credentials are not configured.',503)
 const r=await fetch('https://api.ebay.com/identity/v1/oauth2/token',{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:row.refresh_token}),signal:AbortSignal.timeout(12000)}),data=await r.json()
 if(!r.ok||!data.access_token)throw fail('Reconnect your eBay seller account.')
 await db.execute({sql:"UPDATE ebay_auth SET access_token=?,access_token_expires_at=?,updated_at=datetime('now') WHERE id='ebay'",args:[data.access_token,new Date(Date.now()+Number(data.expires_in)*1000).toISOString()]});return data.access_token
}
export async function tradingCall(call,content='',{token,bytes}={}){
 token=token||await sellerToken();const xml=`<?xml version="1.0" encoding="utf-8"?><${call}Request xmlns="urn:ebay:apis:eBLBaseComponents">${content}</${call}Request>`
 let body=xml,headers={'X-EBAY-API-CALL-NAME':call,'X-EBAY-API-SITEID':'0','X-EBAY-API-COMPATIBILITY-LEVEL':'1457','X-EBAY-API-IAF-TOKEN':token}
 if(bytes){body=new FormData();body.append('XML Payload',xml);body.append('file',new Blob([bytes],{type:'image/jpeg'}),'card.jpg')}else headers['Content-Type']='text/xml'
 const r=await fetch('https://api.ebay.com/ws/api.dll',{method:'POST',headers,body,signal:AbortSignal.timeout(18000)}),data=parser.parse(await r.text())[`${call}Response`]
 if(!r.ok||!data||!['Success','Warning'].includes(data.Ack))throw fail(array(data?.Errors).filter(e=>e.SeverityCode!=='Warning').map(e=>e.LongMessage||e.ShortMessage).join(' ').slice(0,1000)||'eBay did not confirm the request.')
 return data
}
export async function sellerPolicies(){
 const r=await tradingCall('GetUserPreferences','<ShowSellerProfilePreferences>true</ShowSellerProfilePreferences>'),profiles=array(r.SellerProfilePreferences?.SupportedSellerProfiles?.SupportedSellerProfile)
 const policies={shipping:[],payment:[],returns:[]},mapping={SHIPPING:['shipping','fulfillmentPolicyId'],PAYMENT:['payment','paymentPolicyId'],RETURN:['returns','returnPolicyId'],RETURN_POLICY:['returns','returnPolicyId']}
 for(const p of profiles){const target=mapping[p.ProfileType];if(target)policies[target[0]].push({[target[1]]:String(p.ProfileID),name:p.ProfileName,summary:p.ShortSummary||''})}
 return policies
}
export async function conditionPolicies(){
 const token=await sellerToken(),url='https://api.ebay.com/sell/metadata/v1/marketplace/EBAY_US/get_item_condition_policies?filter=categoryIds:%7B261328%7D'
 const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)})
 if(!r.ok)throw fail('Could not load eBay condition options. Reconnect eBay or try again later.')
 const data=await r.json();return data.itemConditionPolicies?.find(p=>p.categoryId==='261328')||data.itemConditionPolicies?.[0]||{}
}
export async function hostedImage(bytes){
 const token=await sellerToken(),body=new FormData();body.append('image',new Blob([bytes],{type:'image/jpeg'}),'card.jpg')
 const r=await fetch('https://apim.ebay.com/commerce/media/v1_beta/image/create_image_from_file',{method:'POST',headers:{Authorization:'Bearer '+token},body,signal:AbortSignal.timeout(20000)}),data=await r.json().catch(()=>({}))
 if(!r.ok||!data.imageUrl?.startsWith('https://'))throw fail('eBay photo hosting failed. Your saved draft is retained.',422)
 return data.imageUrl
}
export async function verifyNoDuplicate(title,id,card,acknowledged=[]){
 const matches=[]
 for(const kind of ['ActiveList','ScheduledList'])for(let page=1;page<=30;page++){
  const r=await tradingCall('GetMyeBaySelling',`<${kind}><Include>true</Include><Pagination><EntriesPerPage>200</EntriesPerPage><PageNumber>${page}</PageNumber></Pagination></${kind}>`),block=r[kind],pages=Number(block?.PaginationResult?.TotalNumberOfPages||0)
  if(pages>30)throw fail('Too many listings to finish duplicate checks. Reconcile in Seller Hub.')
  for(const i of array(block?.ItemArray?.Item)){
   const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''),samePlayer=card?.metadata?.player&&norm(i.Title).includes(norm(card.metadata.player)),sameYear=card?.metadata?.year&&String(i.Title).includes(card.metadata.year)
   if(i.SKU===`eetee-${id}`||i.SKU===id||card?.copyId&&(i.SKU===card.copyId||i.SKU===`eetee-${card.copyId}`))throw fail('This physical-copy SKU is already listed or scheduled on eBay: '+i.ItemID)
   if((norm(i.Title)===norm(title)||samePlayer&&sameYear)&&!acknowledged.includes(String(i.ItemID)))matches.push({id:String(i.ItemID),title:i.Title})
  }
  if(page>=pages)break
 }
 if(matches.length)throw Object.assign(fail('Review the possible matching listings below. Confirm different physical copies before validating again.'),{duplicates:[...new Map(matches.map(m=>[m.id,m])).values()]})
}
export function listingFees(r){return array(r.Fees?.Fee).map(f=>({name:f.Name,amount:Number(f.Fee?.['#text']??f.Fee??0),currency:f.Fee?.['@_currencyID']||'USD'})).filter(f=>f.amount>0)}
