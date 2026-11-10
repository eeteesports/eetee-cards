// Durable handoff receipts. A received image is not an inventoried physical copy.
export function captureIntake(db){
 let ready
 const init=()=>ready ||= db.execute(`CREATE TABLE IF NOT EXISTS capture_intake_receipts(session_id TEXT NOT NULL,card_id TEXT NOT NULL,front_id TEXT NOT NULL,back_id TEXT NOT NULL,status TEXT NOT NULL,copy_id TEXT,message TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(session_id,card_id))`).catch(e=>{ready=null;throw e})
 return {
  async list(){await init();return (await db.execute('SELECT * FROM capture_intake_receipts')).rows},
  async record({sessionId,cardId,front,back,status,copyId=null,message=''}){
   if(!['staged','blocked','imported','linked_existing'].includes(status))throw Error('Invalid handoff status')
   if(['imported','linked_existing'].includes(status)&&!copyId)throw Error('Inventory copy receipt required')
   if(message.length>2000)throw Error('Receipt message too long')
   await init();const tx=await db.transaction('write')
   try{
    const s=(await tx.execute({sql:'SELECT status,manifest FROM capture_sessions WHERE id=?',args:[sessionId]})).rows[0]
    if(!s||s.status==='capturing')throw Error('Capture must be finished first')
    const card=JSON.parse(s.manifest).find(c=>c.id===cardId)
    if(!card||card.front!==front||card.back!==back)throw Error('Capture pair changed')
    const old=(await tx.execute({sql:'SELECT * FROM capture_intake_receipts WHERE session_id=? AND card_id=?',args:[sessionId,cardId]})).rows[0]
    if(old&&['imported','linked_existing'].includes(old.status)){
     if(old.copy_id!==copyId||old.status!==status)throw Error('A physical-copy receipt cannot be reassigned')
     return old
    }
    await tx.execute({sql:'INSERT INTO capture_intake_receipts VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(session_id,card_id) DO UPDATE SET status=excluded.status,copy_id=excluded.copy_id,message=excluded.message,updated_at=excluded.updated_at',args:[sessionId,cardId,front,back,status,copyId,message,Date.now()]})
    await tx.commit();return {saved:true}
   }catch(e){await tx.rollback();throw e}finally{tx.close()}
  }
 }
}
