# Mi Ciclo · para Yire 💗

App web instalable (PWA) para llevar registro del ciclo menstrual y **pronosticar** el próximo periodo mediante una **ventana de probabilidad**, pensada para ciclos irregulares.

- 📅 Registro de periodo (intensidad), síntomas, ánimo, relaciones (con/sin condón) y notas.
- 🔮 Predicción por **ventana de probabilidad** (rango + fecha más probable + nivel de variabilidad).
- 🌸 Estimación de ventana fértil (con aviso: aproximada, no es método anticonceptivo).
- 📊 Estadísticas e historial de ciclos.
- 🔐 Bloqueo con PIN.
- 🩺 Informe imprimible para el médico (→ Guardar como PDF).
- ☁️ Respaldo automático a Google Drive.
- 🔒 **Privacidad:** los datos se guardan **solo en tu dispositivo**. No hay servidor ni cuentas. El único envío externo, si lo activas, es tu propio respaldo cifrado por Google a **tu** Drive.

---

## 🧪 Probar en local

Desde esta carpeta:

```bash
python -m http.server 8138
```

Abre `http://127.0.0.1:8138`. (El respaldo a Drive y la instalación como app requieren `localhost` o HTTPS; ambos cuentan como contexto seguro.)

---

## 🚀 Desplegar en GitHub Pages

1. Crea un repositorio **público** en GitHub, por ejemplo `mi-ciclo`.
   > El *código* es público, pero **tus datos no** viven en el repo (se quedan en tu dispositivo / tu Drive), así que no hay problema de privacidad. Pages en repos privados requiere plan de pago.

2. Sube el proyecto (ya está iniciado como repo git con un commit):

   ```bash
   git remote add origin https://github.com/<usuario>/mi-ciclo.git
   git branch -M main
   git push -u origin main
   ```

3. En GitHub: **Settings → Pages → Source: "Deploy from a branch" → Branch: `main` / `(root)` → Save**.

4. Tras un minuto estará en:

   ```
   https://<usuario>.github.io/mi-ciclo/
   ```

5. En el celular de Yire: abre ese enlace → menú del navegador → **"Agregar a pantalla de inicio"**. Ya se comporta como app y funciona offline.

> Todas las rutas del proyecto son **relativas**, por lo que funciona bien bajo la subruta `/mi-ciclo/`.

---

## ☁️ Activar el respaldo automático a Google Drive

La app no tiene servidor propio, así que el acceso a *tu* Drive lo autorizas *tú* con un **ID de cliente de Google (OAuth)** gratuito. Se hace una sola vez:

1. Entra a **[Google Cloud Console](https://console.cloud.google.com/)** e inicia sesión.
2. Crea un **proyecto** nuevo (ícono arriba a la izquierda → *Nuevo proyecto*).
3. Menú → **APIs y servicios → Biblioteca** → busca **"Google Drive API"** → **Habilitar**.
4. Menú → **APIs y servicios → Pantalla de consentimiento de OAuth**:
   - Tipo de usuario: **Externo** → Crear.
   - Completa nombre de la app y tu correo. En **Usuarios de prueba**, agrega el correo de Google que usará Yire.
5. Menú → **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - Tipo de aplicación: **Aplicación web**.
   - En **Orígenes de JavaScript autorizados**, agrega (solo el origen, sin ruta):
     - `https://<usuario>.github.io`
     - `http://localhost:8138` *(opcional, para probar en local)*
   - Crear → copia el **ID de cliente** (termina en `.apps.googleusercontent.com`).
6. En la app: **Ajustes → Respaldo automático · Google Drive** → pega el ID → **Guardar ID** → **Conectar con Google Drive** y acepta los permisos.

Desde ese momento:
- Cada cambio se respalda **automáticamente** (con un pequeño retraso para agrupar cambios).
- Botones para **Respaldar ahora**, **Restaurar desde Drive** y **Desconectar**.
- El respaldo se guarda en la carpeta **oculta de la app** en tu Drive (`appDataFolder`): privado y sin ensuciar tus archivos.

> Notas: el permiso solicitado es solo `drive.appdata` (la app **no** ve el resto de tu Drive). Mientras la app esté en modo *"prueba"* en la pantalla de consentimiento, el acceso puede caducar cada ~7 días y bastará con volver a **Conectar**. Publicar la app en Google evita eso, pero para uso personal el modo prueba es suficiente.

---

## 📁 Estructura

```
index.html · manifest.webmanifest · service-worker.js · README.md
css/styles.css
js/  util · storage · predict · security · drive · report · calendar · views · app
icons/  icon.svg · icon-maskable.svg
```

Hecho con cariño para Yire.
