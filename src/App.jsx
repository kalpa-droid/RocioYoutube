import React, { useState, useRef, useEffect } from 'react';
import { Terminal, FileText, Download, Copy, CheckCircle, Settings, FileDown, Sparkles } from 'lucide-react';

const Youtube = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <polygon points="10 15 15 12 10 9" fill="currentColor" />
  </svg>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('generator');
  
  // States for Generator
  const [url, setUrl] = useState('');
  const [quality, setQuality] = useState('audio');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // States for Subtitle Purifier
  const [srtText, setSrtText] = useState('');
  const [parsedText, setParsedText] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  // States for PWA Installation
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent standard browser prompt
      e.preventDefault();
      // Store event
      setDeferredPrompt(e);
      // Show custom installation banner
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already running as standalone (installed)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setShowInstallBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the PWA install prompt');
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  // --- 1. LÓGICA DE DESCARGA DIRECTA (Vía API Pública Rotativa / Failover) ---
  const COBALT_INSTANCES = [
    "https://api.cobalt.tools/api/json",
    "https://cobalt.colinbox.cc/api/json",
    "https://cobalt.cr.us.kg/api/json",
    "https://cobalt-api.kwi.sk/api/json",
    "https://api.cobalt.best/api/json",
    "https://cobalt.foobar.cloud/api/json",
    "https://cobalt.0x.ax/api/json"
  ];

  const handleDownload = async () => {
    if (!url) {
      setError("Por favor, ingresa un enlace válido de YouTube.");
      return;
    }
    
    setLoading(true);
    setError(null);
    let success = false;
    let lastErrorMessage = "";

    for (let i = 0; i < COBALT_INSTANCES.length; i++) {
      const currentInstance = COBALT_INSTANCES[i];
      console.log(`Intentando descarga con instancia ${i + 1}/${COBALT_INSTANCES.length}: ${currentInstance}`);
      
      try {
        const response = await fetch(currentInstance, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: url,
            vQuality: quality === "audio" ? "720" : quality,
            isAudioOnly: quality === "audio",
            aFormat: "mp3",
            filenamePattern: "classic"
          }),
        });

        if (!response.ok) {
          throw new Error(`Código de estado HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === "error" || data.status === "rate-limit") {
          console.warn(`Instancia ${currentInstance} falló:`, data.text);
          lastErrorMessage = data.text || "La API reportó saturación o límite de peticiones.";
          continue; // Pasa a la siguiente instancia
        } else if (data.url) {
          // Descarga exitosa
          const link = document.createElement('a');
          link.href = data.url;
          link.setAttribute('download', ''); 
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          success = true;
          break; // Detener bucle
        }
      } catch (err) {
        console.warn(`Error de red o conexión en instancia ${currentInstance}:`, err.message || err);
        lastErrorMessage = err.message || "Error de conexión o bloqueo de CORS.";
        // Continuar intentando con la siguiente
      }
    }

    if (!success) {
      setError(`Todas las API de conversión están saturadas o bloqueadas temporalmente por YouTube. Último reporte: "${lastErrorMessage}". Por favor, reintenta en unos instantes.`);
    }
    setLoading(false);
  };

  // --- 2. LÓGICA DE PURGA DE SUBTÍTULOS (Reemplazo de sed/awk) ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name.replace('.srt', ''));
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawText = event.target.result;
      setSrtText(rawText);
      processSubtitles(rawText);
    };
    reader.readAsText(file);
  };

  const processSubtitles = (raw) => {
    // 1. Destruye marcas SRT y aniquila "Espacios Fantasma" (Equivalente a sed)
    const lines = raw.replace(/\r/g, '').split('\n');
    let processedLines = [];
    let prev = "";

    for (let line of lines) {
      const trimmedLine = line.trim();
      
      // Ignorar líneas que son solo números (índices SRT) y marcas de tiempo (-->)
      if (/^[0-9]+$/.test(trimmedLine) || trimmedLine.includes('-->')) continue;

      // Limpieza de etiquetas HTML (<font>, <i>, etc.)
      const cleanLine = trimmedLine.replace(/<[^>]*>/g, '').trim();

      // 2. Motor de memoria: destruye duplicados y vacíos (Equivalente a awk)
      if (cleanLine && cleanLine !== prev) {
        processedLines.push(cleanLine);
        prev = cleanLine; // Actualiza el tracker de memoria para evitar duplicados
      }
    }

    // 3. Fusión a Párrafo Único
    setParsedText(processedLines.join(' '));
  };

  const downloadTxt = () => {
    if (!parsedText) return;
    const blob = new Blob([parsedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName ? fileName : 'Subtitulos_Puros'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-4 md:p-8 selection:bg-cyan-900 selection:text-cyan-50 relative overflow-hidden">
      
      {/* Decorative ambient glowing circles */}
      <div className="ambient-bg-1"></div>
      <div className="ambient-bg-2"></div>

      {/* HEADER */}
      <header className="max-w-4xl mx-auto mb-8 flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
            <Youtube className="w-8 h-8 text-red-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight font-sans">
              Rocio<span className="text-cyan-500 bg-clip-text">youtube</span>
            </h1>
            <p className="text-xs font-mono text-slate-500 mt-0.5">Directiva Sysadmin: Control estricto local v3.0</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800 text-[11px] text-cyan-400 font-mono">
          <Sparkles className="w-3.5 h-3.5" /> PWA LISTO
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto glass-container rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl transition-all duration-300">
        
        {/* TABS */}
        <div className="flex border-b border-slate-800/80 bg-slate-950/40">
          <button 
            onClick={() => setActiveTab('generator')}
            className={`flex-1 py-4 px-6 flex items-center justify-center gap-2.5 font-bold transition-all relative ${
              activeTab === 'generator' 
                ? 'text-cyan-400 bg-slate-900/50' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
            }`}
          >
            <Download className="w-5 h-5" />
            Descargador Directo
            {activeTab === 'generator' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 tab-indicator"></span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('purifier')}
            className={`flex-1 py-4 px-6 flex items-center justify-center gap-2.5 font-bold transition-all relative ${
              activeTab === 'purifier' 
                ? 'text-cyan-400 bg-slate-900/50' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
            }`}
          >
            <FileText className="w-5 h-5" />
            Purga de Subtítulos SRT
            {activeTab === 'purifier' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 tab-indicator"></span>
            )}
          </button>
        </div>

        {/* TAB 1: GENERATOR */}
        {activeTab === 'generator' && (
          <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* URL Input */}
              <div className="space-y-2.5 col-span-1 md:col-span-2">
                <label className="text-sm font-bold text-slate-400 flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-red-500" /> Enlace de YouTube
                </label>
                <input 
                  type="text" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3.5 text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                />
              </div>

              {/* Quality Selector */}
              <div className="space-y-2.5 col-span-1 md:col-span-2">
                <label className="text-sm font-bold text-slate-400 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-cyan-500" /> Formato de Extracción
                </label>
                <div className="relative">
                  <select 
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3.5 text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 appearance-none font-mono text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] cursor-pointer"
                  >
                    <option value="audio">🎵 Descargar Solo Audio (MP3)</option>
                    <option value="1080">📹 Descargar Video FHD (1080p)</option>
                    <option value="720">📹 Descargar Video HD (720p)</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3.5 rounded-xl text-sm font-medium animate-in slide-in-from-top-2 duration-200">
                ⚠️ {error}
              </div>
            )}

            {/* Download Button */}
            <div className="mt-8 pt-6 border-t border-slate-800/80">
              <button 
                onClick={handleDownload}
                disabled={loading || !url}
                className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-lg transition-all transform active:scale-98 shadow-lg ${
                  loading || !url 
                    ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/30' 
                    : 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 shadow-cyan-500/15 hover:shadow-cyan-500/30 border border-cyan-400/20'
                }`}
              >
                <Download className={`w-6 h-6 ${loading ? 'animate-bounce' : ''}`} />
                {loading ? 'Procesando descarga en la nube...' : (quality === 'audio' ? 'Descargar MP3 Directo' : 'Descargar Video Directo')}
              </button>
              <div className="text-center text-xs text-slate-500 mt-4 space-y-1 font-medium">
                <p>📱💻 Compatible con PC, Android y iPhone.</p>
                <p>* El archivo se guardará automáticamente en tu carpeta de <strong>Descargas</strong>.</p>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: SUBTITLE PURIFIER */}
        {activeTab === 'purifier' && (
          <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
            
            {!parsedText ? (
              <div 
                className="border-2 border-dashed border-slate-700/60 rounded-2xl p-12 text-center hover:border-cyan-500/80 hover:bg-slate-900/20 transition-all duration-300 cursor-pointer group shadow-inner"
                onClick={() => fileInputRef.current.click()}
              >
                <input 
                  type="file" 
                  accept=".srt"
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload} 
                />
                <FileDown className="w-14 h-14 mx-auto text-slate-500 group-hover:text-cyan-400 mb-4 transition-all duration-300 transform group-hover:-translate-y-1" />
                <h3 className="text-lg font-bold text-slate-200">Cargar archivo .SRT</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium">Haz clic o arrastra aquí tu archivo de subtítulos.</p>
                <p className="text-xs text-slate-600 mt-5 font-mono bg-slate-950/60 py-1.5 px-3 rounded-lg inline-block">
                  sed -i -E 's/\r//g...' && awk '...'
                </p>
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      Purga Absoluta Completada
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{fileName}.txt</p>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <button 
                      onClick={() => { setParsedText(''); setSrtText(''); }}
                      className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-bold text-slate-400 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 rounded-xl transition-all"
                    >
                      Limpiar
                    </button>
                    <button 
                      onClick={downloadTxt}
                      className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-bold text-slate-950 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                    >
                      <Download className="w-4 h-4" />
                      Descargar TXT
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800/80 h-96 overflow-y-auto custom-scrollbar shadow-inner">
                  <p className="text-slate-300 leading-relaxed text-justify font-sans text-sm selection:bg-cyan-900">
                    {parsedText}
                  </p>
                </div>
              </div>
            )}
            
          </div>
        )}
      </main>

      {/* PWA GLASSMORPHISM INSTALLATION BANNER */}
      {showInstallBanner && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 p-5 rounded-2xl glass-container border border-cyan-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col gap-4 animate-in slide-in-from-bottom-5 duration-500 neon-glow-cyan">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-red-500 flex-shrink-0 flex items-center justify-center shadow-md">
              <Youtube className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-1.5">
                Instalar Rocioyoutube 📲
              </h3>
              <p className="text-xs text-slate-400 leading-normal mt-0.5">
                Añádelo a tu pantalla de inicio para acceder al instante, con mayor fluidez y soporte sin conexión.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-end font-sans">
            <button 
              onClick={() => setShowInstallBanner(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-800"
            >
              Cerrar
            </button>
            <button 
              onClick={handleInstallApp}
              className="text-xs font-black bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
            >
              INSTALAR
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
