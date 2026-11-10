"""Portable intake evidence for the web queues; never treats asking prices as value."""
import json
from pathlib import Path
from batch_progress import pairing
from batch_review import fingerprint

def intake_status(card, report, root):
    identity=card.get('identity') or {}
    states=card.get('field_states') or {}
    images=card.get('images') or {}
    value={}
    batch=card.get('batch_id')
    if batch:
        try:
            values=json.loads((Path(root)/'listing-review'/batch/'valuations.json').read_text())
            value=values.get(card['id'],{})
        except (OSError, ValueError): pass
    current=bool(value) and value.get('fingerprint')==fingerprint(card)
    allowed=('status','low_usd','high_usd','basis','comparables','researched_at')
    valuation={k:value[k] for k in allowed if k in value}
    valuation['current']=current
    return dict(
        version=1, images={s:bool(images.get(s)) for s in ('front','back')},
        pairing=pairing(card),
        identityComplete=all(identity.get(k) for k in ('player','season','manufacturer','set','card_number')),
        finishConfirmed=states.get('parallel') in ('machine_identified','confirmed_absent','owner_verified','owner_absent'),
        processing=card.get('processing_status') in ('queued','identifying','processing'),
        imageReview=any(q.get('field') in ('images','capture') for q in report.get('questions',[])),
        questions=[q for q in report.get('questions',[]) if not (q.get('field')=='parallel' and states.get('parallel') in ('machine_identified','confirmed_absent','owner_verified','owner_absent') and 'optional' in q.get('reason',''))],valuation=valuation)
