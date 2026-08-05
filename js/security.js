/* Bloqueo con PIN. Es un DETERRENTE de privacidad, no cifrado:
   guardamos solo un hash del PIN, nunca el PIN en texto. Los datos siguen
   en el dispositivo. Reutiliza la misma pantalla para crear/cambiar/quitar. */

const Lock = (() => {
  const SALT = 'yire-mi-ciclo-2026';

  async function hash(pin) {
    const text = SALT + pin;
    if (crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Respaldo simple si no hay crypto.subtle (contexto no seguro).
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
    return 'f' + (h >>> 0).toString(16);
  }

  function isEnabled() { return !!Storage.getSetting('pinHash'); }

  const PIN_LEN = 4;
  let buffer = '';
  let ctx = null; // { mode, step, first, onDone }

  const $ = id => document.getElementById(id);

  function buildKeypad() {
    const kp = $('keypad');
    if (kp.dataset.built) return;
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
    kp.innerHTML = keys.map(k =>
      k === '' ? '<span></span>'
        : `<button class="key" data-k="${k}">${k}</button>`).join('');
    kp.querySelectorAll('.key').forEach(b => b.onclick = () => press(b.dataset.k));
    kp.dataset.built = '1';
  }

  function renderDots() {
    const dots = $('pinDots');
    dots.innerHTML = '';
    for (let i = 0; i < PIN_LEN; i++) {
      const d = document.createElement('span');
      d.className = 'pin-dot' + (i < buffer.length ? ' on' : '');
      dots.appendChild(d);
    }
  }

  function setMsg(t) { $('lockMsg').textContent = t; }

  function shake() {
    const inner = document.querySelector('.lock-inner');
    inner.classList.remove('shake');
    void inner.offsetWidth;
    inner.classList.add('shake');
  }

  function press(k) {
    if (k === '⌫') { buffer = buffer.slice(0, -1); renderDots(); return; }
    if (buffer.length >= PIN_LEN) return;
    buffer += k;
    renderDots();
    if (buffer.length === PIN_LEN) setTimeout(handleComplete, 120);
  }

  async function handleComplete() {
    const pin = buffer;
    buffer = '';
    renderDots();

    if (ctx.mode === 'unlock') {
      if (await hash(pin) === Storage.getSetting('pinHash')) return finish(true);
      setMsg('PIN incorrecto, intenta de nuevo'); shake(); return;
    }

    if (ctx.step === 'current') { // verificar PIN actual (cambiar/quitar)
      if (await hash(pin) !== Storage.getSetting('pinHash')) {
        setMsg('PIN incorrecto'); shake(); return;
      }
      if (ctx.mode === 'remove') {
        Storage.setSetting('pinHash', null);
        return finish(true);
      }
      ctx.step = 'new'; setMsg('Nuevo PIN (4 dígitos)'); return;
    }

    if (ctx.step === 'new') {
      ctx.first = pin; ctx.step = 'confirm'; setMsg('Repite el nuevo PIN'); return;
    }

    if (ctx.step === 'confirm') {
      if (pin !== ctx.first) {
        setMsg('No coinciden, empecemos de nuevo'); shake();
        ctx.step = 'new'; ctx.first = null; return;
      }
      Storage.setSetting('pinHash', await hash(pin));
      return finish(true);
    }
  }

  function show(cancelable) {
    buildKeypad();
    buffer = '';
    renderDots();
    const ls = $('lockScreen');
    ls.hidden = false;
    const cancel = $('lockCancel');
    cancel.hidden = !cancelable;
    cancel.onclick = () => finish(false);
  }

  function finish(ok) {
    $('lockScreen').hidden = true;
    const cb = ctx && ctx.onDone;
    ctx = null; buffer = '';
    if (cb) cb(ok);
  }

  /** Al abrir la app: si hay PIN, pide desbloquear antes de continuar. */
  function guard(onUnlock) {
    if (!isEnabled()) { onUnlock(); return; }
    ctx = { mode: 'unlock', onDone: (ok) => { if (ok) onUnlock(); } };
    setMsg('Ingresa tu PIN');
    show(false);
  }

  /** Flujos desde Ajustes. onDone(ok) al terminar. */
  function createPin(onDone) {
    ctx = { mode: 'create', step: 'new', first: null, onDone };
    setMsg('Crea un PIN (4 dígitos)');
    show(true);
  }
  function changePin(onDone) {
    ctx = { mode: 'change', step: 'current', first: null, onDone };
    setMsg('PIN actual');
    show(true);
  }
  function removePin(onDone) {
    ctx = { mode: 'remove', step: 'current', onDone };
    setMsg('PIN actual para quitarlo');
    show(true);
  }

  return { isEnabled, guard, createPin, changePin, removePin };
})();
