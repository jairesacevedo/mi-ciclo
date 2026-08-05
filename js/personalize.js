/* Personalización: paleta de colores, nombre/apodo, saludo y foto.
   Todo se guarda en los ajustes locales (nada sale del dispositivo). */

const Personalize = (() => {

  // Paletas disponibles. 'rosa' es la de siempre (valores base del CSS).
  const PALETTES = [
    { v: 'rosa',    label: 'Rosa & Morado', c1: '#e5679b', c2: '#9b6dd6' },
    { v: 'durazno', label: 'Durazno',       c1: '#ef7f5f', c2: '#e8a13c' },
    { v: 'lavanda', label: 'Lavanda',       c1: '#8f6fd6', c2: '#d478b8' },
    { v: 'menta',   label: 'Menta',         c1: '#3fb98a', c2: '#5bb8c4' },
    { v: 'cielo',   label: 'Cielo',         c1: '#4d95d6', c2: '#6fc4c4' },
  ];

  const DEFAULT_NAME = 'Bonita';
  const MAX_PHOTO = 320; // px del lado mayor: suficiente y ligero para guardar

  const getPalette = () => Storage.getSetting('palette') || 'rosa';
  const getName = () => (Storage.getSetting('displayName') || DEFAULT_NAME).trim() || DEFAULT_NAME;
  const getGreeting = () => Storage.getSetting('greeting') || '';
  const getPhoto = () => Storage.getSetting('photo') || '';

  /** Texto final del saludo: el personalizado, o "Hola, <nombre> 💗". */
  function greetingText() {
    const custom = getGreeting().trim();
    return custom ? custom : `Hola, ${getName()} 💗`;
  }

  function applyPalette(p) {
    const root = document.documentElement;
    if (!p || p === 'rosa') root.removeAttribute('data-palette');
    else root.setAttribute('data-palette', p);
    // El color de la barra del navegador acompaña a la paleta.
    const meta = document.querySelector('meta[name="theme-color"]');
    const def = PALETTES.find(x => x.v === (p || 'rosa'));
    if (meta && def) meta.setAttribute('content', def.c1);
  }

  function setPalette(p) {
    Storage.setSetting('palette', p);
    applyPalette(p);
  }

  function setName(n) { Storage.setSetting('displayName', (n || '').slice(0, 40)); }
  function setGreeting(g) { Storage.setSetting('greeting', (g || '').slice(0, 80)); }
  function removePhoto() { Storage.setSetting('photo', ''); }

  /** Lee una imagen del celular, la recorta cuadrada y la guarda pequeña. */
  function setPhotoFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) return reject(new Error('Elige una imagen.'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Esa imagen no se pudo abrir.'));
        img.onload = () => {
          try {
            const side = Math.min(img.width, img.height); // recorte cuadrado centrado
            const sx = (img.width - side) / 2;
            const sy = (img.height - side) / 2;
            const c = document.createElement('canvas');
            c.width = c.height = MAX_PHOTO;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, sx, sy, side, side, 0, 0, MAX_PHOTO, MAX_PHOTO);
            const dataUrl = c.toDataURL('image/jpeg', 0.85);
            Storage.setSetting('photo', dataUrl);
            resolve(dataUrl);
          } catch (e) { reject(new Error('No se pudo procesar la imagen.')); }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  return {
    PALETTES, getPalette, setPalette, applyPalette,
    getName, setName, getGreeting, setGreeting, greetingText,
    getPhoto, setPhotoFromFile, removePhoto,
  };
})();
