"""Run isolated local browser regression; no personal Chrome profile or .env access."""
from pathlib import Path
import os, shutil, signal, subprocess, tempfile, time
ROOT = Path(__file__).resolve().parent.parent
CHROME = Path(os.environ.get('BARSYS_QA_CHROME_BINARY', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'))
if not CHROME.is_file():
    raise SystemExit('Chrome is not installed at the expected Mac path; no test was run.')
NODE = shutil.which('node')
if not NODE:
    raise SystemExit('Node 24+ is required; no test was run.')
env = {k: os.environ[k] for k in ['PATH', 'HOME', 'TMPDIR'] if k in os.environ}
def stop(process):
    if process is None or process.poll() is not None:
        return
    os.killpg(process.pid, signal.SIGTERM)
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait()
result = 1
with tempfile.TemporaryDirectory(prefix='barsys-isolated-chrome-') as directory:
    work = Path(directory)
    browser = runner = None
    with (work / 'chrome.log').open('w') as log:
        try:
            browser = subprocess.Popen([str(CHROME), '--headless=new', '--remote-debugging-port=0',
                '--no-first-run', '--no-default-browser-check', '--user-data-dir='+str(work/'profile'),
                'about:blank'], env=env, stdout=log, stderr=log, start_new_session=True)
            port_file = work / 'profile' / 'DevToolsActivePort'
            for _ in range(100):
                if port_file.is_file():
                    break
                if browser.poll() is not None:
                    raise RuntimeError('Isolated Chrome exited before its debugging port was available.')
                time.sleep(.1)
            else:
                raise RuntimeError('Isolated Chrome debugging port timed out; no browser pass claimed.')
            env['BARSYS_QA_CHROME_PORT'] = port_file.read_text().splitlines()[0]
            scripts = ['tests/lifecycle-browser.mjs', 'tests/workflow-browser.mjs']
            result = 0
            for script in scripts:
                runner = subprocess.Popen([NODE, script], cwd=ROOT, env=env, start_new_session=True)
                result = runner.wait(timeout=120)
                runner = None
                if result:
                    break
        except (RuntimeError, subprocess.TimeoutExpired) as error:
            print(str(error), flush=True)
            log.flush()
            print((work / 'chrome.log').read_text()[-6000:], flush=True)
        finally:
            stop(runner)
            stop(browser)
raise SystemExit(result)
