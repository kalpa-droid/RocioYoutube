// PWA Installation
let deferredPrompt;
const installBanner = document.getElementById('installBanner');
const btnInstallApp = document.getElementById('btnInstallApp');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBanner.style.display = 'flex';
});

btnInstallApp.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    deferredPrompt = null;
    installBanner.style.display = 'none';
  }
});

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered successfully.', reg.scope))
      .catch(err => console.log('Service Worker registration failed: ', err));
  });
}

// App Logic
const urlInput = document.getElementById('urlInput');
const btnAnalyze = document.getElementById('btnAnalyze');
const loader = document.getElementById('loader');
const resultContainer = document.getElementById('resultContainer');
const videoCard = document.getElementById('videoCard');
const videoThumbnail = document.getElementById('videoThumbnail');
const videoDuration = document.getElementById('videoDuration');
const videoTitle = document.getElementById('videoTitle');
const videoUploader = document.getElementById('videoUploader');
const optionsList = document.getElementById('optionsList');
const tabVideo = document.getElementById('tabVideo');
const tabAudio = document.getElementById('tabAudio');
const tabSubtitles = document.getElementById('tabSubtitles');

let currentVideoData = null;
let activeTab = 'video';

btnAnalyze.addEventListener('click', analyzeUrl);
tabVideo.addEventListener('click', () => switchTab('video'));
tabAudio.addEventListener('click', () => switchTab('audio'));
tabSubtitles.addEventListener('click', () => switchTab('subtitles'));

async function analyzeUrl() {
  const url = urlInput.value.trim();
  if (!url) return;

  // Show loader and hide results
  loader.style.display = 'flex';
  resultContainer.style.display = 'none';
  btnAnalyze.disabled = true;

  try {
    const response = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Error al analizar la URL');
    }
    
    currentVideoData = await response.json();
    displayVideoInfo();
    switchTab('video');
    resultContainer.style.display = 'block';
  } catch (error) {
    alert(error.message);
  } finally {
    loader.style.display = 'none';
    btnAnalyze.disabled = false;
  }
}

function displayVideoInfo() {
  videoThumbnail.src = currentVideoData.thumbnail;
  videoTitle.textContent = currentVideoData.title;
  videoUploader.textContent = currentVideoData.uploader;
  videoDuration.textContent = formatDuration(currentVideoData.duration);
}

function switchTab(tab) {
  activeTab = tab;
  [tabVideo, tabAudio, tabSubtitles].forEach(btn => btn.classList.remove('active'));
  
  if (tab === 'video') tabVideo.classList.add('active');
  if (tab === 'audio') tabAudio.classList.add('active');
  if (tab === 'subtitles') tabSubtitles.classList.add('active');
  
  renderOptions();
}

function renderOptions() {
  optionsList.innerHTML = '';
  if (!currentVideoData) return;

  if (activeTab === 'video') {
    const formats = currentVideoData.formats.filter(f => f.type === 'muxed' || f.type === 'video_only');
    formats.sort((a, b) => (b.height || 0) - (a.height || 0));

    formats.forEach(f => {
      const sizeStr = f.filesize ? `${(f.filesize / (1024 * 1024)).toFixed(1)} MB` : 'Desconocido';
      const label = f.type === 'muxed' ? `Video ${f.height}p (Con Audio)` : `Video ${f.height}p (Solo Video)`;
      const meta = `${f.ext.toUpperCase()} • ${sizeStr} • Codec: ${f.format_note || 'N/A'}`;
      
      const filename = `${currentVideoData.title}_${f.height}p.${f.ext}`;
      const item = createOptionItem(label, meta, f.format_id, 'video', filename);
      optionsList.appendChild(item);
    });

    if (formats.length === 0) {
      showEmptyMessage('No se encontraron formatos de video.');
    }
  } else if (activeTab === 'audio') {
    const formats = currentVideoData.formats.filter(f => f.type === 'audio_only');
    formats.sort((a, b) => (b.filesize || 0) - (a.filesize || 0));

    formats.forEach(f => {
      const sizeStr = f.filesize ? `${(f.filesize / (1024 * 1024)).toFixed(1)} MB` : 'Desconocido';
      const label = `Audio (${f.format_note || f.ext.toUpperCase()})`;
      const meta = `${f.ext.toUpperCase()} • ${sizeStr}`;
      
      const filename = `${currentVideoData.title}_audio.mp3`;
      const item = createOptionItem(label, meta, 'bestaudio', 'audio', filename);
      optionsList.appendChild(item);
    });

    if (formats.length === 0) {
      showEmptyMessage('No se encontraron formatos de audio.');
    }
  } else if (activeTab === 'subtitles') {
    const subtitles = currentVideoData.subtitles;

    subtitles.forEach(sub => {
      const label = `Subtítulos: ${sub.lang.toUpperCase()}`;
      const meta = `Formato: ${sub.ext.toUpperCase()} • Limpio (.TXT)`;
      
      const filename = `${currentVideoData.title}_sub_${sub.lang}.txt`;
      const item = createSubtitleOptionItem(label, meta, sub.url, filename);
      optionsList.appendChild(item);
    });

    if (subtitles.length === 0) {
      showEmptyMessage('No se encontraron subtítulos en español o inglés.');
    }
  }
}

