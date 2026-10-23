'use client'
import {useEffect,useRef} from 'react'
import styles from './CollectionWatermark.module.css'
export default function CollectionWatermark(){
 const watermark=useRef(null)
 useEffect(()=>{
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)')
  let frame=0
  const paint=()=>{frame=0;if(watermark.current)watermark.current.style.setProperty('--watermark-y',`${reducedMotion.matches?0:-window.scrollY*.16}px`)}
  const onScroll=()=>{if(!reducedMotion.matches&&!frame)frame=window.requestAnimationFrame(paint)}
  paint()
  window.addEventListener('scroll',onScroll,{passive:true})
  reducedMotion.addEventListener('change',paint)
  return()=>{window.removeEventListener('scroll',onScroll);reducedMotion.removeEventListener('change',paint);window.cancelAnimationFrame(frame)}
 },[])
 return <div ref={watermark} className={styles.watermark} aria-hidden="true"/>
}
