#!/bin/bash
# Ir al directorio del script
cd "$(dirname "$0")"

echo "============================================="
echo " YouTube Smart PWA - Iniciador Local"
echo "============================================="

# Crear el entorno virtual si no existe
if [ ! -d ".venv" ]; then
    echo "[+] Creando entorno virtual Python (.venv)..."
    python -m venv .venv
    if [ $? -ne 0 ]; then
        echo "[!] Error al crear el entorno virtual. Asegúrate de tener python-venv instalado."
        exit 1
    fi
fi

# Activar el entorno virtual
source .venv/bin/activate

# Actualizar pip e instalar/actualizar yt-dlp
echo "[+] Asegurando que yt-dlp esté instalado y actualizado..."
pip install --upgrade pip
pip install --upgrade yt-dlp

# Ejecutar el servidor
echo "[+] Iniciando la aplicación..."
python app.py
