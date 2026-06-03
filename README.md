# YouTube Smart PWA

Una Progressive Web App (PWA) de alto rendimiento, optimizada para móviles y escritorio, diseñada para descargar videos, audios y transcripciones limpias de YouTube de forma instantánea.

La aplicación incluye un **backend serverless en Python** que extrae enlaces directamente de la CDN de YouTube (evitando restricciones de CORS) y limpia subtítulos al instante.

---

## ⚡ Características Principales

- **Mobile First & Premium Design**: Interfaz moderna con tema oscuro, efecto glassmorphic y mesh blur.
- **PWA Instalable**: Carga de Service Worker para caché offline e instalación directa desde el navegador (soporta banner de instalación en app).
- **Backend Optimizado**: API serverless en Python (`yt-dlp`) que extrae formatos reales y genera enlaces de descarga directa sin límites de peso ni timeouts.
- **Descarga Limpia de Subtítulos**: Extrae y une subtítulos en un único párrafo de texto limpio (.TXT) sin marcas de tiempo ni duplicados.

---

## 🚀 Despliegue en Vercel (PWA + Backend)

Vercel detecta la estructura de este proyecto y lo compila automáticamente.

1. **Sube el proyecto a GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <tu-repositorio-de-github>
   git push -u origin main
   ```

2. **Despliega en Vercel**:
   - Conecta tu cuenta de Vercel a tu GitHub.
   - Selecciona **Add New -> Project** e importa este repositorio.
   - Deja todas las configuraciones por defecto. Vercel detectará el frontend estático y desplegará automáticamente las funciones de `/api/` en su entorno Python.

---

## 🤖 Cómo convertir esta WebApp en un APK (Android)

Dado que es una PWA 100% estándar y compatible, empaquetarla en una APK toma **menos de 3 minutos**:

### Método Rápido (Recomendado: PWABuilder)
1. Despliega tu aplicación en Vercel y obtén la URL de producción (por ejemplo: `https://tu-app.vercel.app`).
2. Ve a [PWABuilder.com](https://www.pwabuilder.com/).
3. Pega tu URL de Vercel y haz clic en **Start**.
4. PWABuilder analizará tu PWA (verificará el `manifest.json` y el `sw.js` que ya están configurados).
5. Haz clic en **Build My APK** para descargar un archivo ZIP que contiene la APK lista para instalar en tu teléfono y los archivos fuente para Google Play.

### Método Local (Capacitor)
Si prefieres generar el proyecto nativo de Android en tu propia máquina:
1. Inicializa Capacitor en la carpeta raíz:
   ```bash
   npm init @capacitor/app
   ```
2. Instala el SDK de Android de Capacitor:
   ```bash
   npm install @capacitor/android
   npx cap add android
   ```
3. Sincroniza y compila tu APK:
   ```bash
   npx cap sync
   npx cap open android
   ```
   Esto abrirá Android Studio para compilar y generar tu archivo APK directamente.
