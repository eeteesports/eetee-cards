"""Export owner-priced individual cards above $1, excluding team-set and eBay allocations."""
import argparse,collections,hashlib,json,sqlite3
from pathlib import Path
from PIL import Image,ImageOps
from importlib.util import spec_from_file_location,module_from_spec
spec=spec_from_file_location('curate',Path(__file__).with_name('curate-team-bundles.py'));curate=module_from_spec(spec);spec.loader.exec_module(curate)
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--library',required=True);p.add_argument('--site',required=True);p.add_argument('--audit',required=True);p.add_argument('--exclude-copy-ids',required=True);a=p.parse_args()
site=Path(a.site);audit=Path(a.audit);assets=site/'public/team-bundles';assets.mkdir(exist_ok=True)
source=json.loads(Path(a.source).read_text());lots=json.loads((audit/'picking-manifest.json').read_text());used={cid for lot in lots for cid in lot['cards']};excluded=set(json.loads(Path(a.exclude_copy_ids).read_text()))
with sqlite3.connect(f'file:{Path(a.library)/"collection.sqlite"}?mode=ro',uri=True) as db:originals={c['id']:c for (raw,) in db.execute('SELECT data FROM copies') for c in [json.loads(raw)]}
public=[];private=[];skipped=collections.Counter()
for c in source['records']:
 price=curate.asking(c)
 if c['id'] in used or c['ownership']!='owned' or c.get('financial',{}).get('sale_eligible') is False or price is None or price<=1 or c['id'] in excluded:continue
 if (c.get('identity') or {}).get('reprint') or (c.get('identity') or {}).get('reproduction'):skipped['reprint']+=1;continue
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
   with Image.open(path) as im:image=ImageOps.exif_transpose(im).convert('RGB');image.thumbnail((960,1240));image.save(dest,'WEBP',quality=83)
  photos[side]='/team-bundles/'+dest.name
 i=c.get('identity') or {};listing=hashlib.sha256(json.dumps([curate.identity(c),price,(c.get('financial') or {}).get('condition'),i.get('grading_company'),i.get('condition_grade')],sort_keys=True).encode()).hexdigest()[:16]
 public.append(dict(id=pid,listingId=listing,priceCents=round(price*100),player=c['player'],year=c['season'],brand=c['brand'],set=c['set'],number=c['number'],family=c['family'],parallel=c['parallel'],serial=c['serial'],rookie=c['rookie'],sport=c.get('sport') or i.get('sport') or 'Football',memorabilia=c.get('memorabilia') is True,graded=i.get('graded') is True or bool(i.get('grading_company') and i.get('condition_grade')),grader=i.get('grading_company') or '',grade=str(i.get('condition_grade') or ''),autograph=i.get('autograph') is True or i.get('autographed')=='Yes',printRun=i.get('print_run'),teams=sorted({curate.ALIASES.get(t.strip(),t.strip()) for raw in c['teams'] for t in raw.split('/')}),**photos))
 private.append(dict(publicId=pid,copyId=c['id'],listingId=listing,price=price,player=c['player'],year=c['season'],set=c['set'],number=c['number'],family=c['family'],parallel=c['parallel']))
(site/'data/individual-cards.json').write_text(json.dumps(dict(cards=public),separators=(',',':')))
(audit/'individual-picking-manifest.json').write_text(json.dumps(private,indent=2));(audit/'individual-coverage.json').write_text(json.dumps(dict(count=len(public),byPrice=dict(collections.Counter(str(c['priceCents']/100) for c in public)),skipped=dict(skipped)),indent=2))
assert not used&{c['copyId'] for c in private};print('Individual cards',len(public),'tiers',dict(collections.Counter(c['priceCents'] for c in public)),'skipped',dict(skipped))
