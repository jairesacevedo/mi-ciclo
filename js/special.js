/* Detalles con cariño:
   - Love:  mensajes de amor, uno distinto cada día (rotación por fecha).
   - Fechas: fechas especiales (aniversario, cumpleaños…) con cuenta regresiva
             y marca en el calendario. */

const Love = (() => {
  const get = () => Storage.getSetting('loveMessages') || [];

  /** Guarda la lista (una por línea, sin vacías ni duplicadas). */
  function setFromText(text) {
    const list = String(text || '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .filter((s, i, a) => a.indexOf(s) === i)
      .slice(0, 100);
    Storage.setSetting('loveMessages', list);
    return list;
  }

  const asText = () => get().join('\n');

  /** Mensaje de hoy: siempre el mismo durante el día, distinto al siguiente. */
  function today() {
    const list = get();
    if (!list.length) return '';
    const dayIndex = Math.floor(parseDate(todayStr()).getTime() / 86400000);
    return list[((dayIndex % list.length) + list.length) % list.length];
  }

  return { get, setFromText, asText, today };
})();


const Fechas = (() => {
  const get = () => Storage.getSetting('specialDates') || [];
  const save = (list) => Storage.setSetting('specialDates', list);

  function add(title, date, yearly) {
    const list = get();
    list.push({
      id: 'f' + Date.now(),
      title: String(title || '').slice(0, 60),
      date,                 // 'YYYY-MM-DD'
      yearly: yearly !== false,
    });
    list.sort((a, b) => a.date.localeCompare(b.date));
    save(list);
  }

  function remove(id) { save(get().filter(f => f.id !== id)); }

  /** Fechas que caen en un día concreto (las anuales comparan mes-día). */
  function forDate(dateStr) {
    const md = dateStr.slice(5);
    return get().filter(f => f.yearly ? f.date.slice(5) === md : f.date === dateStr);
  }

  /** Próxima ocurrencia de una fecha, a partir de hoy. */
  function nextOccurrence(f) {
    const today = todayStr();
    if (!f.yearly) return f.date;
    const year = parseDate(today).getFullYear();
    const cand = `${year}-${f.date.slice(5)}`;
    return daysBetween(today, cand) >= 0 ? cand : `${year + 1}-${f.date.slice(5)}`;
  }

  /** La más próxima (incluye hoy). null si no hay ninguna futura. */
  function next() {
    const items = get()
      .map(f => ({ ...f, when: nextOccurrence(f) }))
      .filter(f => daysBetween(todayStr(), f.when) >= 0)
      .sort((a, b) => a.when.localeCompare(b.when));
    if (!items.length) return null;
    const f = items[0];
    return { ...f, days: daysBetween(todayStr(), f.when) };
  }

  /** Años cumplidos (solo si es anual y ya pasó al menos uno). */
  function yearsAt(f, when) {
    if (!f.yearly) return null;
    const n = parseDate(when).getFullYear() - parseDate(f.date).getFullYear();
    return n > 0 ? n : null;
  }

  return { get, add, remove, forDate, next, nextOccurrence, yearsAt };
})();
