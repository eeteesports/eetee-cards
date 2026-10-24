import {LEGACY_FIELDS,publicMetadata} from './cardEditorInput.mjs'
export async function initializeCardEdits(db){await db.batch([
 `CREATE TABLE IF NOT EXISTS storefront_card_edits(card_id TEXT PRIMARY KEY,data TEXT NOT NULL,revision INTEGER NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS storefront_card_edit_history(id TEXT PRIMARY KEY,card_id TEXT NOT NULL,before_data TEXT NOT NULL,after_data TEXT NOT NULL,created_at INTEGER NOT NULL)`],'write')}
export async function cardEditMap(db){await initializeCardEdits(db);return new Map((await db.execute('SELECT * FROM storefront_card_edits')).rows.map(r=>[r.card_id,{data:JSON.parse(r.data),revision:Number(r.revision)}]))}
export function applyPublicEdit(card,edit){return edit?{...card,...publicMetadata(edit.data)}:card}
export function applyLegacyEdit(record,edit){if(!edit)return record;const fields={...record.fields};for(const [k,label]of Object.entries({family:'Family',collection:'Collection',location:'Location'}))if(edit.data[k]!==undefined)fields[label]=edit.data[k];if(edit.data.autograph!==undefined||edit.data.memorabilia!==undefined){let tags=fields.Tags||[];if(edit.data.autograph!==undefined)tags=tags.filter(x=>x!=='Auto').concat(edit.data.autograph?['Auto']:[]);if(edit.data.memorabilia!==undefined)tags=tags.filter(x=>x!=='Patch').concat(edit.data.memorabilia?['Patch']:[]);fields.Tags=tags}return {...record,fields}}
