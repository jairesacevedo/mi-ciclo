/* Informe para el médico. Genera un resumen imprimible y abre el diálogo
   de impresión, donde se elige "Guardar como PDF". Sin librerías externas. */

const Report = (() => {

  const FLOW_LABEL = { spotting: 'Manchado', light: 'Ligero', medium: 'Medio', heavy: 'Abundante' };

  function buildHTML() {
    const s = Predict.stats();
    const np = Predict.nextPeriod();
    const fw = Predict.fertileWindow();

    const resumen = `
      <table class="rep-table">
        <tr><th>Ciclo promedio</th><td>${s.avg != null ? s.avg + ' días' : '—'}</td></tr>
        <tr><th>Rango (mín–máx)</th><td>${s.min != null ? s.min + '–' + s.max + ' días' : '—'}</td></tr>
        <tr><th>Variación típica</th><td>${s.count >= 2 ? '± ' + Math.round(s.sd) + ' días' : '—'}</td></tr>
        <tr><th>Regularidad</th><td>${s.variability ? s.variability.label : '—'}</td></tr>
        <tr><th>Duración media del periodo</th><td>${s.avgPeriodDuration != null ? s.avgPeriodDuration + ' días' : '—'}</td></tr>
        <tr><th>Ciclos registrados</th><td>${s.count}</td></tr>
        <tr><th>Próximo periodo estimado</th><td>${np ? shortRange(np.windowStart, np.windowEnd) + ' (más prob. ' + shortDate(np.mostLikely) + ')' : '—'}</td></tr>
      </table>`;

    // Historial de ciclos: inicio, duración periodo, longitud hasta el siguiente.
    const starts = s.starts;
    const durs = Predict.periodDurations();
    let filas = '';
    for (let i = starts.length - 1; i >= 0; i--) {
      const len = i < starts.length - 1 ? daysBetween(starts[i], starts[i + 1]) + ' días' : '—';
      filas += `<tr><td>${humanDate(starts[i])}</td><td>${durs[i] || '—'} días</td><td>${len}</td></tr>`;
    }
    const historial = starts.length ? `
      <table class="rep-table">
        <thead><tr><th>Inicio del periodo</th><th>Duración</th><th>Ciclo hasta el siguiente</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>` : '<p>Sin ciclos registrados.</p>';

    // Registro diario reciente (últimos 40 con contenido).
    const entries = Storage.sortedEntries().reverse().slice(0, 40);
    let log = '';
    for (const [date, e] of entries) {
      const flow = e.flow && e.flow !== 'none' ? FLOW_LABEL[e.flow] : '';
      const rel = e.intimacy ? (e.condom ? 'Relación (con condón)' : 'Relación (sin condón)') : '';
      const det = [flow, e.mood, (e.symptoms || []).join(', '), rel, e.notes].filter(Boolean).join(' · ');
      log += `<tr><td>${shortDate(date)}</td><td>${det || '—'}</td></tr>`;
    }
    const registro = entries.length ? `
      <table class="rep-table">
        <thead><tr><th>Fecha</th><th>Detalle</th></tr></thead>
        <tbody>${log}</tbody>
      </table>` : '<p>Sin registros diarios.</p>';

    return `
      <div class="rep">
        <h1>Informe de ciclo menstrual</h1>
        <p class="rep-sub">Generado el ${humanDate(todayStr())}</p>
        <p class="rep-note">Datos registrados por la paciente en una app personal de seguimiento.
        Las estimaciones son orientativas; en ciclos irregulares pueden variar.</p>

        <h2>Resumen</h2>
        ${resumen}

        <h2>Historial de ciclos</h2>
        ${historial}

        <h2>Registro diario reciente</h2>
        ${registro}
      </div>`;
  }

  function print() {
    const area = document.getElementById('printArea');
    area.innerHTML = buildHTML();
    document.body.classList.add('printing');

    const cleanup = () => {
      document.body.classList.remove('printing');
      area.innerHTML = '';
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    // Pequeña espera para asegurar el render antes de imprimir.
    setTimeout(() => window.print(), 150);
    // Respaldo por si 'afterprint' no dispara en algún navegador.
    setTimeout(cleanup, 60000);
  }

  return { print, buildHTML };
})();
