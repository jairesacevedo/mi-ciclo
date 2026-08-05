/* Render del calendario mensual. Colorea cada día según:
   - periodo registrado (intensidad del flujo)
   - ventana de periodo prevista
   - ventana fértil estimada
   - marcas de relaciones (con/sin condón) y síntomas */

const Calendar = (() => {

  // Mes que se está mostrando (Date apuntando al día 1).
  let cursor = new Date();
  cursor.setDate(1);

  function setMonth(year, month) {
    cursor = new Date(year, month, 1);
  }
  function shift(n) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + n, 1);
  }
  function current() { return cursor; }

  const FLOW_CLASS = {
    spotting: 'f-spotting',
    light: 'f-light',
    medium: 'f-medium',
    heavy: 'f-heavy',
  };

  /** Construye info visual de un día dado un contexto de predicción. */
  function dayMeta(dateStr, ctx) {
    const e = Storage.getEntry(dateStr);
    const classes = [];
    const marks = [];

    if (e && e.flow && e.flow !== 'none') classes.push(FLOW_CLASS[e.flow]);

    if (ctx.predWindow &&
        daysBetween(ctx.predWindow.windowStart, dateStr) >= 0 &&
        daysBetween(dateStr, ctx.predWindow.windowEnd) >= 0 &&
        !(e && Predict.isBleed(e))) {
      classes.push('pred-window');
      if (dateStr === ctx.predWindow.mostLikely) classes.push('pred-likely');
    }

    if (ctx.fertile &&
        daysBetween(ctx.fertile.start, dateStr) >= 0 &&
        daysBetween(dateStr, ctx.fertile.end) >= 0 &&
        !(e && Predict.isBleed(e))) {
      classes.push('fertile');
      if (dateStr === ctx.fertile.ovulation) classes.push('ovulation');
    }

    if (Fechas.forDate(dateStr).length) { classes.push('special-day'); marks.push('💖'); }
    if (e && e.mucus === 'clara') { classes.push('mucus-peak'); marks.push('🥚'); }
    if (e && e.intimacy) marks.push(e.condom ? '🛡️' : '❤️');
    if (e && e.symptoms && e.symptoms.length) marks.push('•');

    return { classes, marks, hasEntry: !!e };
  }

  /** Renderiza el calendario dentro de `container`. onPick(dateStr) al tocar un día. */
  function render(container, onPick) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const today = todayStr();

    const predWindow = Predict.nextPeriod();
    const fertile = Predict.fertileWindow();
    const ctx = { predWindow, fertile };

    const firstDay = new Date(year, month, 1).getDay(); // 0=domingo
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = `
      <div class="cal-head">
        <button class="icon-btn" id="calPrev" aria-label="Mes anterior">‹</button>
        <div class="cal-title">${MESES[month]} ${year}</div>
        <button class="icon-btn" id="calNext" aria-label="Mes siguiente">›</button>
      </div>
      <div class="cal-grid cal-weekdays">
        ${DIAS_CORTO.map(d => `<div class="cal-wd">${d}</div>`).join('')}
      </div>
      <div class="cal-grid" id="calDays">`;

    for (let i = 0; i < firstDay; i++) html += `<div class="cal-cell empty"></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${pad2(month + 1)}-${pad2(d)}`;
      const meta = dayMeta(ds, ctx);
      const cls = ['cal-cell', ...meta.classes];
      if (ds === today) cls.push('is-today');
      html += `
        <button class="${cls.join(' ')}" data-date="${ds}">
          <span class="cal-num">${d}</span>
          <span class="cal-marks">${meta.marks.join('')}</span>
        </button>`;
    }
    html += `</div>`;

    html += `
      <div class="cal-legend">
        <span><i class="dot f-medium"></i> Periodo</span>
        <span><i class="dot pred-window"></i> Periodo previsto</span>
        <span><i class="dot fertile"></i> Días fértiles</span>
        <span>🥚 Moco fértil</span>
        <span>💖 Fecha especial</span>
        <span>❤️ Relación · 🛡️ Con condón</span>
      </div>`;

    container.innerHTML = html;

    container.querySelector('#calPrev').onclick = () => { shift(-1); render(container, onPick); };
    container.querySelector('#calNext').onclick = () => { shift(1); render(container, onPick); };
    container.querySelectorAll('.cal-cell[data-date]').forEach(btn => {
      btn.onclick = () => onPick(btn.dataset.date);
    });
  }

  return { render, setMonth, shift, current };
})();
