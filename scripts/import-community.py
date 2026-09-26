"""Download reference scans from the public WowBGAssist repository.

No remote Java/Lua code is executed. Reference scans do not automatically become
playable cards: each rule needs a reviewed declarative engine implementation.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import urllib.request
import hashlib
from datetime import date

ROOT = Path(__file__).resolve().parents[1]
REPO = 'eidonia/WowBGAssist'
COMMIT = 'a68e639528069028a98de490602f93a93020a061'
headers = {'User-Agent': 'Lordaeron-Reference-Importer'}
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=35) as response:
        return response.read()

def main():
    tree = json.loads(get(f'https://api.github.com/repos/{REPO}/git/trees/{COMMIT}?recursive=1'))
    commit = COMMIT
    files = [f for f in tree['tree'] if f['path'].endswith('.jpg') or ('/drawable/' in f['path'] and f['path'].endswith('.png'))]
    target = ROOT / 'public' / 'assets' / 'reference'
    target.mkdir(parents=True, exist_ok=True)
    def download(f):
        name = Path(f['path']).name
        url = f'https://raw.githubusercontent.com/{REPO}/{commit}/{f["path"]}'
        path = target / name
        raw = path.read_bytes() if path.exists() else get(url)
        blob_hash = lambda data: hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()
        if blob_hash(raw) != f['sha']:
            raw = get(url)
        if len(raw) != f['size'] or blob_hash(raw) != f['sha']:
            raise ValueError(f'Integrity check failed: {name}')
        if not path.exists() or path.read_bytes() != raw:
            path.write_bytes(raw)
        stem = path.stem
        category = stem.split('_')[0] if path.suffix == '.jpg' else 'creature'
        return {'id':stem, 'name':stem.partition('_')[2].replace('_',' ').title() if category != 'creature' else stem.replace('_',' ').title(), 'category':category, 'back':stem.endswith('_back'), 'image':f'/assets/reference/{name}', 'source':url, 'sha256':hashlib.sha256(raw).hexdigest(), 'status':'reference-only'}
    with ThreadPoolExecutor(max_workers=6) as pool:
        entries = list(pool.map(download, files))
    manifest = {'source':f'https://github.com/{REPO}', 'commit':commit, 'retrieved':date.today().isoformat(), 'license':'No repository license detected; third-party artwork is not covered by project code.', 'entries':entries}
    (target / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2),encoding='utf-8')
    print(json.dumps({'downloaded':len(entries),'cards':sum(e['category']!='creature' and not e['back'] for e in entries),'creatures':sum(e['category']=='creature' for e in entries),'commit':commit}))

if __name__ == '__main__':
    main()
