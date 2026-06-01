# 🌟 Daimokugrama - Sucesores

¡Bienvenido al **Daimokugrama - Sucesores**! Esta es una aplicación web interactiva y responsiva inspirada en la estética del arte pop (Pop-Art) y el movimiento retro. Diseñada para jóvenes sucesores, proporciona un cronómetro interactivo, un daimokugrama para registrar el progreso pintando letras pixeladas ("SUCESORES"), un tablero para escribir objetivos personales con persistencia automática en el navegador (LocalStorage) y citas inspiradoras de Daisaku Ikeda.

---

## 🎨 Características Destacadas

*   **Estética Retro Pop-Art**: Colores brillantes y contrastes definidos al estilo cómic/retro, tipografías personalizadas (Bangers y Comic Neue), sombras rígidas 3D y una palanca analógica interactiva de detención.
*   **Daimokugrama Dinámico**: Las letras de la palabra **SUCESORES** están formadas por cuadrículas de píxeles interactivos. Cada cuadro representa **5 minutos** de Daimoku. Al hacer clic sobre ellos, se pintan de rosa vibrante y se guardan automáticamente.
*   **Restablecimiento Inteligente**: Botón integrado para reiniciar el Daimokugrama con confirmación de seguridad.
*   **Cronómetro de Práctica**: Permite seleccionar intervalos de tiempo (de 5 a 20 minutos) con una barra deslizante interactiva.
*   **Efecto de Sonido Autogenerado**: Utiliza la API de Audio Web del navegador para sintetizar un agradable sonido de campanada retro al finalizar el tiempo, garantizando compatibilidad y carga instantánea sin necesidad de archivos de sonido externos.
*   **Persistencia Local (LocalStorage)**: Todos tus objetivos y el estado del Daimokugrama se guardan automáticamente en tu dispositivo, para que no pierdas tu progreso al recargar o cerrar la página.
*   **100% Responsivo**: Adaptado perfectamente para celulares pequeños, tablets y computadoras mediante consultas de contenedores y diseño fluido.

---

## 🚀 Cómo Subir a GitHub

Sigue estos sencillos pasos desde la terminal para subir tu Daimokugrama a GitHub:

1.  **Abre una terminal** en esta carpeta (`/home/mappo/Kalpagrafica/Daimokugrama/`).
2.  **Inicializa el repositorio Git**:
    ```bash
    git init
    ```
3.  **Añade todos los archivos**:
    ```bash
    git add .
    ```
4.  **Crea el primer commit**:
    ```bash
    git commit -m "feat: versión inicial de Daimokugrama Sucesores"
    ```
5.  **Crea un repositorio vacío en GitHub** (puedes llamarlo `Daimokugrama`).
6.  **Vincula tu repositorio local con GitHub** y sube la rama principal:
    ```bash
    git remote add origin https://github.com/TU_USUARIO/Daimokugrama.git
    git branch -M main
    git push -u origin main
    ```

---

## ⚡ Cómo Desplegar en Vercel

Vercel detecta automáticamente proyectos estáticos de HTML de forma instantánea y gratuita.

1.  Inicia sesión en [Vercel](https://vercel.com/) (puedes ingresar directamente con tu cuenta de GitHub).
2.  Haz clic en **"Add New..."** y selecciona **"Project"**.
3.  Importa tu repositorio **Daimokugrama** desde tu cuenta de GitHub conectada.
4.  En la sección de configuración, **no necesitas cambiar nada** (Vercel detecta de manera predeterminada el archivo `index.html`).
5.  Haz clic en **"Deploy"**. ¡Listo! En segundos tendrás tu enlace público de Vercel listo para usar y compartir.
