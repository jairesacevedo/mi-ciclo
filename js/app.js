/* Arranque de la app: navegación entre vistas, tema, service worker. */

const App = (() => {
  let currentView = 'home';

  const TITLES = { home: 'Inicio', calendar: 'Calendario', stats: 'Estadísticas', settings: 'Ajustes' };

  function setView(name) {
    currentView = name;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + name).classList.add('active');
    document.querySelectorAll('.tab').forEach(t =>
      t.classList.toggle('active', t.dataset.view === name));
    document.getElementById('viewTitle').textContent = TITLES[name];
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    switch (currentView) {
      case 'home': Views.renderHome(document.getElementById('view-home')); break;
      case 'calendar': Views.renderCalendar(document.getElementById('view-calendar')); break;
      case 'stats': Views.renderStats(document.getElementById('view-stats')); break;
      case 'settings': Views.renderSettings(document.getElementById('view-settings')); break;
    }
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function setTheme(theme) {
    Storage.setSetting('theme', theme);
    applyTheme(theme);
  }

  function init() {
    applyTheme(Storage.getSetting('theme') || 'auto');

    document.querySelectorAll('.tab').forEach(t =>
      t.onclick = () => setView(t.dataset.view));

    document.getElementById('themeToggle').onclick = () => {
      const cur = Storage.getSetting('theme') || 'auto';
      // Alterna simple: si está en oscuro -> claro, si no -> oscuro.
      setTheme(cur === 'dark' ? 'light' : 'dark');
    };

    // Editor del día: botones.
    document.getElementById('editorSave').onclick = () => Views.saveEditor();
    document.getElementById('editorCancel').onclick = () => Views.closeEditor();
    document.getElementById('editorDelete').onclick = () => Views.deleteEditor();
    document.getElementById('dayEditor').addEventListener('click', (e) => {
      if (e.target.id === 'dayEditor') Views.closeEditor(); // toca fuera para cerrar
    });

    // Auto-respaldo a Drive: reintenta conexión silenciosa y escucha cambios.
    Storage.subscribe(() => Drive.autoBackup());

    // Si hay PIN, pide desbloquear antes de mostrar la app.
    Lock.guard(() => {
      setView('home');
      Drive.trySilent().then(ok => { if (ok) console.info('Drive conectado (auto-respaldo activo).'); });
    });

    // Registra el service worker para funcionar offline (solo bajo http/https).
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('service-worker.js').catch(err =>
        console.warn('Service worker no registrado:', err));
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { render, setView, setTheme };
})();
