/* Utilidades de fechas y ayudas generales.
   Trabajamos con fechas locales en formato 'YYYY-MM-DD' para evitar
   problemas de zona horaria. */

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_CORTO = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // semana inicia domingo

function pad2(n) { return String(n).padStart(2, '0'); }

/** Escapa texto escrito por el usuario antes de insertarlo como HTML. */
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Date -> 'YYYY-MM-DD' (local) */
function fmt(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 'YYYY-MM-DD' -> Date (local, medianoche) */
function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function todayStr() { return fmt(new Date()); }

/** Suma n días (puede ser negativo) a una fecha 'YYYY-MM-DD'. */
function addDays(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return fmt(d);
}

/** Días de b - a (b y a en 'YYYY-MM-DD'). Positivo si b es posterior. */
function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

/** Texto amable de una fecha: "martes 5 de agosto". */
function humanDate(s) {
  const d = parseDate(s);
  const semana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return `${semana[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/** Texto corto: "5 ago". */
function shortDate(s) {
  const d = parseDate(s);
  return `${d.getDate()} ${MESES_CORTO[d.getMonth()]}`;
}

/** Rango corto: "10–18 ago" o "28 jul – 3 ago". */
function shortRange(a, b) {
  const da = parseDate(a), db = parseDate(b);
  if (da.getMonth() === db.getMonth()) {
    return `${da.getDate()}–${db.getDate()} ${MESES_CORTO[db.getMonth()]}`;
  }
  return `${da.getDate()} ${MESES_CORTO[da.getMonth()]} – ${db.getDate()} ${MESES_CORTO[db.getMonth()]}`;
}
