"""Isolated Chrome smoke check; never reads .env, staff sessions or event data."""
from pathlib import Path
import json, os, shutil, signal, socket, subprocess, tempfile, time
from urllib.request import urlopen
ROOT = Path(__file__).resolve().parent.parent
CHROME = Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
report = {'scope':'isolated localhost with empty temporary database and fresh Chrome profile'}
with tempfile.TemporaryDirectory(prefix='barsys-runtime-smoke-') as directory:
    work = Path(directory)
    env = {k:os.environ[k] for k in ['PATH','HOME','TMPDIR','USER','LOGNAME'] if k in os.environ}
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0)); port = sock.getsockname()[1]
    env.update(NODE_ENV='test',PORT=str(port),BARSYS_DB=str(work/'test.sqlite'),GOOGLE_CLIENT_ID='')
    server = subprocess.Popen([shutil.which('node'),'backend/server.mjs'],cwd=ROOT,env=env,
                              stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    browser = None
    try:
        for attempt in range(50):
            try:
                with urlopen(f'http://localhost:{port}/api/status',timeout=1) as response:
                    assert json.load(response)['mode'] == 'LOCAL_TEST'
                break
            except Exception:
                if server.poll() is not None: raise RuntimeError('Isolated server did not start')
                time.sleep(.1)
        else: raise RuntimeError('Isolated server unavailable')
        if not CHROME.is_file(): raise RuntimeError('Chrome executable unavailable')
        args = [str(CHROME),'--headless=new','--disable-gpu','--no-first-run',
                '--no-default-browser-check','--user-data-dir='+str(work/'chrome-profile'),
                '--virtual-time-budget=4000','--dump-dom',f'http://localhost:{port}/']
        browser = subprocess.Popen(args,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
                                   text=True,start_new_session=True)
        dom, errors = browser.communicate(timeout=25)
        if browser.returncode: raise RuntimeError('Isolated Chrome launch failed: '+errors[-500:])
        checks = {'runtime_mode':'data-app-mode="LOCAL_TEST"' in dom,
                  'visible_save_notice':'id="runtime-data-notice"' in dom,
                  'explicit_action':'Only Save test inquiry stores the inquiry' in dom}
        report.update(status='passed' if all(checks.values()) else 'failed',checks=checks)
    except Exception as error:
        report.update(status='blocked',reason=str(error))
    finally:
        if browser is not None and browser.poll() is None:
            os.killpg(browser.pid,signal.SIGTERM)
            try: browser.wait(timeout=5)
            except subprocess.TimeoutExpired: os.killpg(browser.pid,signal.SIGKILL);browser.wait()
        server.terminate()
        try: server.wait(timeout=5)
        except subprocess.TimeoutExpired: server.kill();server.wait()
(ROOT/'qa/runtime-consistency-browser.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
