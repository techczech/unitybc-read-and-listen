"""Integrity and privacy checks for the deliberately selected public export."""
from pathlib import Path
import json, hashlib, re
root = Path(__file__).resolve().parents[1]
manifest = json.loads((root/'assets/manifest-unitybc-audio.json').read_text())
for filename, info in manifest['assets'].items():
    data=(root/filename).read_bytes()
    assert len(data)==info['bytes'] and hashlib.sha256(data).hexdigest()==info['sha256'], filename
routes=json.loads((root/'assets/manifest-unitybc-pages.json').read_text())
assert len(routes)==15
for route in routes:
    body=(root/route['file']).read_text()
    assert 'audio/mpeg;base64' not in body
    assert 'preload="none"' in body
    data=json.loads(re.search(r'<script id="material-data"[^>]*>(.*?)</script>',body,re.S).group(1))
    for unit in data['units']:
        assert 'provenance' not in unit
        for track in unit['tracks'].values(): assert (root/track.lstrip('/')).is_file()
        for pair in unit['interpreterPairs']:
            for lang,span in pair.items():
                assert 0<=span['charStart']<span['charEnd']<=len(unit['text'][lang])
                assert span['start']<span['end']
    for ref in re.findall(r'(?:src|href)="(/[^"?#]*)',body):
        assert (root/(ref.lstrip('/') or 'index.html')).exists(), (route['file'],ref)
blocked=['/Users/','/private/tmp/','sample-runs/current/','email-attachments/','provider-consent.yaml','Bearer sk-']
for f in root.rglob('*'):
    if not f.is_file() or any(x in f.parts for x in ['.git','verification-local','__pycache__']) or f.suffix=='.mp3':continue
    # The privacy check itself names forbidden strings; do not scan its own literals.
    if f==Path(__file__):continue
    content=f.read_text(errors='ignore')
    for token in blocked:assert token not in content,(f.relative_to(root),token)
print(json.dumps({'routes':len(routes),'audioAssets':len(manifest['assets']),'audioBytes':sum(x['bytes'] for x in manifest['assets'].values()),'integrity':'passed','privatePaths':'absent'}))
