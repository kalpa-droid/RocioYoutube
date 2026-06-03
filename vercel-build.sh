#!/bin/bash
# Crear directorio dist
mkdir -p dist

# Copiar archivos estáticos al directorio dist
cp index.html dist/
cp app.js dist/
cp style.css dist/
cp favicon.png dist/
cp manifest.json dist/
cp sw.js dist/

# Copiar el directorio de iconos si existe
if [ -d "icons" ]; then
  cp -r icons dist/
fi

echo "¡Compilación completada con éxito para Vercel!"
