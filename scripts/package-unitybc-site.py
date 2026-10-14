"""Create the deployment folder from an explicit static-file allowlist."""
from pathlib import Path
import shutil,json
root=Path(__file__).resolve().parents[1]
out=root/'dist'
if out.exists():shutil.rmtree(out)
out.mkdir()
pages=[x['file'] for x in json.loads((root/'assets/manifest-unitybc-pages.json').read_text())]
for name in pages+['about.html','embed-guide.html','embed-example.html','_headers']:
    shutil.copy2(root/name,out/name)
shutil.copytree(root/'assets',out/'assets')
print(f'Packaged {len(pages)} reader pages and static assets in dist/')
