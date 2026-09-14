"""Optimize the eight verified local working covers; preserve original bytes.
Requires Pillow. No network or source URL changes. Re-running is deterministic.
"""
import hashlib,json
from pathlib import Path
from PIL import Image,ImageOps
root=Path(__file__).resolve().parents[1]
raw=(root/'config.js').read_text()
config=json.loads(raw.split('window.BARSYS = ',1)[1].strip().removesuffix(';'))
originals=root/'reference'/'original-covers';originals.mkdir(exist_ok=True)
records=[]
for key,asset in config['assets'].items():
 if not asset.get('officialMixlist'):continue
 dest=root/asset['local']
 if not dest.exists():raise SystemExit('Missing cover: '+str(dest)+'. Run npm run assets first.')
 original=originals/dest.name
 if not original.exists():original.write_bytes(dest.read_bytes())
 with Image.open(original) as check:check.verify()
 with Image.open(original) as image:
  image=ImageOps.exif_transpose(image);image.thumbnail((960,960),Image.Resampling.LANCZOS)
  temp=dest.with_suffix('.optimized'+dest.suffix)
  if dest.suffix.lower()=='.png':image.save(temp,format='PNG',optimize=True)
  else:image.convert('RGB').save(temp,format='JPEG',quality=85,optimize=True,progressive=True)
  if temp.stat().st_size<original.stat().st_size:temp.replace(dest)
  else:temp.unlink();dest.write_bytes(original.read_bytes())
 with Image.open(dest) as image:image.load();dimensions=list(image.size)
 before=original.read_bytes();after=dest.read_bytes()
 records.append(dict(key=key,path=asset['local'],source=asset['remote'],original=str(original.relative_to(root)),dimensions=dimensions,originalBytes=len(before),workingBytes=len(after),originalSha256=hashlib.sha256(before).hexdigest(),workingSha256=hashlib.sha256(after).hexdigest()))
keys=[k for k,a in config['assets'].items() if (root/a['local']).is_file()]
(root/'assets.available.js').write_text('window.BARSYS_LOCAL_ASSETS='+json.dumps(keys,separators=(',',':'))+';\n')
(root/'reference'/'cover-optimization.json').write_text(json.dumps(records,indent=2)+'\n')
print('Cover bytes:',sum(x['originalBytes'] for x in records),'->',sum(x['workingBytes'] for x in records))
print('Originals preserved in reference/original-covers. Rebuild with npm run preview.')
