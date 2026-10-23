import 'server-only'
import {getTurso} from './db'
import {initializeStorefrontOrders} from './storefrontOrders'
let ready
export function initializeOwnerAnalytics(){if(!ready)ready=getTurso().batch([
 `CREATE TABLE IF NOT EXISTS storefront_analytics_events(id TEXT PRIMARY KEY,session TEXT NOT NULL,event TEXT NOT NULL,path TEXT NOT NULL,ts INTEGER NOT NULL,detail TEXT NOT NULL,referrer TEXT NOT NULL,device TEXT NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS storefront_analytics_time ON storefront_analytics_events(ts)`,
 `CREATE INDEX IF NOT EXISTS storefront_analytics_session ON storefront_analytics_events(session,ts)`,
 `CREATE TABLE IF NOT EXISTS storefront_analytics_meta(id TEXT PRIMARY KEY,payload TEXT NOT NULL)`,
 {sql:'INSERT OR IGNORE INTO storefront_analytics_meta VALUES(?,?)',args:['started',JSON.stringify({at:Date.now()})]},
 {sql:'DELETE FROM storefront_analytics_events WHERE ts<?',args:[Date.now()-90*86400000]}
 ],'write').catch(e=>{ready=null;throw e});return ready}
export async function saveAnalyticsEvent(input){await initializeOwnerAnalytics();const db=getTurso();const now=Date.now();await db.execute({sql:'DELETE FROM storefront_analytics_events WHERE ts<?',args:[now-90*86400000]});await db.execute({sql:`INSERT OR IGNORE INTO storefront_analytics_events(id,session,event,path,ts,detail,referrer,device) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM storefront_analytics_events WHERE session=? AND ts>?)<1000`,args:[input.id,input.session,input.event,input.path,now,input.detail,input.referrer,input.device,input.session,now-86400000]})}
export async function ownerAnalytics(days){await initializeOwnerAnalytics();await initializeStorefrontOrders();const since=Date.now()-days*86400000,db=getTurso();const query=async(sql,args=[since])=>(await db.execute({sql,args})).rows
 const [summary,pages,daily,journeys,actions,devices,referrers,funnel,orders,meta]=await Promise.all([
 query(`SELECT COUNT(*) AS pageviews,COUNT(DISTINCT session) AS visits FROM storefront_analytics_events WHERE ts>=? AND event='page_view'`),
 query(`SELECT path,COUNT(*) AS views,COUNT(DISTINCT session) AS visits FROM storefront_analytics_events WHERE ts>=? AND event='page_view' GROUP BY path ORDER BY views DESC`),
 query(`SELECT date(ts/1000,'unixepoch') AS day,COUNT(*) AS views,COUNT(DISTINCT session) AS visits FROM storefront_analytics_events WHERE ts>=? AND event='page_view' GROUP BY day ORDER BY day`),
 query(`WITH pages AS (SELECT path,LAG(path) OVER(PARTITION BY session ORDER BY ts,rowid) AS previous FROM storefront_analytics_events WHERE ts>=? AND event='page_view') SELECT previous,path,COUNT(*) AS count FROM pages WHERE previous IS NOT NULL AND previous!=path GROUP BY previous,path ORDER BY count DESC LIMIT 10`),
 query(`SELECT event,detail,COUNT(*) AS count,COUNT(DISTINCT session) AS visits FROM storefront_analytics_events WHERE ts>=? AND event!='page_view' GROUP BY event,detail ORDER BY count DESC LIMIT 25`),
 query(`SELECT device,COUNT(DISTINCT session) AS visits FROM storefront_analytics_events WHERE ts>=? AND event='page_view' GROUP BY device ORDER BY visits DESC`),
 query(`SELECT referrer,COUNT(DISTINCT session) AS visits FROM storefront_analytics_events WHERE ts>=? AND event='page_view' AND referrer NOT IN ('eetee.cards','www.eetee.cards') GROUP BY referrer ORDER BY visits DESC LIMIT 10`),
 query(`WITH e AS (SELECT rowid AS seq,* FROM storefront_analytics_events WHERE ts>=?),v AS (SELECT session,MIN(seq) AS seq FROM e WHERE event='page_view' GROUP BY session),b AS (SELECT e.session,MIN(e.seq) AS seq FROM e JOIN v ON e.session=v.session AND e.seq>=v.seq WHERE e.event='page_view' AND e.path IN ('/cards','/bins','/team-sets') GROUP BY e.session),c AS (SELECT e.session,MIN(e.seq) AS seq FROM e JOIN b ON e.session=b.session AND e.seq>=b.seq WHERE e.event='add_to_cart' GROUP BY e.session),k AS (SELECT e.session,MIN(e.seq) AS seq FROM e JOIN c ON e.session=c.session AND e.seq>=c.seq WHERE e.event='begin_checkout' GROUP BY e.session) SELECT (SELECT COUNT(*) FROM v) AS visits,(SELECT COUNT(*) FROM b) AS browsed,(SELECT COUNT(*) FROM c) AS cart,(SELECT COUNT(*) FROM k) AS checkout`),
 query(`SELECT COUNT(*) AS paid,COALESCE(SUM(json_extract(manifest,'$.totalCents')),0) AS revenueCents FROM storefront_orders WHERE status='paid' AND created_at>=?`),
 query('SELECT id,payload FROM storefront_analytics_meta',[])
 ])
 return {days,since,updatedAt:Date.now(),summary:summary[0],pages,daily,journeys,actions,devices,referrers,funnel:funnel[0],orders:orders[0],started:JSON.parse(meta.find(m=>m.id==='started').payload).at,historical:meta.find(m=>m.id==='vercel_snapshot')?JSON.parse(meta.find(m=>m.id==='vercel_snapshot').payload):null}
}
