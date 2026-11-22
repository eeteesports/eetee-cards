'use client'
import {useEffect,useRef,useState} from 'react'
import {localGet,localPut} from '@/lib/captureLocal.mjs'

// Persist each recorder event independently so a Safari reload keeps completed chunks.
export default function useVoiceNotes(sessionId, report) {
 const active=useRef(null), starting=useRef(false)
 const [recording,setRecording]=useState(false)
 const [pending,setPending]=useState(false)
 async function stop(){
  const take=active.current
  if(!take)return
  if(take.recorder.state!=='inactive')take.recorder.stop()
  await take.done
 }
 async function start(){
  if(starting.current||active.current)return
  starting.current=true;setPending(true)
  let stream
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:true})
   const recorder=new MediaRecorder(stream,{audioBitsPerSecond:32000})
   const id=crypto.randomUUID(),key='voice:'+sessionId
   const clips=await localGet(key)||[]
   const clip={id,mime:recorder.mimeType,start:Date.now(),parts:0}
   clips.push(clip);await localPut(key,clips)
   let writes=Promise.resolve(),settle
   const done=new Promise(resolve=>{settle=resolve})
   recorder.ondataavailable=({data})=>{
    if(!data.size)return
    writes=writes.then(async()=>{
     await localPut(id+':'+clip.parts,data)
     clip.parts++;await localPut(key,clips)
    })
    writes.catch(e=>{clip.failed=true;localPut(key,clips).catch(()=>{});report('Voice storage failed: '+e.message)})
   }
   recorder.onstop=async()=>{
    stream.getTracks().forEach(t=>t.stop())
    try{await writes}catch(e){report(e.message)}
    active.current=null;setRecording(false);settle()
   }
   recorder.onerror=()=>report('Microphone interrupted. Check the recording indicator before continuing.')
   recorder.start(2000);active.current={recorder,done};setRecording(true)
  }catch(e){stream?.getTracks().forEach(t=>t.stop());report('Could not start microphone: '+e.message)}
  finally{starting.current=false;setPending(false)}
 }
 useEffect(()=>()=>{const r=active.current?.recorder;if(r&&r.state!=='inactive')r.stop()},[sessionId])
 return {recording,pending,start,stop}
}