// Select progress components
const progressPanel = document.getElementById('progressPanel');
const progressTitle = document.getElementById('progressTitle');
const progressSpeed = document.getElementById('progressSpeed');
const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');

function startLocalDownload(params) {
  progressPanel.style.display = 'block';
  progressTitle.textContent = 'Iniciando descarga...';
  progressSpeed.textContent = '0 KB/s';
  progressBar.style.width = '0%';
  progressPercent.textContent = '0%';

  const downloadLinks = document.querySelectorAll('.download-link');
  downloadLinks.forEach(btn => btn.setAttribute('disabled', 'true'));
  btnAnalyze.disabled = true;

  const queryStr = new URLSearchParams(params).toString();
  const eventSource = new EventSource(`/api/download?${queryStr}`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.status === 'downloading') {
      const pct = data.percent.toFixed(1);
      progressTitle.textContent = `Descargando: ${params.filename}`;
      progressSpeed.textContent = data.speed;
      progressBar.style.width = `${pct}%`;
      progressPercent.textContent = `${pct}%`;
    } else if (data.status === 'completed') {
      progressTitle.textContent = '¡Completado!';
      progressSpeed.textContent = 'Guardado';
      progressBar.style.width = '100%';
      progressPercent.textContent = '100%';
      alert(`¡Descarga completada!\nArchivo guardado en:\n${data.path}`);
      
      eventSource.close();
      enableActions();
    } else if (data.status === 'error') {
      progressTitle.textContent = 'Error en la descarga';
      progressSpeed.textContent = '';
      alert(`Error en la descarga:\n${data.message}`);
      
      eventSource.close();
      enableActions();
    }
  };

  eventSource.onerror = () => {
    progressTitle.textContent = 'Error de conexión';
    progressSpeed.textContent = '';
    alert('Error: Conexión con el servidor interrumpida.');
    eventSource.close();
    enableActions();
  };
}

