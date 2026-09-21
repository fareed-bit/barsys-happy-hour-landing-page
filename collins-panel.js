/* Ask Collins — in-page bridge to the Barsys AI bartender.
 *
 * Scope is deliberately drinks. The engine is a bartender and says so when
 * asked anything else; it will not quote a package and must not be made to
 * look as if it could. Pricing, scope and availability stay with the planner
 * and the event team. See backend/collins.mjs for the measured reasoning.
 *
 * Hidden until the server says the bridge is configured, so an environment
 * without COLLINS_API_URL shows nothing rather than a control that fails.
 */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const panel = $('#collins-ask');
  if (!panel) return;
  const log = $('#collins-log'), form = $('#collins-form'), input = $('#collins-input'),
        send = $('#collins-send'), chips = $('#collins-chips'), moods = $('#collins-moods'),
        photo = $('#collins-photo'), photoBtn = $('#collins-photo-btn');
  const STARTERS = [
    'What batches well for 80 people?',
    'Something for a crowd that says they hate gin',
    'A zero-proof drink that still feels like a cocktail',
  ];
  const MOODS = [['zero-proof','Zero proof'],['unwind','Unwind'],['celebrate','Celebrate'],['impress','Impress'],['explore','Explore']];
  let sessionId, busy = false, mood = null;

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* The engine marks emphasis with * or ** and expects the client to render it. */
  const rich = t => esc(t).replace(/\*\*([^*]+)\*\*|\*([^*]+)\*/g, (_, a, b) => `<b>${a || b}</b>`);

  function bubble(who, text, opts = {}) {
    const el = document.createElement('div');
    el.className = `ca-msg ca-${who}` + (opts.error ? ' ca-error' : '');
    el.innerHTML = who === 'you' ? esc(text) : rich(text);
    log.append(el);
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return el;
  }

  /* What the planner already knows, so an answer suits the event being planned
     rather than a generic one. Only fields the engine actually accepts. */
  function context() {
    const p = window.BarsysPlanner;
    const s = p ? p.getState() : null;
    const hour = new Date().getHours();
    const names = (s?.menus || [])
      .map(id => window.BARSYS?.menus?.find(m => m.id === id)?.name)
      .filter(Boolean);
    return {
      zero: s?.beverage === 'zero' || mood === 'zero-proof',
      mood,
      city: s?.details?.city?.trim() || null,
      tod: hour < 11 ? 'morning' : hour < 17 ? 'day' : hour < 22 ? 'evening' : 'night',
      ...(names.length ? { menu: names } : {}),
    };
  }

  function renderChips() {
    chips.innerHTML = STARTERS.map(q => `<button type="button" class="ca-chip">${esc(q)}</button>`).join('');
  }
  function renderMoods() {
    moods.innerHTML = MOODS.map(([id, label]) =>
      `<button type="button" class="ca-mood" data-mood="${id}" aria-pressed="${mood === id}">${esc(label)}</button>`).join('');
  }

  async function ask(question) {
    if (busy || !question.trim()) return;
    busy = true; send.disabled = true; input.value = '';
    chips.hidden = true;
    bubble('you', question);
    const pending = bubble('collins', 'Collins is thinking…');
    pending.classList.add('ca-pending');
    try {
      const res = await fetch('/api/collins/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: question, context: context(), ...(sessionId ? { sessionId } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Collins could not answer that right now.');
      sessionId = data.sessionId || sessionId;
      pending.classList.remove('ca-pending');
      pending.innerHTML = rich(data.reply);
      if (data.followups?.length) {
        chips.innerHTML = data.followups.map(q => `<button type="button" class="ca-chip">${esc(q)}</button>`).join('');
        chips.hidden = false;
      }
    } catch (error) {
      pending.remove();
      bubble('collins', error.message || 'Collins is unreachable right now. The event team can answer this one.', { error: true });
    } finally {
      busy = false; send.disabled = false; input.focus();
    }
  }

  /* Photograph your bar. Downscaled here, not on the wire: the engine wants a
     readable shelf, not a 12MP phone original, and the bridge caps what it relays. */
  const MAX_EDGE = 1024;
  function downscale(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not an image Collins can read.')); };
      img.src = url;
    });
  }

  async function readShelf(file) {
    if (busy || !file) return;
    busy = true; photoBtn.disabled = true; send.disabled = true;
    chips.hidden = true;
    bubble('you', 'A photo of the bar');
    const pending = bubble('collins', 'Collins is reading the shelf…');
    pending.classList.add('ca-pending');
    try {
      const image = await downscale(file);
      const res = await fetch('/api/collins/vision', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image, context: context(), ...(sessionId ? { sessionId } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Collins could not read that photo.');
      sessionId = data.sessionId || sessionId;
      const lines = [data.title, data.vibe, data.say, data.text].filter(Boolean);
      pending.classList.remove('ca-pending');
      pending.innerHTML = lines.map(l => `<span class="ca-line">${rich(l)}</span>`).join('');
      chips.innerHTML = ['What can I make from this?', 'What am I missing for a crowd?']
        .map(q => `<button type="button" class="ca-chip">${esc(q)}</button>`).join('');
      chips.hidden = false;
    } catch (error) {
      pending.remove();
      bubble('collins', error.message || 'Collins could not read that photo.', { error: true });
    } finally {
      busy = false; photoBtn.disabled = false; send.disabled = false; photo.value = '';
    }
  }

  photoBtn.addEventListener('click', () => photo.click());
  photo.addEventListener('change', () => readShelf(photo.files?.[0]));
  form.addEventListener('submit', e => { e.preventDefault(); ask(input.value); });
  moods.addEventListener('click', e => {
    const b = e.target.closest('.ca-mood'); if (!b) return;
    mood = mood === b.dataset.mood ? null : b.dataset.mood;
    renderMoods();
  });
  chips.addEventListener('click', e => { const b = e.target.closest('.ca-chip'); if (b) ask(b.textContent); });

  /* The server declares whether the bridge is reachable when it renders the page,
     so a build without Collins configured shows no control at all. Asked instead of
     told, this would be a blocked fetch and a CSP violation in the console on the
     static preview server, which serves the page with connect-src 'none'. */
  if (window.BARSYS_RUNTIME?.collins) { renderMoods(); renderChips(); panel.hidden = false; }
})();
