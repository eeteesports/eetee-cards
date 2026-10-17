'use client'
import {useEffect} from 'react'
export default function ClearPurchasedCart({ids,bundleIds}){
 useEffect(()=>{try{const key='eetee-public-selection-v2',old=JSON.parse(localStorage.getItem(key)||'{}');localStorage.setItem(key,JSON.stringify({cards:(old.cards||[]).filter(id=>!ids.includes(id)),bundles:(old.bundles||[]).filter(id=>!bundleIds.includes(id))}))}catch{}},[ids,bundleIds])
 return null
}
