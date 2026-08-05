/* Motor de predicción para ciclos irregulares.
   La idea central: como el ciclo varía mucho, NO damos una sola fecha,
   sino una VENTANA DE PROBABILIDAD basada en el historial de Yire. */

const Predict = (() => {

  // Un día cuenta como "sangrado real" si el flujo es ligero o más.
  // El manchado (spotting) no inicia un ciclo por sí solo.
  const BLEED = new Set(['light', 'medium', 'heavy']);

  function isBleed(entry) {
    return entry && BLEED.has(entry.flow);
  }

  /** Fechas de INICIO de periodo: primer día de sangrado tras >=1 día sin sangrar. */
  function periodStarts() {
    const dates = Object.keys(Storage.all().entries).sort();
    const bleedDates = dates.filter(d => isBleed(Storage.getEntry(d)));
    const starts = [];
    for (const d of bleedDates) {
      const prev = addDays(d, -1);
      if (!isBleed(Storage.getEntry(prev))) starts.push(d);
    }
    return starts;
  }

  /** Duración (días) de cada periodo, contando días de sangrado consecutivos. */
  function periodDurations() {
    const starts = periodStarts();
    return starts.map(s => {
      let n = 1, cur = s;
      while (isBleed(Storage.getEntry(addDays(cur, 1)))) {
        n++;
        cur = addDays(cur, 1);
      }
      return n;
    });
  }

  /** Longitudes de ciclo (días entre inicios consecutivos). */
  function cycleLengths() {
    const starts = periodStarts();
    const lens = [];
    for (let i = 1; i < starts.length; i++) {
      lens.push(daysBetween(starts[i - 1], starts[i]));
    }
    // Filtramos valores absurdos (registros erróneos): ciclos de 15 a 90 días.
    return lens.filter(n => n >= 15 && n <= 90);
  }

  function mean(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function stdDev(arr) {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    const v = arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1);
    return Math.sqrt(v);
  }

  function variabilityLabel(sd) {
    if (sd < 4) return { label: 'Regular', level: 'ok' };
    if (sd < 8) return { label: 'Algo irregular', level: 'warn' };
    return { label: 'Muy irregular', level: 'bad' };
  }

  /** Resumen estadístico general. */
  function stats() {
    const lens = cycleLengths();
    const recent = lens.slice(-12); // usamos hasta los últimos 12 ciclos
    const durs = periodDurations();
    return {
      starts: periodStarts(),
      cycleLengths: lens,
      recentUsed: recent,
      count: lens.length,
      avg: recent.length ? Math.round(mean(recent)) : null,
      sd: recent.length ? stdDev(recent) : 0,
      min: lens.length ? Math.min(...lens) : null,
      max: lens.length ? Math.max(...lens) : null,
      avgPeriodDuration: durs.length ? Math.round(mean(durs)) : null,
      variability: recent.length >= 2 ? variabilityLabel(stdDev(recent)) : null,
    };
  }

  /**
   * Predicción del próximo periodo.
   * Devuelve null si no hay datos suficientes (menos de 2 ciclos).
   */
  function nextPeriod() {
    const s = stats();
    if (s.count < 2 || s.avg == null) return null;

    const lastStart = s.starts[s.starts.length - 1];
    const avg = s.avg;
    // Margen de la ventana: al menos 2 días, o 1 desviación estándar.
    const margin = Math.max(2, Math.round(s.sd));

    const mostLikely = addDays(lastStart, avg);
    const windowStart = addDays(lastStart, avg - margin);
    const windowEnd = addDays(lastStart, avg + margin);

    const today = todayStr();
    const daysUntil = daysBetween(today, mostLikely);
    const cycleDay = daysBetween(lastStart, today) + 1;

    return {
      lastStart,
      avg,
      margin,
      mostLikely,
      windowStart,
      windowEnd,
      daysUntil,
      cycleDay,
      variability: s.variability,
      // ¿Estamos dentro de la ventana prevista ahora?
      inWindow: daysBetween(windowStart, today) >= 0 && daysBetween(today, windowEnd) >= 0,
    };
  }

  /**
   * Ventana fértil estimada alrededor del próximo periodo.
   * Regla clásica: ovulación ~14 días antes del inicio; fértil = ovulación −5 a +1.
   * OJO: aproximada, sobre todo en ciclos irregulares. No es método anticonceptivo.
   */
  function fertileWindow() {
    const np = nextPeriod();
    if (!np) return null;
    const ovulation = addDays(np.mostLikely, -14);
    return {
      ovulation,
      start: addDays(ovulation, -5),
      end: addDays(ovulation, 1),
    };
  }

  return {
    isBleed, periodStarts, periodDurations, cycleLengths,
    stats, nextPeriod, fertileWindow, variabilityLabel,
  };
})();
