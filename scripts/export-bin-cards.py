"""Export only owner-priced $0.50/$1 physical copies unallocated to public lots."""
import argparse,collections,hashlib,json,sqlite3
from pathlib import Path
from PIL import Image,ImageOps
from importlib.util import spec_from_file_location,module_from_spec
spec=spec_from_file_location('curate',Path(__file__).with_name('curate-team-bundles.py'));curate=module_from_spec(spec);spec.loader.exec_module(curate)
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--library',required=True);p.add_argument('--site',required=True);p.add_argument('--audit',required=True);a=p.parse_args()
site=Path(a.site);audit=Path(a.audit);assets=site/'public/team-bundles';assets.mkdir(exist_ok=True)
source=json.loads(Path(a.source).read_text());lots=json.loads((audit/'picking-manifest.json').read_text());used={cid for lot in lots for cid in lot['cards']}
with sqlite3.connect(f'file:{Path(a.library)/"collection.sqlite"}?mode=ro',uri=True) as db:originals={c['id']:c for (raw,) in db.execute('SELECT data FROM copies') for c in [json.loads(raw)]}
public=[];private=[];skipped=collections.Counter()
for c in source['records']:
 price=curate.asking(c)
 if c['id'] in used or c['ownership']!='owned' or c.get('financial',{}).get('sale_eligible') is False or price not in (.5,1):continue
 if c.get('financial',{}).get('correction_status')=='pending':skipped['pending_correction']+=1;continue
 if not all(c.get(k) for k in ('player','season','set','number')):skipped['incomplete_identity']+=1;continue
 pid=hashlib.sha256(c['id'].encode()).hexdigest()[:16];paths={};valid=True
 for side in ('front','back'):
  cached=assets/f'{pid}-{side}.webp';raw=(originals.get(c['id'],{}).get('images') or {}).get(side)
  path=Path(raw) if raw else cached;preview=Path(str(path)+'.preview.jpg');path=preview if preview.is_file() else path
  try:
   if path.stat().st_flags&0x40000000:path=cached
   with Image.open(path) as im:im.verify()
  except Exception:
   if cached.is_file():path=cached
   else:valid=False;break
  paths[side]=path
 if not valid:skipped['image_unavailable']+=1;continue
 photos={}
 for side,path in paths.items():
  dest=assets/f'{pid}-{side}.webp'
  if path.resolve()!=dest.resolve():
   with Image.open(path) as im:image=ImageOps.exif_transpose(im).convert('RGB');image.thumbnail((480,620));image.save(dest,'WEBP',quality=83)
  photos[side]='/team-bundles/'+dest.name
 i=c.get('identity') or {};listing=hashlib.sha256(json.dumps([curate.identity(c),price,(c.get('financial') or {}).get('condition'),i.get('grading_company'),i.get('condition_grade')],sort_keys=True).encode()).hexdigest()[:16]
 public.append(dict(id=pid,listingId=listing,binPriceCents=round(price*100),player=c['player'],year=c['season'],brand=c['brand'],set=c['set'],number=c['number'],family=c['family'],parallel=c['parallel'],serial=c['serial'],rookie=c['rookie'],autograph=i.get('autograph') is True or i.get('autographed')=='Yes',printRun=i.get('print_run'),teams=sorted({curate.ALIASES.get(t.strip(),t.strip()) for raw in c['teams'] for t in raw.split('/')}),**photos))
 private.append(dict(publicId=pid,copyId=c['id'],listingId=listing,price=price,player=c['player'],year=c['season'],set=c['set'],number=c['number'],family=c['family'],parallel=c['parallel']))
(site/'data/bin-cards.json').write_text(json.dumps(dict(cards=public),separators=(',',':')))
(audit/'bin-picking-manifest.json').write_text(json.dumps(private,indent=2));(audit/'bin-coverage.json').write_text(json.dumps(dict(count=len(public),byPrice=dict(collections.Counter(str(c['binPriceCents']/100) for c in public)),skipped=dict(skipped)),indent=2))
assert not used&{c['copyId'] for c in private};print('Bin cards',len(public),'tiers',dict(collections.Counter(c['binPriceCents'] for c in public)),'skipped',dict(skipped))
