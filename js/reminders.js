/* Recordatorios y alerta de retraso.
   - check(): devuelve la alerta más relevante para mostrar DENTRO de la app.
   - maybeNotify(): si el permiso está activo, lanza UNA notificación al abrir.
   Nota: sin servidor, no hay recordatorios con la app cerrada; esto avisa al
   abrir la app (y como notificación si se activó el permiso). */

const Reminders = (() => {
  const NOTIF_KEY = 'reminders_last_notif'; // fecha del último aviso, para no repetir

  const isEnabled = () => Storage.getSetting('notifs') === true
    && typeof Notification !== 'undefined' && Notification.permission === 'granted';

  async function requestPermission() {
    if (typeof Notification === 'undefined') return false;
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    const ok = perm === 'granted';
    Storage.setSetting('notifs', ok);
    return ok;
  }

  function disable() { Storage.setSetting('notifs', false); }

  /** Alerta más relevante o null. Tipos: delay | window | soon | logToday */
  function check() {
    const np = Predict.nextPeriod();
    const today = todayStr();
    const loggedToday = !Storage.isEmptyEntry(Storage.getEntry(today));

    if (np) {
      if (np.daysUntil < 0) {
        const d = Math.abs(np.daysUntil);
        return { type: 'delay', days: d,
          title: 'Posible retraso',
          message: `Llevas ${d} día${d === 1 ? '' : 's'} de atraso sobre la fecha más probable. ¿Ya te llegó? Regístralo.` };
      }
      if (np.inWindow) {
        return { type: 'window',
          title: 'Ventana del periodo',
          message: `Estás dentro de la ventana prevista (${shortRange(np.windowStart, np.windowEnd)}).` };
      }
      if (np.daysUntil <= 2) {
        return { type: 'soon',
          title: 'Tu periodo se acerca',
          message: `Podría llegar en ${np.daysUntil} día${np.daysUntil === 1 ? '' : 's'} (más prob. ${shortDate(np.mostLikely)}).` };
      }
    }
    if (!loggedToday) {
      return { type: 'logToday',
        title: 'Recordatorio',
        message: 'No has registrado nada hoy. Un toque y listo.' };
    }
    return null;
  }

  /** Lanza una notificación (máx. una por día) si hay algo importante. */
  async function maybeNotify() {
    if (!isEnabled()) return;
    const a = check();
    // Solo notificamos lo relevante, no el "registra hoy" (sería insistente).
    if (!a || a.type === 'logToday') return;
    const today = todayStr();
    if (localStorage.getItem(NOTIF_KEY) === today) return; // ya avisamos hoy
    localStorage.setItem(NOTIF_KEY, today);

    const opts = { body: a.message, icon: 'icons/icon.svg', badge: 'icons/icon.svg', tag: 'mi-ciclo-' + a.type };
    try {
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) reg.showNotification(a.title, opts);
      else new Notification(a.title, opts);
    } catch (e) {
      try { new Notification(a.title, opts); } catch (_) {}
    }
  }

  return { check, maybeNotify, requestPermission, disable, isEnabled };
})();