async function startWebDownload(params) {
  const downloadLinks = document.querySelectorAll('.download-link');
  downloadLinks.forEach(btn => btn.setAttribute('disabled', 'true'));
  btnAnalyze.disabled = true;

  progressPanel.style.display = 'block';
  progressSpeed.textContent = '';
  progressBar.style.width = '0%';
  progressPercent.textContent = '0%';

  if (params.type === 'subtitles') {
    progressTitle.textContent = 'Obteniendo subtítulos...';
    progressBar.style.width = '50%';
    progressPercent.textContent = '50%';
    
    try {
      const response = await fetch(`/api/subtitles?url=${encodeURIComponent(params.sub_url)}`);
      if (!response.ok) throw new Error('No se pudieron obtener los subtítulos.');
      const text = await response.text();
      
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = params.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      
      progressTitle.textContent = '¡Completado!';
      progressBar.style.width = '100%';
      progressPercent.textContent = '100%';
    } catch (err) {
      alert(`Error al descargar subtítulos: ${err.message}`);
      progressTitle.textContent = 'Error';
    } finally {
      enableActions();
      setTimeout(() => { progressPanel.style.display = 'none'; }, 2000);
    }
    return;
  }

  progressTitle.textContent = 'Preparando descarga en la nube...';
  progressBar.style.width = '15%';
  progressPercent.textContent = '15%';

  const COBALT_INSTANCES = [
    "https://api.cobalt.tools/api/json",
    "https://cobalt.colinbox.cc/api/json",
    "https://cobalt.cr.us.kg/api/json",
    "https://cobalt-api.kwi.sk/api/json",
    "https://api.cobalt.best/api/json",
    "https://cobalt.foobar.cloud/api/json",
    "https://cobalt.0x.ax/api/json"
  ];

  let success = false;
  let lastErrorMessage = "";

  for (let i = 0; i < COBALT_INSTANCES.length; i++) {
    const currentInstance = COBALT_INSTANCES[i];
    progressTitle.textContent = `Descargando (Servidor ${i + 1}/${COBALT_INSTANCES.length})...`;
    const progressVal = Math.round(15 + ((i / COBALT_INSTANCES.length) * 75));
    progressBar.style.width = `${progressVal}%`;
    progressPercent.textContent = `${progressVal}%`;

    try {
      const response = await fetch(currentInstance, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: params.url,
          vQuality: params.type === "audio" ? "720" : "1080",
          isAudioOnly: params.type === "audio",
          aFormat: "mp3",
          filenamePattern: "classic"
        }),
      });

      if (!response.ok) {
        throw new Error(`Código de estado HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "error" || data.status === "rate-limit") {
        lastErrorMessage = data.text || "La API reportó saturación o límite de peticiones.";
        continue;
      } else if (data.url) {
        const link = document.createElement('a');
        link.href = data.url;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        success = true;
        break;
      }
    } catch (err) {
      lastErrorMessage = err.message || "Error de conexión o bloqueo de CORS.";
    }
  }

  if (success) {
    progressTitle.textContent = '¡Completado!';
    progressBar.style.width = '100%';
    progressPercent.textContent = '100%';
  } else {
    progressTitle.textContent = 'Error';
    alert(`Todas las API de conversión están saturadas o bloqueadas temporalmente por YouTube.\nÚltimo error: "${lastErrorMessage}"`);
  }

  enableActions();
  setTimeout(() => { progressPanel.style.display = 'none'; }, 3000);
}

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

function startDownload(params) {
  if (isLocal) {
    startLocalDownload(params);
  } else {
    startWebDownload(params);
  }
}

function enableActions() {
  const downloadLinks = document.querySelectorAll('.download-link');
  downloadLinks.forEach(btn => btn.removeAttribute('disabled'));
  btnAnalyze.disabled = false;
}

function createOptionItem(label, meta, formatId, type, filename) {
  const li = document.createElement('div');
  li.className = 'option-item';
  
  const info = document.createElement('div');
  info.className = 'option-info';
  info.innerHTML = `
    <span class="option-label">${label}</span>
    <span class="option-meta">${meta}</span>
  `;

  const btn = document.createElement('button');
  btn.className = 'download-link';
  btn.title = 'Descargar';
  btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/></svg>`;
  
  btn.addEventListener('click', () => {
    startDownload({
      url: urlInput.value.trim(),
      format: formatId,
      type: type,
      filename: filename
    });
  });

  li.appendChild(info);
  li.appendChild(btn);
  return li;
}

function createSubtitleOptionItem(label, meta, subUrl, filename) {
  const li = document.createElement('div');
  li.className = 'option-item';
  
  const info = document.createElement('div');
  info.className = 'option-info';
  info.innerHTML = `
    <span class="option-label">${label}</span>
    <span class="option-meta">${meta}</span>
  `;
  
  const btn = document.createElement('button');
  btn.className = 'download-link';
  btn.title = 'Descargar Limpio';
  btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/></svg>`;
  
  btn.addEventListener('click', () => {
    startDownload({
      url: urlInput.value.trim(),
      type: 'subtitles',
      sub_url: subUrl,
      filename: filename
    });
  });

  li.appendChild(info);
  li.appendChild(btn);
  return li;
}

function showEmptyMessage(msg) {
  optionsList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 14px;">${msg}</div>`;
}

function formatDuration(seconds) {
  if (!seconds) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  let result = '';
  if (hrs > 0) {
    result += `${hrs.toString().padStart(2, '0')}:`;
  }
  result += `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return result;
}
