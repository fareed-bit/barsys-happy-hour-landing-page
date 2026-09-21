/* Collins bridge — server-to-server proxy to the Collins engine.
 *
 * Why a proxy rather than calling Collins from the browser:
 *   • The engine's age affirmation is a signed cookie on the Collins origin.
 *     A cross-origin page cannot read or send it.
 *   • ai.barsys.com sends `x-frame-options: SAMEORIGIN`, so the live experience
 *     cannot be iframed into this site either.
 *   • The load-balancer route that would serve /api/collins/* same-origin does
 *     not exist yet (events.barsys.com bypasses the LB via a Cloud Run domain
 *     mapping). Proxying from this backend needs none of that work.
 *
 * The one thing that must change outside this repo: the Collins service's
 * COLLINS_GUARD_ALLOWED_ORIGINS must include this site's origin, or every call
 * here is refused with 403 origin-not-allowlisted. See COLLINS-HANDOFF.md.
 *
 * We send our own origin (PUBLIC_ORIGIN), never the Collins one. Passing
 * ai.barsys.com would satisfy the allowlist by impersonating the site it is
 * meant to single out, and would make a missing allowlist entry look like a
 * working integration until someone audited it. *
 * SCOPE, MEASURED: this bridge carries drink questions only. Collins' own system
 * prompt makes it a bartender for Barsys hardware, and that framing wins over
 * anything a caller supplies. Asked about HappyHour packages with the real
 * figures in the prompt it still refused to quote, described a service package
 * as a machine ("the machine's a workhorse", "two bottles and a drip tray") and
 * invented a contact address that does not exist. Package, pricing and
 * event-planning answers need a domain hook on /api/collins/ask in the
 * collins-events repo; they cannot be bolted on from this side, and a
 * confidently wrong price is worse than no answer.
 */
const BASE = (process.env.COLLINS_API_URL || '').replace(/\/+$/, '');
const ORIGIN = process.env.COLLINS_ORIGIN || process.env.PUBLIC_ORIGIN || '';
const TIMEOUT_MS = Number(process.env.COLLINS_TIMEOUT_MS || 25000);
/* Re-mint well inside the engine's 30-day expiry; a stale cookie costs one retry. */
const AGE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_MESSAGE = 600;

export const configured = () => !!BASE;

let age = { cookie: null, mintedAt: 0 };

async function fetchWithTimeout(url, init) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try { return await fetch(url, { ...init, signal: ac.signal }); }
  finally { clearTimeout(timer); }
}

async function mintAge() {
  const res = await fetchWithTimeout(`${BASE}/api/age`, { method: 'POST', headers: { origin: ORIGIN } });
  if (!res.ok) throw new Error(`age affirmation refused (${res.status})`);
  const raw = res.headers.get('set-cookie') || '';
  const cookie = raw.split(';')[0];
  if (!cookie.startsWith('barsys_age_ok=')) throw new Error('age affirmation returned no token');
  age = { cookie, mintedAt: Date.now() };
  return cookie;
}

async function ageCookie(force = false) {
  if (!force && age.cookie && Date.now() - age.mintedAt < AGE_TTL_MS) return age.cookie;
  return mintAge();
}

/* The engine's context is deliberately drinks-only: zero-proof, mood, city,
   time of day, and a menu allow-list. Anything else is dropped rather than
   forwarded, so a client cannot widen what the engine is asked to consider. */
function cleanContext(input) {
  const c = input && typeof input === 'object' ? input : {};
  const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  const menu = Array.isArray(c.menu)
    ? c.menu.filter(x => typeof x === 'string' && x.trim()).slice(0, 40).map(x => x.trim().slice(0, 80))
    : null;
  return {
    zero: c.zero === true,
    mood: str(c.mood, 40),
    city: str(c.city, 80),
    tod: ['morning', 'day', 'evening', 'night'].includes(c.tod) ? c.tod : null,
    ...(menu && menu.length ? { menu } : {}),
  };
}

export async function ask(payload) {
  if (!configured()) { const e = new Error('Collins is not configured for this environment.'); e.status = 503; throw e; }
  const message = typeof payload?.message === 'string' ? payload.message.trim() : '';
  if (!message) { const e = new Error('Ask Collins a question first.'); e.status = 400; throw e; }
  if (message.length > MAX_MESSAGE) { const e = new Error(`Keep it under ${MAX_MESSAGE} characters.`); e.status = 400; throw e; }
  const sessionId = typeof payload?.sessionId === 'string' && /^[\w-]{1,100}$/.test(payload.sessionId) ? payload.sessionId : undefined;
  const body = JSON.stringify({ message, context: cleanContext(payload?.context), ...(sessionId ? { sessionId } : {}) });

  const call = async cookie => fetchWithTimeout(`${BASE}/api/collins/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN, cookie },
    body,
  });

  let res;
  try {
    res = await call(await ageCookie());
    /* A refused affirmation is the one failure worth one retry: the cached
       cookie may simply have aged out under us. */
    if (res.status === 401 || res.status === 403) res = await call(await ageCookie(true));
  } catch (cause) {
    const e = new Error(cause?.name === 'AbortError' ? 'Collins took too long to answer.' : 'Collins is unreachable right now.');
    e.status = 502; throw e;
  }

  if (!res.ok) {
    const e = new Error(res.status === 429 ? 'Collins is catching up — try again in a moment.' : 'Collins could not answer that right now.');
    e.status = res.status === 429 ? 429 : 502; throw e;
  }

  const data = await res.json().catch(() => null);
  const reply = typeof data?.reply === 'string' ? data.reply : '';
  if (!reply) { const e = new Error('Collins had nothing to say. Try rephrasing.'); e.status = 502; throw e; }
  return {
    reply,
    followups: Array.isArray(data?.followups) ? data.followups.filter(x => typeof x === 'string').slice(0, 4) : [],
    sessionId: typeof data?.sessionId === 'string' ? data.sessionId : undefined,
  };
}
