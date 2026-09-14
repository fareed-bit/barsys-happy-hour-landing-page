"""Package this local source and freshly rebuilt standalone without network access."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import hashlib,json
root=Path(__file__).resolve().parents[1]
html=root/'Barsys-After-Hours-V3-9-Codex-Ready.html'
if not html.is_file():raise SystemExit('Run npm run preview first.')
buildfile=root/'preview-build.json'
if not buildfile.exists():raise SystemExit('Build manifest missing; run npm run preview first.')
build=json.loads(buildfile.read_text())
for name,expected in {**build['inputs'],build['output']:build['outputSha256']}.items():
 path=root/name
 if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest()!=expected:
  raise SystemExit('Standalone input changed: '+name+'. Run npm run preview first.')
output=root/'release';output.mkdir(exist_ok=True)
archive=output/'Barsys-Happy-Hours-local-RC.zip';manifest={}
with ZipFile(archive,'w',ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted(root.rglob('*')):
  relative=p.relative_to(root)
  if not p.is_file() or any(part in ('release','node_modules','.git','__pycache__') for part in relative.parts) or p.name.startswith('.env') or '.sqlite' in p.name or p.name=='.DS_Store' or p.suffix=='.pyc':continue
  name='barsys-after-hours-v3-9/'+str(relative);data=p.read_bytes();z.writestr(name,data);manifest[str(relative)]=hashlib.sha256(data).hexdigest()
 z.writestr('barsys-after-hours-v3-9/RELEASE-SHA256.json',json.dumps(manifest,indent=2)+'\n')
with ZipFile(archive) as z:
 if z.testzip():raise SystemExit('Archive integrity failure')
print(str(archive));print(f'{len(manifest)} files; {archive.stat().st_size:,} bytes; archive integrity verified.')
