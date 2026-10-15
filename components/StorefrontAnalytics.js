'use client'
import {useEffect,useRef,useState} from 'react'
import {usePathname} from 'next/navigation'
import Script from 'next/script'
import {Analytics} from '@vercel/analytics/next'
import {GA_ID,trackingAllowed,initializeAnalytics,trackShop,cleanAnalyticsUrl} from '../lib/storefrontAnalytics.mjs'
export default function StorefrontAnalytics(){
 const pathname=usePathname(),[enabled,setEnabled]=useState(false),lastPage=useRef('')
 useEffect(()=>{const active=trackingAllowed();setEnabled(active);if(!active)return;initializeAnalytics();const url=cleanAnalyticsUrl(window.location.href);if(lastPage.current!==url){lastPage.current=url;trackShop('page_view',{page_location:url,page_title:document.title,page_referrer:document.referrer?new URL(document.referrer).origin+'/':''})}},[pathname])
 useEffect(()=>{if(!enabled)return;let sent=false;function depth(){if(!sent&&document.documentElement.scrollHeight>innerHeight&&(scrollY+innerHeight)/document.documentElement.scrollHeight>=.9){sent=true;trackShop('scroll',{percent_scrolled:90})}}window.addEventListener('scroll',depth,{passive:true});return()=>window.removeEventListener('scroll',depth)},[enabled,pathname])
 useEffect(()=>{if(!enabled)return;let reports=0;function problem(e){if(reports>=3)return;if(e.target instanceof HTMLImageElement){reports++;trackShop('shop_error',{error_code:'image_load_failed'})}else if(e.target===window){reports++;trackShop('shop_error',{error_code:'javascript_error'})}}window.addEventListener('error',problem,true);return()=>window.removeEventListener('error',problem,true)},[enabled])
 return enabled?<><Script id="eetee-ga" src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive"/><Analytics beforeSend={event=>trackingAllowed()?{...event,url:cleanAnalyticsUrl(event.url)}:null}/></>:null
}
