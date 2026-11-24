'use client'
import {useEffect,useRef,useState} from 'react'
import {localGet,localPut,localDelete} from '@/lib/captureLocal.mjs'
import {CHUNK_BYTES,MAX_IMAGE_BYTES} from '@/lib/captureProtocol.mjs'
import useVoiceNotes from './useVoiceNotes'
import styles from './capture.module.css'
const uuid=()=>crypto.randomUUID()
async function api(action,data){const r=await fetch('/api/admin/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...data}),signal:AbortSignal.timeout(60000)});let b;try{b=await r.json()}catch{throw Error('Upload interrupted. Retry when connected.')}if(!r.ok)throw Error(r.status===401?'Your login expired. Sign in again, then return here to resume.':b.error||'Upload failed.');return b}
function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)}
function Photo({asset,label}){const [src,setSrc]=useState('');useEffect(()=>{let active=true,url; if(!asset){setSrc('');return}localGet('asset:'+asset.id).then(a=>{if(!active)return;if(a?.blob){url=URL.createObjectURL(a.blob);setSrc(url)}else if(asset.received)setSrc('/api/admin/capture/image?id='+asset.id)});return()=>{active=false;if(url)URL.revokeObjectURL(url)}},[asset?.id]);return <div className={styles.photo}>{src?<img src={src} alt={label}/>:<span>{label}</span>}<small>{asset?(asset.received?'Received ✓':'Saved on iPad · pending'): 'Not captured'}</small></div>}
export default function CaptureDesk(){
 const [session,setSession]=useState(null),[loaded,setLoaded]=useState(false),[name,setName]=useState(''),[hints,setHints]=useState(''),[error,setError]=useState(''),[progress,setProgress]=useState(''),[camera,setCamera]=useState(false),[resolution,setResolution]=useState(''),[busy,setBusy]=useState(false),[target,setTarget]=useState(null),[history,setHistory]=useState([])
 const current=useRef(null),video=useRef(null),stream=useRef(null),uploading=useRef(false),mutating=useRef(false)
 const picker=useRef(null)
 const voice=useVoiceNotes(session?.id,setError)
 async function save(s){await localPut('active',s);current.current=s;setSession(s)}
 async function refresh(){try{const r=await fetch('/api/admin/capture',{cache:'no-store'});if(r.ok)setHistory((await r.json()).sessions)}catch{}}
 const stop=()=>{stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setCamera(false)}
 useEffect(()=>{localGet('active').then(s=>{current.current=s||null;setSession(s||null);setLoaded(true)}).catch(()=>{setError('Local photo storage is unavailable. Use a regular Safari tab and allow website storage.');setLoaded(false)});refresh();return()=>{stream.current?.getTracks().forEach(t=>t.stop())}},[])
 useEffect(()=>{if(loaded&&session&&!session.finished)upload();const resume=()=>{if(!document.hidden)upload()};window.addEventListener('online',resume);document.addEventListener('visibilitychange',resume);const timer=setInterval(resume,15000);return()=>{window.removeEventListener('online',resume);document.removeEventListener('visibilitychange',resume);clearInterval(timer)}},[loaded,session?.id])
 useEffect(()=>{const warn=e=>{if(current.current&&!current.current.finished){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[])
 async function start(){if(mutating.current)return;mutating.current=true;setBusy(true);setError('');try{await save({id:uuid(),name:name.trim()||'Cards · '+new Date().toLocaleDateString(),hints,cards:[],finished:false});navigator.storage?.persist?.().catch(()=>{});await upload()}catch(e){setError(e.message)}finally{mutating.current=false;setBusy(false)}}
 async function importPhotos(event) {
  const files = Array.from(event.target.files)
  event.target.value = ''
  const existing = current.current
  if (!files.length || mutating.current || existing?.finished || existing?.finishPending || existing?.cards.length) return
  if (files.length % 2 || files.length > 400) {
   setError('Select a front and back for each card, up to 200 cards per batch.')
   return
  }
  // Native Camera numbers its photos sequentially. Other filenames retain picker order.
  if (files.every(file => /^IMG_\d+\./i.test(file.name))) {
   files.sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric:true}))
  }
  mutating.current = true
  setBusy(true)
  setError('')
  const staged = [], cards = []
  try {
   for (const [index,file] of files.entries()) {
    setProgress(`Preparing photo ${index + 1} of ${files.length}`)
    const url = URL.createObjectURL(file)
    const image = new Image()
    try {
     image.src = url
     await image.decode().catch(() => { throw Error('Cannot read '+file.name+'. Choose a JPEG copy in Photos.') })
     let blob = file
     if (!['image/jpeg','image/png'].includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      canvas.getContext('2d').drawImage(image,0,0)
      try { blob = await new Promise(resolve => canvas.toBlob(resolve,'image/jpeg',0.9)) }
      finally { canvas.width = canvas.height = 0 }
     }
     if (!blob || blob.size < 100 || blob.size > MAX_IMAGE_BYTES) throw Error(file.name+' exceeds the photo size limit.')
     const digest = await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())
     const sha256 = Array.from(new Uint8Array(digest),byte => byte.toString(16).padStart(2,'0')).join('')
     const id = uuid()
     await localPut('asset:'+id,{blob,sha256})
     staged.push(id)
     if (index % 2 === 0) cards.push({id:uuid()})
     cards.at(-1)[index % 2 ? 'back' : 'front'] = {id,sha256,bytes:blob.size,mime:blob.type,width:image.naturalWidth,height:image.naturalHeight,received:false,capturedAt:file.lastModified}
    } finally { URL.revokeObjectURL(url) }
   }
   await save(existing ? {...existing,cards} : {id:uuid(),name:name.trim() || 'Cards · '+new Date().toLocaleDateString(),hints,cards,finished:false})
  } catch (error) {
   await Promise.allSettled(staged.map(id => localDelete('asset:'+id)))
   setError(error.message)
   setProgress('')
   return
  } finally { mutating.current = false; setBusy(false) }
  upload()
 }
 async function openCamera(){setError('');try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera requires Safari on a secure HTTPS page.');stop();const s=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:4096},height:{ideal:3072}}});stream.current=s;video.current.srcObject=s;await video.current.play();setCamera(true);const settings=s.getVideoTracks()[0].getSettings();setResolution(`${settings.width} × ${settings.height}`)}catch(e){setError(e.name==='NotAllowedError'?'Allow camera access in Safari, then tap Open camera again.':e.message)}}
 function nextTarget(){const s=current.current;if(target)return target;const last=s.cards.at(-1);return last&&!last.back?{cardId:last.id,side:'back'}:{cardId:null,side:'front'}}
 async function capture(){if(mutating.current||!camera||current.current?.finishPending)return;mutating.current=true;setBusy(true);setError('');try{const capturedAt=Date.now();const v=video.current;if(v.videoWidth<300||v.videoHeight<300)throw Error('Camera is still starting. Try again.');const canvas=document.createElement('canvas');canvas.width=v.videoWidth;canvas.height=v.videoHeight;canvas.getContext('2d').drawImage(v,0,0);const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.96));if(!blob||blob.size>MAX_IMAGE_BYTES)throw Error('Photo could not be saved. Try again.');const bytes=await blob.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join(''),aid=uuid(),t=nextTarget();await localPut('asset:'+aid,{blob,sha256:hash});const s=current.current,cards=s.cards.map(c=>({...c}));let card=cards.find(c=>c.id===t.cardId);if(!card){if(cards.length>=200)throw Error('Finish this 200-card session before starting another.');card={id:uuid()};cards.push(card)}card[t.side]={capturedAt,id:aid,sha256:hash,bytes:blob.size,mime:'image/jpeg',received:false,width:canvas.width,height:canvas.height};await save({...s,cards});setTarget(null);upload()}catch(e){setError('Photo not added: '+e.message)}finally{mutating.current=false;setBusy(false)}}
 async function upload(){if(uploading.current||!current.current||current.current.finished)return;uploading.current=true
  try{const s=current.current;await api('create',{id:s.id,name:s.name,hints:s.hints})
   while(true){const s=current.current;if(!s||s.finished)break;let a;for(const c of s.cards){a=[c.front,c.back].find(x=>x&&!x.received);if(a)break}if(!a)break
    setProgress('Uploading photo… Keep this screen open.');const local=await localGet('asset:'+a.id);if(!local?.blob)throw Error('A pending photo is missing from this iPad. Retake that side.');const data=new Uint8Array(await local.blob.arrayBuffer()),state=await api('start',{...a,sessionId:s.id});if(!state.verified) {
     const count = Math.ceil(data.length / CHUNK_BYTES)
     const pending = Array.from({length:count}, (_,i)=>i).filter(i=>!state.parts.includes(i))
     for (let offset=0; offset<pending.length; offset+=4) {
      const parts = pending.slice(offset,offset+4)
      const results = await Promise.allSettled(parts.map(part=>api('chunk',{
       id:a.id, part, data:base64(data.subarray(part*CHUNK_BYTES,(part+1)*CHUNK_BYTES))
      })))
      const failed = results.find(result=>result.status==='rejected')
      if (failed) throw failed.reason
      const received = state.parts.length + offset + parts.length
      setProgress(`Uploading photo · ${Math.round(received/count*100)}%`)
     }
    }
    const receipt=await api('verify',{id:a.id});if(!receipt.received||receipt.sha256!==a.sha256||receipt.bytes!==a.bytes)throw Error('Receipt did not match this photo. Local original retained.')
    // Re-read inside the mutation lock: a capture/retake may have arrived during upload.
    while(mutating.current)await new Promise(r=>setTimeout(r,25));mutating.current=true
    try{const latest=current.current;await save({...latest,cards:latest.cards.map(c=>({...c,...Object.fromEntries(['front','back'].filter(side=>c[side]?.id===a.id).map(side=>[side,{...c[side],received:true}]))}))})}finally{mutating.current=false}
   }setProgress('All captured images received.');refresh()
  }catch(e){setProgress('Upload paused · local photos retained');setError(e.message)}finally{uploading.current=false}
 }
 async function finish(){if(mutating.current||uploading.current)return;mutating.current=true;setBusy(true);setError('');try{const s=current.current;if(!s.cards.length||s.cards.some(c=>!c.front?.received||!c.back?.received))throw Error('Capture both sides and wait for every image to be received.');await save({...s,finishPending:true});await voice.stop();stop();
   const recorded=await localGet('voice:'+s.id)||[]
   if(recorded.some(c=>c.failed))throw Error('Recording storage failed on this iPad. Saved photos and audio were retained.')
   const clips=recorded.filter(c=>c.parts)
   for(const clip of clips){
    for(let part=0;part<clip.parts;part++){
     const blob=await localGet(clip.id+':'+part)
     if(!blob)throw Error('Missing local audio chunk.')
     const bytes=new Uint8Array(await blob.arrayBuffer())
     for(let offset=0;offset<bytes.length;offset+=CHUNK_BYTES){
      await api('voice',{id:s.id,clip:clip.id,part,offset,data:base64(bytes.subarray(offset,offset+CHUNK_BYTES))})
     }
    }
   }
   const r=await api('finish',{id:s.id,clips,cards:s.cards.map(c=>({id:c.id,front:c.front.id,back:c.back.id,frontAt:c.front.capturedAt,backAt:c.back.capturedAt}))});await save({...s,finished:true,receipt:r});stop();setProgress('All images received · ready for intake.');refresh();for(const clip of clips)for(let part=0;part<clip.parts;part++)await localDelete(clip.id+':'+part);await localDelete('voice:'+s.id);for(const c of s.cards)for(const side of ['front','back'])await localDelete('asset:'+c[side].id)}catch(e){setError('Session completion not confirmed. Tap Finish session again to safely retry. '+e.message)}finally{mutating.current=false;setBusy(false)}}
 const cards=session?.cards||[],photos=cards.flatMap(c=>[c.front,c.back]).filter(Boolean),received=photos.filter(a=>a.received).length,complete=cards.length>0&&cards.every(c=>c.front?.received&&c.back?.received),next=session?nextTarget():{side:'front'}
 return <section className={styles.desk}><header className={styles.heading}><div><span className={styles.eyebrow}>YOUR COLLECTION STARTS HERE</span><h1>Capture cards</h1><p>Front. Back. Next card. Choose existing photos or use the camera.</p></div><a href="/admin/inventory">Back to inventory ↗</a></header>
 {!loaded?<p>Opening saved captures…</p>:!session?<div className={styles.start}><h2>Start a capture session</h2><label>Session name<input value={name} maxLength={120} onChange={e=>setName(e.target.value)} placeholder="2026 Heritage · new arrivals"/></label><label>Set hints or notes <small>optional</small><textarea value={hints} maxLength={2000} onChange={e=>setHints(e.target.value)} placeholder="Anything useful for identifying these cards"/></label><button className={styles.primary} disabled={busy} onClick={start}>Start camera session</button>
 <input ref={picker} type="file" accept="image/*" multiple hidden onChange={importPhotos}/>
 <button disabled={busy} onClick={()=>picker.current.click()}>Select photos to upload</button>
 <p>Choose both sides of each card. Numbered Camera photos are paired by filename. For other photos, select in front/back order.</p>
 {busy && <p role="status">{progress}</p>}</div>:<>
 <div className={styles.summary}><div><small>SESSION</small><h2>{session.name}</h2></div><strong>{cards.length} cards <span> / </span> {received} of {photos.length} images received</strong><span className={styles.badge}>{session.finished?'Ready for intake':session.finishPending?'Confirming receipt':'Capturing'}</span></div>
 {!session.finished && !session.finishPending && !cards.length && <>
  <input ref={picker} type="file" accept="image/*" multiple hidden onChange={importPhotos}/>
  <button className={styles.primary} disabled={busy} onClick={()=>picker.current.click()}>Select photos to upload</button>
 </>}
 {session.finished?<div className={styles.success}><h2>Safely received ✓</h2><p>{cards.length} cards · {photos.length} images. Your session is ready for intake. Identification and valuation have not run yet.</p><button className={styles.primary} onClick={async()=>{await localDelete('active');current.current=null;setSession(null);setProgress('');setName('');setHints('')}}>Capture another session</button></div>:<div className={styles.captureGrid}><div className={styles.cameraPanel}><div className={styles.viewfinder}><video ref={video} playsInline muted autoPlay/><div className={styles.guide} aria-hidden="true"/>{!camera&&<div className={styles.cameraPrompt}><h2>Your iPad is the camera</h2><p>Use even lighting and leave a little space around every edge.</p><button onClick={openCamera} className={styles.primary}>Open camera</button></div>}</div><div className={styles.cameraActions}><div><strong>{target?'Retake':'Capture'} {next.side}</strong><small>{resolution||'Rear camera'} · Full frame preserved</small></div><button className={styles.shutter} disabled={!camera||busy||session.finishPending} onClick={capture}>Take {next.side} photo</button>{camera&&<button disabled={voice.pending||busy||session.finishPending} aria-pressed={voice.recording} onClick={voice.recording?voice.stop:voice.start}>{voice.recording?'Recording · stop mic':'Record voice hints'}</button>}{camera&&<button disabled={voice.pending} onClick={async()=>{await voice.stop();stop()}}>Pause camera</button>}{target&&<button onClick={()=>setTarget(null)}>Cancel retake</button>}</div></div><aside className={styles.instructions}><span className={styles.eyebrow}>CAPTURE → RECEIVE → PROCESS</span><h2>One card at a time.</h2><ol><li>Photograph the front.</li><li>Flip it and photograph the back.</li><li>Move to the next card.</li></ol><p>Check the thumbnails. You can retake either side before finishing.</p><p className={styles.notice}>Keep this screen open until uploads finish. Pending photos are stored on this iPad; do not clear Safari website data before they are received.</p><button onClick={()=>{setError('');upload()}}>Retry pending uploads</button><button className={styles.primary} disabled={!complete||busy||voice.pending} onClick={finish}>Finish session</button><small>Finishing makes this session available for intake. It does not list any cards for sale.</small></aside></div>}
 <div role="status" aria-live="polite" className={styles.status}>{progress}</div>
 <div className={styles.cards}>{cards.map((c,i)=><article key={c.id}><h3>Card {String(i+1).padStart(2,'0')}</h3><div className={styles.pair}>{['front','back'].map(side=><div key={side}><Photo asset={c[side]} label={`Card ${i+1} ${side}`}/>{!session.finished&&<button disabled={busy||session.finishPending} onClick={()=>{setTarget({cardId:c.id,side});if(!camera)openCamera()}}>{c[side]?'Retake':'Capture'} {side}</button>}</div>)}</div></article>)}</div></>}
 {error&&<div role="alert" className={styles.error}>{error}</div>}
 <section className={styles.history}><h2>Recent sessions</h2>{!history.length?<p>Your received sessions will appear here.</p>:history.map(s=><div key={s.id}><strong>{s.name}</strong><span>{s.status==='ready'?`${s.cards.length} cards · Ready for intake`:`${s.received} images received · Not finished`}</span><small>{new Date(Number(s.created_at)).toLocaleString()}</small>{s.intake?.map(r=><small key={r.card_id}>{r.status==='linked_existing'?'Linked to existing card '+r.copy_id:r.status==='imported'?'Inventoried as '+r.copy_id:r.status==='staged'?'Awaiting processing worker':'Needs attention'} · {r.message}</small>)}</div>)}</section></section>
}
