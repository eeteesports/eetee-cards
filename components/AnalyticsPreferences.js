'use client'
import {useEffect,useState} from 'react'
import {GA_ID,OPT_OUT_KEY} from '../lib/storefrontAnalytics.mjs'
export default function AnalyticsPreferences(){
 const[disabled,setDisabled]=useState(null),[signal,setSignal]=useState(false)
 useEffect(()=>{try{setDisabled(localStorage.getItem(OPT_OUT_KEY)==='true');setSignal(Boolean(navigator.globalPrivacyControl||navigator.doNotTrack==='1'))}catch{setDisabled(true)}},[])
 function change(){try{if(disabled)localStorage.removeItem(OPT_OUT_KEY);else{localStorage.setItem(OPT_OUT_KEY,'true');window['ga-disable-'+GA_ID]=true;for(const cookie of document.cookie.split(';')){const name=cookie.split('=')[0].trim();if(/^_ga($|_)/.test(name))for(const domain of ['',location.hostname,'.eetee.cards'])document.cookie=name+'=; Max-Age=0; Path=/;'+(domain?' Domain='+domain+';':'')}}setDisabled(!disabled);location.reload()}catch{}}
 return <div className="mt-3 rounded border border-gray-300 p-4"><p>{signal?'Your browser’s privacy signal disables analytics.':disabled===null?'Loading analytics preferences…':disabled?'Analytics are off for this browser.':'Analytics are on for this browser.'}</p>{!signal&&disabled!==null&&<button className="mt-3 rounded bg-navy-900 px-4 py-2 text-white" onClick={change}>{disabled?'Allow analytics':'Turn analytics off for this browser'}</button>}</div>
}
