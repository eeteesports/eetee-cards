"""Produce per-card speech hints from a staged Safari recording, with source text retained."""
import json
from pathlib import Path
import sys

def transcribe(folder):
    from faster_whisper import WhisperModel
    timeline = json.loads((folder / 'voice-timeline.json').read_text())
    model = WhisperModel('base.en', device='cpu', compute_type='int8')
    cards = timeline['cards']
    hints = {card['id']: [] for card in cards}
    segments = []
    for clip in timeline['clips']:
        speech, _ = model.transcribe(str(folder / clip['file']), vad_filter=True)
        for segment in speech:
            midpoint = clip['start'] + 500 * (segment.start + segment.end)
            # Natural narration precedes the front or continues while photographing the back.
            # Reject a retake or overlapping capture window rather than shifting later hints.
            matches = []
            for i, card in enumerate(cards):
                lower = cards[i-1].get('backAt') if i else clip['start']
                front, back = card.get('frontAt'), card.get('backAt')
                if lower and front and back and lower <= front <= back and max(lower,front-30000) <= midpoint <= back:
                    matches.append(card['id'])
            matched = matches[0] if len(matches)==1 else None
            segments.append(dict(clip=clip['id'],start=segment.start,end=segment.end,text=segment.text,card=matched))
            if matched:
                hints[matched].append(segment.text.strip())
    result = dict(source='machine transcript of owner narration; verify against photos',segments=segments,hints=hints)
    temporary = folder / 'voice-hints.tmp'
    temporary.write_text(json.dumps(result,indent=2))
    temporary.replace(folder / 'voice-hints.json')

if __name__ == '__main__':
    transcribe(Path(sys.argv[1]))
