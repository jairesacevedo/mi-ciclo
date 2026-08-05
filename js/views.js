/* Vistas de la app: Inicio, Calendario, Estadísticas, Ajustes,
   y el editor del registro de un día. */

const Views = (() => {

  const FLOW_OPTS = [
    { v: 'none', label: 'Ninguno', emoji: '·' },
    { v: 'spotting', label: 'Manchado', emoji: '🩸' },
    { v: 'light', label: 'Ligero', emoji: '🩸' },
    { v: 'medium', label: 'Medio', emoji: '🩸🩸' },
    { v: 'heavy', label: 'Abundante', emoji: '🩸🩸🩸' },
  ];

  const SYMPTOMS = [
    'Cólicos', 'Dolor de cabeza', 'Dolor de espalda', 'Hinchazón',
    'Sensibilidad en senos', 'Náusea', 'Cansancio', 'Antojos', 'Acné',
  ];

  const MOODS = [
    { v: 'feliz', emoji: '😊' }, { v: 'tranquila', emoji: '😌' },
    { v: 'sensible', emoji: '🥺' }, { v: 'irritable', emoji: '😠' },
    { v: 'triste', emoji: '😢' }, { v: 'ansiosa', emoji: '😰' },
    { v: 'con energía', emoji: '⚡' },
  ];

  // Moco cervical: "clara" (tipo clara de huevo) es el signo de mayor fertilidad.
  const MUCUS = [
    { v: 'seco', label: 'Seco', emoji: '🌵' },
    { v: 'pegajoso', label: 'Pegajoso', emoji: '•' },
    { v: 'cremoso', label: 'Cremoso', emoji: '🥛' },
    { v: 'acuoso', label: 'Acuoso', emoji: '💧' },
    { v: 'clara', label: 'Clara de huevo', emoji: '🥚' },
  ];
  const MUCUS_LABEL = Object.fromEntries(MUCUS.map(m => [m.v, m.label]));

  /* ---------------- INICIO ---------------- */
  function renderHome(el) {
    const np = Predict.nextPeriod();
    const s = Predict.stats();
    const today = todayStr();

    let hero;
    if (!np) {
      const faltan = Math.max(0, 2 - s.count);
      hero = `
        <div class="card hero hero-empty">
          <div class="hero-emoji">🌱</div>
          <h2>Empecemos a conocer tu ciclo</h2>
          <p>Registra al menos <b>${faltan > 0 ? faltan + ' inicio(s)' : 'dos inicios'}</b> de periodo para poder pronosticar.
          Marca el día en que te llegó y verás aparecer la predicción aquí.</p>
          <button class="btn btn-primary" data-action="log-today">Registrar hoy</button>
        </div>`;
    } else {
      const v = np.variability;
      const dLabel = np.daysUntil === 0 ? 'hoy'
        : np.daysUntil > 0 ? `en ${np.daysUntil} día${np.daysUntil === 1 ? '' : 's'}`
        : `hace ${Math.abs(np.daysUntil)} día${Math.abs(np.daysUntil) === 1 ? '' : 's'} (con retraso)`;
      hero = `
        <div class="card hero">
          <div class="hero-top">
            <div>
              <div class="hero-label">Próximo periodo</div>
              <div class="hero-big">${dLabel}</div>
            </div>
            <span class="chip chip-${v.level}">${v.label}</span>
          </div>
          <div class="window-box">
            <div class="window-line">
              <span>Ventana probable</span>
              <b>${shortRange(np.windowStart, np.windowEnd)}</b>
            </div>
            <div class="window-line">
              <span>Fecha más probable</span>
              <b>${shortDate(np.mostLikely)}</b>
            </div>
            <div class="window-bar" title="Rango de días probable">
              <div class="window-fill"></div>
            </div>
            <p class="window-note">Por tu ciclo irregular, es un <b>rango</b>, no un día exacto.</p>
          </div>
          <div class="hero-foot">
            <div class="stat-mini"><span>${np.cycleDay}</span>día del ciclo</div>
            <div class="stat-mini"><span>${np.avg}</span>ciclo promedio</div>
            <button class="btn btn-primary" data-action="log-today">Registrar hoy</button>
          </div>
        </div>`;
    }

    const fw = Predict.fertileWindow();
    let fertileCard = '';
    if (fw) {
      fertileCard = `
        <div class="card">
          <h3>🌸 Ventana fértil estimada</h3>
          <p class="big-range">${shortRange(fw.start, fw.end)}</p>
          <p class="muted">Ovulación aprox. <b>${shortDate(fw.ovulation)}</b>.</p>
          <p class="disclaimer">⚠️ Estimación aproximada. En ciclos irregulares puede variar mucho; <b>no</b> la uses como método anticonceptivo.</p>
        </div>`;
    }

    // Banner de recordatorio/alerta (retraso, ventana, o "registra hoy").
    const alert = Reminders.check();
    let banner = '';
    if (alert) {
      const cls = { delay: 'ban-delay', window: 'ban-window', soon: 'ban-soon', logToday: 'ban-log' }[alert.type];
      const showBtn = alert.type === 'delay' || alert.type === 'logToday';
      banner = `
        <div class="banner ${cls}">
          <div class="banner-txt"><b>${alert.title}</b><br>${alert.message}</div>
          ${showBtn ? '<button class="btn btn-primary btn-sm" data-action="log-today">Registrar</button>' : ''}
        </div>`;
    }

    const te = Storage.getEntry(today);
    const todayCard = `
      <div class="card">
        <div class="row-between">
          <h3>Hoy · ${shortDate(today)}</h3>
          <button class="btn btn-ghost btn-sm" data-action="log-today">${te ? 'Editar' : 'Registrar'}</button>
        </div>
        ${te ? renderEntrySummary(te) : '<p class="muted">Sin registro todavía.</p>'}
      </div>`;

    const greeting = `<p class="greeting">Hola, Bonita 💗</p>`;
    el.innerHTML = greeting + banner + hero + fertileCard + todayCard;

    el.querySelectorAll('[data-action="log-today"]').forEach(b =>
      b.onclick = () => openEditor(today));
  }

  function renderEntrySummary(e) {
    const parts = [];
    if (e.flow && e.flow !== 'none') {
      const f = FLOW_OPTS.find(o => o.v === e.flow);
      parts.push(`<span class="pill">${f.emoji} ${f.label}</span>`);
    }
    if (e.mood) {
      const m = MOODS.find(o => o.v === e.mood);
      parts.push(`<span class="pill">${m ? m.emoji : ''} ${e.mood}</span>`);
    }
    if (e.mucus)
      parts.push(`<span class="pill">${e.mucus === 'clara' ? '🥚' : '💧'} Moco: ${MUCUS_LABEL[e.mucus] || e.mucus}</span>`);
    if (e.symptoms && e.symptoms.length)
      parts.push(`<span class="pill">🩹 ${e.symptoms.join(', ')}</span>`);
    if (e.intimacy)
      parts.push(`<span class="pill">${e.condom ? '🛡️ Con condón' : '❤️ Sin condón'}</span>`);
    if (e.notes && e.notes.trim())
      parts.push(`<span class="pill">📝 ${e.notes}</span>`);
    return `<div class="pills">${parts.join('')}</div>`;
  }

  /* ---------------- CALENDARIO ---------------- */
  function renderCalendar(el) {
    Calendar.render(el, openEditor);
  }

  /* ---------------- ESTADÍSTICAS ---------------- */
  function renderStats(el) {
    const s = Predict.stats();
    if (s.count < 1) {
      el.innerHTML = `<div class="card"><p class="muted">Aún no hay ciclos completos registrados.
        Marca tus días de periodo y aquí verás las estadísticas.</p></div>`;
      return;
    }

    const v = s.variability;
    const cards = `
      <div class="stat-grid">
        <div class="card stat-card"><div class="stat-num">${s.avg ?? '—'}</div><div class="stat-cap">Ciclo promedio (días)</div></div>
        <div class="card stat-card"><div class="stat-num">${s.min ?? '—'}–${s.max ?? '—'}</div><div class="stat-cap">Rango (mín–máx)</div></div>
        <div class="card stat-card"><div class="stat-num">±${Math.round(s.sd)}</div><div class="stat-cap">Variación típica</div></div>
        <div class="card stat-card"><div class="stat-num">${s.avgPeriodDuration ?? '—'}</div><div class="stat-cap">Duración periodo (días)</div></div>
      </div>`;

    const varLine = v ? `<div class="card">
        <div class="row-between"><h3>Regularidad</h3><span class="chip chip-${v.level}">${v.label}</span></div>
        <p class="muted">Basado en tus últimos ${s.recentUsed.length} ciclos. Cuanto mayor la variación, más ancha es la ventana de predicción.</p>
      </div>` : '';

    // Mini-gráfico de barras de las longitudes de ciclo.
    let chart = '';
    if (s.cycleLengths.length) {
      const maxLen = Math.max(...s.cycleLengths, 1);
      const bars = s.cycleLengths.map((n, i) => {
        const h = Math.round((n / maxLen) * 100);
        return `<div class="bar-col"><div class="bar" style="height:${h}%" title="${n} días"></div><span>${n}</span></div>`;
      }).join('');
      chart = `<div class="card">
        <h3>Historial de ciclos</h3>
        <div class="bar-chart">${bars}</div>
        <p class="muted">Duración de cada ciclo (días entre periodos).</p>
      </div>`;
    }

    // Lista de inicios de periodo.
    const startsList = s.starts.slice().reverse().slice(0, 12)
      .map(d => `<li>${humanDate(d)}</li>`).join('');
    const list = s.starts.length ? `<div class="card">
        <h3>Últimos inicios de periodo</h3>
        <ul class="starts-list">${startsList}</ul>
      </div>` : '';

    el.innerHTML = cards + varLine + chart + list;
  }

  /* ---------------- AJUSTES ---------------- */
  function renderSettings(el) {
    const count = Object.keys(Storage.all().entries).length;
    el.innerHTML = `
      <div class="card">
        <h3>🔒 Privacidad</h3>
        <p class="muted">Todos tus datos se guardan <b>solo en este dispositivo</b>, en el navegador.
        No se envían a ningún servidor ni requieren cuenta. Haz respaldos periódicos.</p>
      </div>
      <div class="card">
        <h3>💾 Respaldo</h3>
        <p class="muted">Tienes <b>${count}</b> día(s) registrado(s).</p>
        <div class="btn-row">
          <button class="btn btn-primary" id="btnExport">Exportar respaldo</button>
          <button class="btn btn-ghost" id="btnImport">Importar respaldo</button>
        </div>
        <input type="file" id="fileImport" accept="application/json" hidden />
      </div>
      <div id="driveCard"></div>
      <div class="card">
        <h3>🩺 Informe para el médico</h3>
        <p class="muted">Genera un resumen imprimible con tus estadísticas, historial de ciclos
        y registro reciente. En el diálogo, elige <b>"Guardar como PDF"</b> como destino.</p>
        <button class="btn btn-primary" id="btnReport">Generar informe</button>
      </div>
      <div class="card">
        <h3>🔔 Recordatorios</h3>
        <p class="muted">Al abrir la app verás avisos de <b>retraso</b>, de la <b>ventana</b> prevista
        y si aún no registraste el día. Si activas las notificaciones, además recibirás
        <b>un aviso al abrir</b> cuando haya algo importante.
        <br><small>Sin servidor no hay avisos con la app cerrada; se muestran al abrirla.</small></p>
        <label class="switch-row">
          <input type="checkbox" id="notifToggle" ${Reminders.isEnabled() ? 'checked' : ''} />
          <span>Activar notificaciones</span>
        </label>
      </div>
      <div class="card">
        <h3>🔐 Seguridad</h3>
        <p class="muted">${Lock.isEnabled()
          ? 'La app pedirá tu PIN al abrirse.'
          : 'Protege tus datos con un PIN de 4 dígitos al abrir la app.'}
          <br><small>Es un bloqueo de privacidad, no cifrado; haz respaldos igualmente.</small></p>
        <div class="btn-row" id="securityBtns"></div>
      </div>
      <div class="card">
        <h3>🎨 Tema</h3>
        <div class="btn-row">
          <button class="btn btn-ghost seg" data-theme="auto">Automático</button>
          <button class="btn btn-ghost seg" data-theme="light">Claro</button>
          <button class="btn btn-ghost seg" data-theme="dark">Oscuro</button>
        </div>
      </div>
      <div class="card danger">
        <h3>🗑️ Borrar todo</h3>
        <p class="muted">Elimina permanentemente todos los registros de este dispositivo.</p>
        <button class="btn btn-danger" id="btnClear">Borrar todos los datos</button>
      </div>
      <p class="footer-note">Hecho con todo el amor para La Bonita 💗</p>`;

    el.querySelector('#btnExport').onclick = doExport;
    el.querySelector('#btnImport').onclick = () => el.querySelector('#fileImport').click();
    el.querySelector('#fileImport').onchange = doImport;
    el.querySelector('#btnReport').onclick = () => Report.print();

    // Toggle de notificaciones (pide permiso al activar).
    el.querySelector('#notifToggle').onchange = async (ev) => {
      if (ev.target.checked) {
        const ok = await Reminders.requestPermission();
        if (!ok) { ev.target.checked = false; alert('El navegador no dio permiso para notificaciones.'); }
      } else {
        Reminders.disable();
      }
    };

    // Botones de seguridad (PIN) según si ya hay uno configurado.
    const sec = el.querySelector('#securityBtns');
    if (Lock.isEnabled()) {
      sec.innerHTML = `<button class="btn btn-ghost" id="btnChangePin">Cambiar PIN</button>
        <button class="btn btn-danger" id="btnRemovePin">Quitar PIN</button>`;
      sec.querySelector('#btnChangePin').onclick = () => Lock.changePin(ok => { if (ok) renderSettings(el); });
      sec.querySelector('#btnRemovePin').onclick = () => Lock.removePin(ok => { if (ok) renderSettings(el); });
    } else {
      sec.innerHTML = `<button class="btn btn-primary" id="btnSetPin">Activar bloqueo con PIN</button>`;
      sec.querySelector('#btnSetPin').onclick = () => Lock.createPin(ok => { if (ok) renderSettings(el); });
    }

    el.querySelector('#btnClear').onclick = () => {
      if (confirm('¿Seguro que quieres borrar TODOS los datos? Esto no se puede deshacer.')) {
        Storage.clearAll();
        App.render();
      }
    };

    // Botones de tema (Automático / Claro / Oscuro).
    const curTheme = Storage.getSetting('theme') || 'auto';
    el.querySelectorAll('.seg').forEach(b => {
      if (b.dataset.theme === curTheme) b.classList.add('seg-active');
      b.onclick = () => { App.setTheme(b.dataset.theme); renderSettings(el); };
    });

    renderDrive(el.querySelector('#driveCard'), () => renderSettings(el));
  }

  /* ---------------- RESPALDO GOOGLE DRIVE ---------------- */
  function fmtLast(iso) {
    if (!iso) return 'nunca';
    const d = new Date(iso);
    return `${d.getDate()} ${MESES_CORTO[d.getMonth()]} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function renderDrive(card, refresh) {
    const configured = Drive.isConfigured();
    const connected = Drive.isConnected();

    if (!configured) {
      card.className = 'card';
      card.innerHTML = `
        <h3>☁️ Respaldo automático · Google Drive</h3>
        <p class="muted">Guarda una copia en tu Google Drive (en una carpeta privada de la app).
        Necesitas pegar una vez tu <b>ID de cliente de Google</b> — mira el <b>README</b> para el paso a paso (5 min, gratis).</p>
        <label class="field-inline">
          <input type="text" id="clientIdInput" placeholder="xxxx.apps.googleusercontent.com" />
        </label>
        <div class="btn-row"><button class="btn btn-primary" id="btnSaveClientId">Guardar ID</button></div>`;
      card.querySelector('#btnSaveClientId').onclick = () => {
        const v = card.querySelector('#clientIdInput').value.trim();
        if (!v) return;
        Storage.setSetting('driveClientId', v);
        refresh();
      };
      return;
    }

    card.className = 'card';
    if (!connected) {
      card.innerHTML = `
        <h3>☁️ Respaldo automático · Google Drive</h3>
        <p class="muted">ID configurado. Conéctate para activar el respaldo automático.</p>
        <div class="btn-row">
          <button class="btn btn-primary" id="btnConnectDrive">Conectar con Google Drive</button>
          <button class="btn btn-ghost btn-sm" id="btnResetClientId">Cambiar ID</button>
        </div>
        <p class="muted" id="driveStatus"></p>`;
      card.querySelector('#btnConnectDrive').onclick = async () => {
        const st = card.querySelector('#driveStatus');
        st.textContent = 'Abriendo Google…';
        try { await Drive.connect(); refresh(); }
        catch (e) { st.textContent = '⚠️ ' + e.message; }
      };
      card.querySelector('#btnResetClientId').onclick = () => {
        Storage.setSetting('driveClientId', '');
        Storage.setSetting('driveConnected', false);
        refresh();
      };
      return;
    }

    // Conectado
    card.innerHTML = `
      <h3>☁️ Respaldo · Google Drive <span class="chip chip-ok">Conectado</span></h3>
      <p class="muted">Último respaldo: <b>${fmtLast(Drive.lastBackup())}</b>.</p>
      <label class="switch-row">
        <input type="checkbox" id="autoToggle" ${Drive.isAuto() ? 'checked' : ''} />
        <span>Respaldar automáticamente al cambiar datos</span>
      </label>
      <div class="btn-row">
        <button class="btn btn-primary" id="btnBackupNow">Respaldar ahora</button>
        <button class="btn btn-ghost" id="btnRestoreDrive">Restaurar desde Drive</button>
        <button class="btn btn-ghost btn-sm" id="btnDisconnectDrive">Desconectar</button>
      </div>
      <p class="muted" id="driveStatus"></p>`;

    const st = card.querySelector('#driveStatus');
    card.querySelector('#autoToggle').onchange = (e) => Storage.setSetting('driveAuto', e.target.checked);
    card.querySelector('#btnBackupNow').onclick = async () => {
      st.textContent = 'Respaldando…';
      try { await Drive.backupNow(); refresh(); }
      catch (e) { st.textContent = '⚠️ ' + e.message; }
    };
    card.querySelector('#btnRestoreDrive').onclick = async () => {
      if (!confirm('Esto reemplazará los datos de este dispositivo con la copia de Drive. ¿Continuar?')) return;
      st.textContent = 'Restaurando…';
      try { await Drive.restore(); App.render(); refresh(); alert('Datos restaurados desde Drive.'); }
      catch (e) { st.textContent = '⚠️ ' + e.message; }
    };
    card.querySelector('#btnDisconnectDrive').onclick = () => { Drive.disconnect(); refresh(); };
  }

  function doExport() {
    const blob = new Blob([Storage.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mi-ciclo-respaldo-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function doImport(ev) {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        Storage.importJSON(reader.result);
        alert('Respaldo importado correctamente.');
        App.render();
      } catch (e) {
        alert('No se pudo importar: ' + e.message);
      }
    };
    reader.readAsText(file);
  }

  /* ---------------- EDITOR DEL DÍA ---------------- */
  let editingDate = null;
  let draft = null;

  function openEditor(dateStr) {
    editingDate = dateStr;
    const existing = Storage.getEntry(dateStr);
    draft = existing ? structuredClone(existing)
      : { flow: 'none', symptoms: [], mood: '', mucus: '', intimacy: false, condom: false, notes: '' };
    if (draft.mucus === undefined) draft.mucus = '';

    document.getElementById('editorTitle').textContent = humanDate(dateStr);
    renderEditorBody();
    const bd = document.getElementById('dayEditor');
    bd.classList.add('open');
    bd.setAttribute('aria-hidden', 'false');
  }

  function closeEditor() {
    const bd = document.getElementById('dayEditor');
    bd.classList.remove('open');
    bd.setAttribute('aria-hidden', 'true');
    editingDate = null; draft = null;
  }

  function renderEditorBody() {
    const b = document.getElementById('editorBody');
    b.innerHTML = `
      <div class="field">
        <label>Flujo</label>
        <div class="opt-row">
          ${FLOW_OPTS.map(o => `
            <button class="opt ${draft.flow === o.v ? 'sel' : ''}" data-flow="${o.v}">
              <span class="opt-emoji">${o.emoji}</span><span>${o.label}</span>
            </button>`).join('')}
        </div>
      </div>

      <div class="field">
        <label>Ánimo</label>
        <div class="opt-row wrap">
          ${MOODS.map(m => `
            <button class="opt chip-opt ${draft.mood === m.v ? 'sel' : ''}" data-mood="${m.v}">
              ${m.emoji} ${m.v}
            </button>`).join('')}
        </div>
      </div>

      <div class="field">
        <label>Síntomas</label>
        <div class="opt-row wrap">
          ${SYMPTOMS.map(s => `
            <button class="opt chip-opt ${draft.symptoms.includes(s) ? 'sel' : ''}" data-sym="${s}">${s}</button>`).join('')}
        </div>
      </div>

      <div class="field">
        <label>Moco cervical <span class="label-hint">(clara de huevo = más fértil)</span></label>
        <div class="opt-row wrap">
          ${MUCUS.map(m => `
            <button class="opt chip-opt ${draft.mucus === m.v ? 'sel' : ''}" data-mucus="${m.v}">
              ${m.emoji} ${m.label}
            </button>`).join('')}
        </div>
      </div>

      <div class="field">
        <label>Relaciones</label>
        <div class="opt-row">
          <button class="opt ${draft.intimacy ? 'sel' : ''}" data-intimacy="1"><span class="opt-emoji">❤️</span><span>Sí hubo</span></button>
          <button class="opt ${!draft.intimacy ? 'sel' : ''}" data-intimacy="0"><span class="opt-emoji">—</span><span>No</span></button>
        </div>
        <div class="opt-row ${draft.intimacy ? '' : 'disabled'}" id="condomRow">
          <button class="opt ${draft.intimacy && draft.condom ? 'sel' : ''}" data-condom="1"><span class="opt-emoji">🛡️</span><span>Con condón</span></button>
          <button class="opt ${draft.intimacy && !draft.condom ? 'sel' : ''}" data-condom="0"><span class="opt-emoji">🚫</span><span>Sin condón</span></button>
        </div>
      </div>

      <div class="field">
        <label>Notas</label>
        <textarea id="noteInput" rows="2" placeholder="Cualquier cosa que quieras recordar…">${draft.notes || ''}</textarea>
      </div>`;

    b.querySelectorAll('[data-flow]').forEach(el => el.onclick = () => { draft.flow = el.dataset.flow; renderEditorBody(); });
    b.querySelectorAll('[data-mood]').forEach(el => el.onclick = () => { draft.mood = (draft.mood === el.dataset.mood ? '' : el.dataset.mood); renderEditorBody(); });
    b.querySelectorAll('[data-mucus]').forEach(el => el.onclick = () => { draft.mucus = (draft.mucus === el.dataset.mucus ? '' : el.dataset.mucus); renderEditorBody(); });
    b.querySelectorAll('[data-sym]').forEach(el => el.onclick = () => {
      const s = el.dataset.sym;
      const i = draft.symptoms.indexOf(s);
      if (i >= 0) draft.symptoms.splice(i, 1); else draft.symptoms.push(s);
      renderEditorBody();
    });
    b.querySelectorAll('[data-intimacy]').forEach(el => el.onclick = () => {
      draft.intimacy = el.dataset.intimacy === '1';
      if (!draft.intimacy) draft.condom = false;
      renderEditorBody();
    });
    b.querySelectorAll('[data-condom]').forEach(el => el.onclick = () => {
      if (!draft.intimacy) return;
      draft.condom = el.dataset.condom === '1';
      renderEditorBody();
    });
    b.querySelector('#noteInput').oninput = (e) => { draft.notes = e.target.value; };
  }

  function saveEditor() {
    if (!editingDate) return;
    // Capturamos la nota actual del textarea por si acaso.
    const note = document.getElementById('noteInput');
    if (note) draft.notes = note.value;
    Storage.setEntry(editingDate, draft);
    closeEditor();
    App.render();
  }

  function deleteEditor() {
    if (!editingDate) return;
    Storage.deleteEntry(editingDate);
    closeEditor();
    App.render();
  }

  return {
    renderHome, renderCalendar, renderStats, renderSettings,
    openEditor, closeEditor, saveEditor, deleteEditor,
  };
})();
