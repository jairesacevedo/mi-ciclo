/* Respaldo automático a Google Drive.
   Usa Google Identity Services (token en el navegador) + Drive REST API.
   El respaldo se guarda en la carpeta OCULTA de la app (appDataFolder):
   privado, no aparece en el Drive del usuario, no lo ensucia.

   Requiere un "ID de cliente de Google" (OAuth) que el usuario crea una vez
   y pega en Ajustes. Ver README para el paso a paso. */

const Drive = (() => {
  const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  const FILE_NAME = 'mi-ciclo-backup.json';
  const LAST_KEY = 'drive_last_backup';

  let tokenClient = null;
  let accessToken = null;
  let autoTimer = null;

  const getClientId = () => Storage.getSetting('driveClientId') || '';
  const isConfigured = () => !!getClientId();
  const isConnected = () => !!accessToken;
  const isAuto = () => Storage.getSetting('driveAuto') !== false; // por defecto: sí
  const lastBackup = () => localStorage.getItem(LAST_KEY);

  function loadGis() {
    return new Promise((resolve, reject) => {
      if (window.google && google.accounts && google.accounts.oauth2) return resolve();
      let s = document.getElementById('gis-script');
      if (s) { s.addEventListener('load', () => resolve()); s.addEventListener('error', reject); return; }
      s = document.createElement('script');
      s.id = 'gis-script';
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true; s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('No se pudo cargar Google (¿sin internet?).'));
      document.head.appendChild(s);
    });
  }

  async function ensureClient() {
    await loadGis();
    if (!tokenClient) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: getClientId(),
        scope: SCOPE,
        callback: () => {}, // se reemplaza en cada petición
      });
    }
  }

  function requestToken(prompt) {
    return new Promise((resolve, reject) => {
      tokenClient.callback = (resp) => {
        if (resp && resp.access_token) { accessToken = resp.access_token; resolve(resp); }
        else reject(new Error(resp && resp.error ? resp.error : 'No se obtuvo el permiso.'));
      };
      tokenClient.error_callback = (err) => reject(new Error(err && err.type ? err.type : 'cancelado'));
      try { tokenClient.requestAccessToken({ prompt }); }
      catch (e) { reject(e); }
    });
  }

  /** Conexión interactiva (abre el consentimiento de Google). */
  async function connect() {
    if (!isConfigured()) throw new Error('Primero pega tu ID de cliente de Google.');
    await ensureClient();
    await requestToken('consent');
    Storage.setSetting('driveConnected', true);
    await backupNow();
    return true;
  }

  /** Intento silencioso al abrir la app (sin mostrar ventana). */
  async function trySilent() {
    if (!isConfigured() || !Storage.getSetting('driveConnected')) return false;
    try {
      await ensureClient();
      await requestToken('');
      return true;
    } catch (e) {
      return false; // requiere reconectar manualmente
    }
  }

  function disconnect() {
    if (accessToken && window.google && google.accounts) {
      try { google.accounts.oauth2.revoke(accessToken, () => {}); } catch (e) {}
    }
    accessToken = null;
    Storage.setSetting('driveConnected', false);
  }

  async function api(url, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      headers: { Authorization: 'Bearer ' + accessToken, ...(opts.headers || {}) },
    });
    if (res.status === 401) { accessToken = null; throw new Error('Tu sesión de Google expiró; vuelve a conectar.'); }
    if (!res.ok) throw new Error('Drive respondió ' + res.status);
    return res;
  }

  async function findFileId() {
    const q = encodeURIComponent(`name='${FILE_NAME}'`);
    const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id)&q=${q}`;
    const data = await (await api(url)).json();
    return data.files && data.files.length ? data.files[0].id : null;
  }

  async function createFile() {
    const data = await (await api('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] }),
    })).json();
    return data.id;
  }

  /** Sube el estado actual a Drive (crea el archivo si no existe). */
  async function backupNow() {
    if (!isConnected()) throw new Error('No estás conectado a Drive.');
    let id = await findFileId();
    if (!id) id = await createFile();
    await api(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: Storage.exportJSON(),
    });
    localStorage.setItem(LAST_KEY, new Date().toISOString());
    return true;
  }

  /** Descarga el respaldo de Drive y reemplaza los datos locales. */
  async function restore() {
    if (!isConnected()) throw new Error('No estás conectado a Drive.');
    const id = await findFileId();
    if (!id) throw new Error('Aún no hay respaldo en Drive.');
    const text = await (await api(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`)).text();
    Storage.importJSON(text);
    return true;
  }

  /** Auto-respaldo tras cambios (con retraso para agrupar cambios). */
  function autoBackup() {
    if (!isConnected() || !isAuto()) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      backupNow().catch(e => console.warn('Auto-respaldo falló:', e.message));
    }, 3000);
  }

  return {
    isConfigured, isConnected, isAuto, getClientId, lastBackup,
    connect, trySilent, disconnect, backupNow, restore, autoBackup,
  };
})();
