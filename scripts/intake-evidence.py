#!/usr/bin/env python3
"""Read canonical saved records only. No model calls, photo decoding, or writes."""
import json,sqlite3,sys
from pathlib import Path
project=Path(__file__).resolve().parents[2]
sys.path.insert(1,str(project/'eetee-cards-app/native-scan/worker'))
from intake_status import intake_status
from focused_review import describe
root=Path(json.loads((project/'intake/scanner-library-location.json').read_text())['path'])
with sqlite3.connect(f'file:{root / "collection.sqlite"}?mode=ro',uri=True) as db:
 rows=[json.loads(r[0]) for r in db.execute('SELECT data FROM copies')]
print(json.dumps([{'id':c['id'],'identity':c.get('identity',{}),'intake':intake_status(c,describe(c),root)} for c in rows]))
