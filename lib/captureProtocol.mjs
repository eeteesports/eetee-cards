export const CHUNK_BYTES = 192 * 1024
export const MAX_IMAGE_BYTES = 16 * 1024 * 1024
export const fail = (message, status = 400) => Object.assign(new Error(message), {status})
export function id(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(value)) throw fail('Invalid capture identifier.')
  return value
}
export function assetInput(a) {
  id(a.id); id(a.sessionId)
  if (!Number.isSafeInteger(a.bytes) || a.bytes < 100 || a.bytes > MAX_IMAGE_BYTES) throw fail('Image must be between 100 bytes and 16 MB.')
  if (!/^[a-f0-9]{64}$/.test(a.sha256 || '')) throw fail('Image checksum required.')
  if (!['image/jpeg','image/png'].includes(a.mime)) throw fail('Capture a JPEG or PNG image.')
  return {id:a.id,sessionId:a.sessionId,bytes:a.bytes,sha256:a.sha256,mime:a.mime,chunks:Math.ceil(a.bytes/CHUNK_BYTES)}
}
export function manifestInput(cards) {
  if (!Array.isArray(cards) || !cards.length || cards.length > 200) throw fail('A session needs 1–200 complete cards.')
  const ids = new Set(), assets = new Set()
  return cards.map(c => {
    id(c.id); id(c.front); id(c.back)
    if (ids.has(c.id) || assets.has(c.front) || assets.has(c.back) || c.front === c.back) throw fail('Each card side needs its own capture.')
    ids.add(c.id); assets.add(c.front); assets.add(c.back)
    return {id:c.id,front:c.front,back:c.back}
  })
}
