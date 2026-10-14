"""Curate disjoint physical lots from an owner-priced local inventory snapshot."""
import argparse,collections,hashlib,json,random,re,sqlite3
from pathlib import Path
from PIL import Image,ImageOps
TEAMS=['Arizona Cardinals','Atlanta Falcons','Baltimore Ravens','Buffalo Bills','Carolina Panthers','Chicago Bears','Cincinnati Bengals','Cleveland Browns','Dallas Cowboys','Denver Broncos','Detroit Lions','Green Bay Packers','Houston Texans','Indianapolis Colts','Jacksonville Jaguars','Kansas City Chiefs','Las Vegas Raiders','Los Angeles Chargers','Los Angeles Rams','Miami Dolphins','Minnesota Vikings','New England Patriots','New Orleans Saints','New York Giants','New York Jets','Philadelphia Eagles','Pittsburgh Steelers','San Francisco 49ers','Seattle Seahawks','Tampa Bay Buccaneers','Tennessee Titans','Washington Commanders']
ALIASES={'Houston Oilers':'Tennessee Titans','Washington Redskins':'Washington Commanders','St. Louis Rams':'Los Angeles Rams','Oakland Raiders':'Las Vegas Raiders','Los Angeles Raiders':'Las Vegas Raiders','San Diego Chargers':'Los Angeles Chargers','Baltimore Colts':'Indianapolis Colts','Phoenix Cardinals':'Arizona Cardinals','Cardinals':'Arizona Cardinals','Chargers':'Los Angeles Chargers','Buffalo':'Buffalo Bills'}
def norm(x):return ' '.join(re.findall(r'[a-z0-9]+',str(x or '').lower()))
def identity(c):
 s=norm(c['set']);s=re.sub(r'^topps ','',s) if c['brand']=='Topps' else s;s=re.sub(r' football$','',s)
 p=norm(c['parallel'])
 p='' if p in ('base','standard','regular') else re.sub(r'\bprizm\b','',p).strip()
 p='refractor' if p in ('base refractor','silver refractor') else p
 if p in ('fanatics exclusive topps logo refractor','topps logo refractor','topps refractor'):p='topps logo refractor'
 f=norm(c['family']);f='base' if f in ('base','base rookies','rookies','concourse','premier level','club level','field level','') else f
 f='select certified' if f=='select certified rookies' else f
 return (norm(c['season']),norm(c['brand']),s,norm(c['player']),norm(c['number']),f,p)
def asking(c):
 f=c.get('financial') or {};i=c.get('identity') or {}
 if f.get('asking_manual'):return f.get('asking')
 if i.get('list_price') is not None:return float(i['list_price'])
 return {'fifty':.5,'one':1}.get((c.get('sorting') or {}).get('bucket'))
def plan(pool,count):
 from scipy.optimize import milp,Bounds,LinearConstraint
 from scipy.sparse import coo_matrix
 import numpy as np
 if not pool:return []
 n=len(pool);players=sorted({c['player'] for c in pool});pcount=len(players);tier_values=sorted({c['units'] for c in pool});tcount=len(tier_values)
 variables=n*count+pcount*count+tcount*count;objective=np.zeros(variables)
 rows=[];cols=[];weights=[];lower=[];upper=[]
 def constraint(items,lo,hi):
  row=len(lower);lower.append(lo);upper.append(hi)
  for col,weight in items:rows.append(row);cols.append(col);weights.append(weight)
 def xi(k,i):return k*n+i
 def yi(k,p):return n*count+k*pcount+p
 def zi(k,t):return (n+pcount)*count+k*tcount+t
 for i in range(n):constraint([(xi(k,i),1) for k in range(count)],0,1)
 identities=collections.defaultdict(list)
 for i,c in enumerate(pool):identities[identity(c)].append(i)
 for k in range(count):
  constraint([(xi(k,i),c['units']) for i,c in enumerate(pool)],60,65)
  for indices in identities.values():constraint([(xi(k,i),1) for i in indices],0,1)
  for p,player in enumerate(players):
   indices=[i for i,c in enumerate(pool) if c['player']==player]
   constraint([(xi(k,i),1) for i in indices],0,3)
   constraint([(yi(k,p),1)]+[(xi(k,i),-1) for i in indices],-np.inf,0)
   objective[yi(k,p)]=-100
  for t,tier in enumerate(tier_values):
   indices=[i for i,c in enumerate(pool) if c['units']==tier]
   constraint([(zi(k,t),1)]+[(xi(k,i),-1) for i in indices],-np.inf,0)
   if tier in (1,2) and len(indices)>=count:constraint([(xi(k,i),1) for i in indices],1,np.inf)
   objective[zi(k,t)]=-5
  for i,c in enumerate(pool):objective[xi(k,i)]=-.025*c['units']+.0001*i
  if k:
   constraint([(xi(k-1,i),c['units']) for i,c in enumerate(pool)]+[(xi(k,i),-c['units']) for i,c in enumerate(pool)],0,np.inf)
 matrix=coo_matrix((weights,(rows,cols)),shape=(len(lower),variables)).tocsc()
 result=milp(objective,integrality=np.ones(variables),bounds=Bounds(np.zeros(variables),np.ones(variables)),constraints=LinearConstraint(matrix,lower,upper),options={'time_limit':18,'mip_rel_gap':.02})
 if result.x is None:return []
 lots=[[c for i,c in enumerate(pool) if result.x[xi(k,i)]>.5] for k in range(count)]
 if any(not 60<=sum(c['units'] for c in lot)<=70 or len({identity(c) for c in lot})!=len(lot) or max(collections.Counter(c['player'] for c in lot).values())>3 for lot in lots):return []
 if len({c['id'] for lot in lots for c in lot})!=sum(len(lot) for lot in lots):return []
 return lots

