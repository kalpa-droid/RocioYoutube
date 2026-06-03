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
    // Show muxed streams first, then video_only streams
    const formats = currentVideoData.formats.filter(f => f.type === 'muxed' || f.type === 'video_only');
    
    // Sort by height descending
    formats.sort((a, b) => (b.height || 0) - (a.height || 0));

    formats.forEach(f => {
      const sizeStr = f.filesize ? `${(f.filesize / (1024 * 1024)).toFixed(1)} MB` : 'Desconocido';
      const label = f.type === 'muxed' ? `Video ${f.height}p (Con Audio)` : `Video ${f.height}p (Solo Video)`;
      const meta = `${f.ext.toUpperCase()} • ${sizeStr} • Codec: ${f.format_note || 'N/A'}`;
      
      const item = createOptionItem(label, meta, f.url, `${currentVideoData.title}_${f.height}p.${f.ext}`);
      optionsList.appendChild(item);
    });

    if (formats.length === 0) {
      showEmptyMessage('No se encontraron formatos de video.');
    }
  } else if (activeTab === 'audio') {
    const formats = currentVideoData.formats.filter(f => f.type === 'audio_only');
    
    // Sort by filesize/quality descending
    formats.sort((a, b) => (b.filesize || 0) - (a.filesize || 0));

    formats.forEach(f => {
      const sizeStr = f.filesize ? `${(f.filesize / (1024 * 1024)).toFixed(1)} MB` : 'Desconocido';
      const label = `Audio (${f.format_note || f.ext.toUpperCase()})`;
      const meta = `${f.ext.toUpperCase()} • ${sizeStr}`;
      
      const item = createOptionItem(label, meta, f.url, `${currentVideoData.title}_audio.${f.ext}`);
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
      
      const item = createSubtitleOptionItem(label, meta, sub.url, `${currentVideoData.title}_sub_${sub.lang}.txt`);
      optionsList.appendChild(item);
    });

    if (subtitles.length === 0) {
      showEmptyMessage('No se encontraron subtítulos en español o inglés.');
    }
  }
}

function createOptionItem(label, meta, downloadUrl, filename) {
  const li = document.createElement('div');
  li.className = 'option-item';
  li.innerHTML = `
    <div class="option-info">
      <span class="option-label">${label}</span>
      <span class="option-meta">${meta}</span>
    </div>
    <a href="${downloadUrl}" target="_blank" download="${filename}" class="download-link" title="Descargar">
      <svg viewBox="0 0 24 24"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/></svg>
    </a>
  `;
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
  
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      const res = await fetch(`/api/subtitles?url=${encodeURIComponent(subUrl)}`);
      if (!res.ok) throw new Error('Error al descargar subtítulos');
      const text = await res.text();
      
      // Trigger browser download
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
    }
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
    result += `${hrs.toString().padLeft(2, '0')}:`;
  }
  result += `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return result;
}
