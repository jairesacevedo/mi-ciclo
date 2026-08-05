/* Capa de datos. Todo se guarda LOCALMENTE en el navegador (localStorage).
   Ningún dato sale del dispositivo. */

const Storage = (() => {
  const KEY = 'yire_cycle_data_v1';

  const DEFAULT = { version: 1, entries: {}, settings: { theme: 'auto' } };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULT);
      const data = JSON.parse(raw);
      if (!data.entries) data.entries = {};
      if (!data.settings) data.settings = { theme: 'auto' };
      return data;
    } catch (e) {
      console.error('No se pudieron leer los datos, empezando de cero.', e);
      return structuredClone(DEFAULT);
    }
  }

  // Suscriptores que se avisan tras cada cambio (p. ej. auto-respaldo).
  const _subs = [];
  function subscribe(fn) { _subs.push(fn); }
  function notify() { _subs.forEach(f => { try { f(); } catch (e) { console.warn(e); } }); }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
    notify();
  }

  let _cache = load();

  function all() { return _cache; }

  /** Registro de un día: null si no existe. */
  function getEntry(dateStr) {
    return _cache.entries[dateStr] || null;
  }

  /** Guarda/actualiza el registro de un día. Si queda vacío, lo elimina. */
  function setEntry(dateStr, entry) {
    if (isEmptyEntry(entry)) {
      delete _cache.entries[dateStr];
    } else {
      _cache.entries[dateStr] = entry;
    }
    save(_cache);
  }

  function deleteEntry(dateStr) {
    delete _cache.entries[dateStr];
    save(_cache);
  }

  function isEmptyEntry(e) {
    if (!e) return true;
    const noFlow = !e.flow || e.flow === 'none';
    const noSym = !e.symptoms || e.symptoms.length === 0;
    const noMood = !e.mood;
    const noIntimacy = !e.intimacy;
    const noNotes = !e.notes || !e.notes.trim();
    return noFlow && noSym && noMood && noIntimacy && noNotes;
  }

  /** Lista ordenada de [fecha, entry] por fecha ascendente. */
  function sortedEntries() {
    return Object.keys(_cache.entries)
      .sort()
      .map(k => [k, _cache.entries[k]]);
  }

  function getSetting(k) { return _cache.settings[k]; }
  function setSetting(k, v) { _cache.settings[k] = v; save(_cache); }

  function exportJSON() {
    return JSON.stringify(_cache, null, 2);
  }

  /** Importa un JSON exportado antes. Devuelve true si funcionó. */
  function importJSON(text) {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || !data.entries) {
      throw new Error('El archivo no tiene el formato esperado.');
    }
    if (!data.settings) data.settings = { theme: 'auto' };
    _cache = data;
    save(_cache);
    return true;
  }

  function clearAll() {
    _cache = structuredClone(DEFAULT);
    save(_cache);
  }

  return {
    all, getEntry, setEntry, deleteEntry, sortedEntries,
    getSetting, setSetting, exportJSON, importJSON, clearAll, isEmptyEntry,
    subscribe,
  };
})();