def main():
 a=argparse.ArgumentParser();a.add_argument('--source',required=True);a.add_argument('--library',required=True);a.add_argument('--site',required=True);a.add_argument('--audit',required=True);args=a.parse_args()
 site=Path(args.site);audit=Path(args.audit);audit.mkdir(parents=True,exist_ok=True);assets=site/'public/team-bundles';assets.mkdir(parents=True,exist_ok=True)
 with sqlite3.connect(f'file:{Path(args.library)/"collection.sqlite"}?mode=ro',uri=True) as db:originals={json.loads(r[0])['id']:json.loads(r[0]) for r in db.execute('SELECT data FROM copies')}
 source=json.loads(Path(args.source).read_text());eligible=collections.defaultdict(list);skipped=collections.Counter()
 for c in source['records']:
  if c['ownership']!='owned' or c.get('financial',{}).get('sale_eligible') is False:continue
  price=asking(c)
  if price is None or not 0<price<=2:continue
  if c.get('financial',{}).get('correction_status')=='pending':skipped['pending_correction']+=1;continue
  if not all(c.get(k) for k in ('player','season','set','number')):skipped['incomplete_identity']+=1;continue
  teams={ALIASES.get(t.strip(),t.strip()) for raw in c['teams'] for t in raw.split('/')};teams&=set(TEAMS)
  if len(teams)!=1:skipped['team_ambiguous_or_non_NFL']+=1;continue
  i=c.get('identity') or {}
  if i.get('grading_company') or 'psa' in norm(i.get('grading_status')):skipped['graded']+=1;continue
  paths={};ok=True
  for side in ('front','back'):
   raw=(originals.get(c['id'],{}).get('images') or {}).get(side)
   if not raw:ok=False;break
   path=Path(raw);preview=Path(raw+'.preview.jpg');path=preview if preview.is_file() else path
   try:
    if path.stat().st_flags&0x40000000:ok=False;break
    with Image.open(path) as im:im.verify()
   except Exception:ok=False;break
   paths[side]=str(path)
  if not ok:skipped['image_unavailable']+=1;continue
  eligible[next(iter(teams))].append(dict(c,price=price,units=round(price*2),source_images=paths))
 public=[];private=[];summary=[];allocated=set()
 for team in TEAMS:
  pool=eligible[team];best=[];score=None
  for count in (3,2,1):
   best=plan(pool,count)
   if best:break
  print(team,len(best),'sets planned',flush=True)
  slug=team.lower().replace(' ','-')
  for n,lot in enumerate(best,1):
   bid=f'{slug}-{n:02d}';cards=[]
   for c in sorted(lot,key=lambda c:(c['player'],c['season'],c['set'],c['number'])):
    assert c['id'] not in allocated;allocated.add(c['id']);pid=hashlib.sha256(c['id'].encode()).hexdigest()[:16];photos={}
    for side,path in c['source_images'].items():
     dest=assets/f'{pid}-{side}.webp'
     with Image.open(path) as im:
      image=ImageOps.exif_transpose(im).convert('RGB');image.thumbnail((480,620));image.save(dest,'WEBP',quality=83)
     photos[side]='/team-bundles/'+dest.name
    cards.append(dict(id=pid,player=c['player'],year=c['season'],brand=c['brand'],set=c['set'],number=c['number'],family=c['family'],parallel=c['parallel'],serial=c['serial'],rookie=c['rookie'],**photos))
   value=sum(c['price'] for c in lot);assert 30<=value<=35;assert len({identity(c) for c in lot})==len(lot)
   tier=collections.Counter(f"{c['price']:g}" for c in lot)
   public.append(dict(id=bid,team=team,name=f'Team set {n}',price=20,playerCount=len({c['player'] for c in lot}),cards=cards))
   private.append(dict(id=bid,team=team,cards=[c['id'] for c in lot],asking=20,value=value,status='curated',notes='Public team bundle; shipping additional; owner asking prices; no duplicates within lot.'))
  summary.append(dict(team=team,sets=len(best),eligibleCopies=len(pool),uniqueIdentities=len({identity(c) for c in pool}),eligibleValue=sum(c['price'] for c in pool),lots=[dict(id=f'{slug}-{n:02d}',value=sum(c['price'] for c in lot),cards=len(lot),players=len({c['player'] for c in lot}),maxPerPlayer=max(collections.Counter(c['player'] for c in lot).values())) for n,lot in enumerate(best,1)]))
 result=dict(asOf='October 13, 2026',teams=TEAMS,bundles=public)
 (site/'data/team-bundles.json').write_text(json.dumps(result,separators=(',',':')))
 (audit/'picking-manifest.json').write_text(json.dumps(private,indent=2));(audit/'coverage.json').write_text(json.dumps(dict(teams=summary,skipped=dict(skipped),bundleCount=len(public),physicalCards=len(allocated)),indent=2))
 print('Bundles',len(public),'cards',len(allocated),'skipped',dict(skipped))
 for s in summary:print(s['team'],s['sets'],'sets',','.join(f"${l['value']:g}/{l['cards']} cards/{l['players']} players" for l in s['lots']))
if __name__=='__main__':main()
