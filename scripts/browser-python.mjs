// Dedicated QA interpreter kept outside application/release source.
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const python=process.env.BARSYS_QA_PYTHON||fileURLToPath(new URL('../../barsys-test-tools/bin/python',import.meta.url));
if(!existsSync(python)){console.error('Browser QA environment missing. Run: python3 -m venv ../barsys-test-tools && ../barsys-test-tools/bin/python -m pip install -r tests/browser-requirements.txt');process.exit(1);}
const result=spawnSync(python,process.argv.slice(2),{stdio:'inherit'});
if(result.error)console.error(result.error.message);
process.exit(result.status??1);
