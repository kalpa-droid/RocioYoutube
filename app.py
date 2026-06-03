import os
import sys
import json
import urllib.parse
import urllib.request
import re
import queue
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Install yt-dlp automatically if missing
try:
    import yt_dlp
except ImportError:
    print("yt-dlp no está instalado. Instalándolo automáticamente...")
    import subprocess
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "yt-dlp"], check=True)
        import yt_dlp
    except Exception as e:
        print(f"Error al instalar yt-dlp: {e}")
        print("Por favor, instala yt-dlp manualmente: pip install yt-dlp")
        sys.exit(1)

def get_download_dir():
    # Detect Android Termux storage or standard OS Downloads folder
    if os.path.exists('/storage/emulated/0/Download'):
        return '/storage/emulated/0/Download'
    return os.path.join(os.path.expanduser('~'), 'Downloads')

def make_hook(send_progress):
    def hook(d):
        if d['status'] == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_approx')
            downloaded = d.get('downloaded_bytes', 0)
            speed = d.get('speed', 0)
            
            percent = 0.0
            if total:
                percent = (downloaded / total) * 100
                
            speed_str = "N/A"
            if speed:
                if speed > 1024 * 1024:
                    speed_str = f"{speed / (1024 * 1024):.1f} MB/s"
                else:
                    speed_str = f"{speed / 1024:.1f} KB/s"
                    
            send_progress({
                'percent': percent,
                'speed': speed_str,
                'status': 'downloading'
            })
        elif d['status'] == 'finished':
            send_progress({
                'percent': 100.0,
                'speed': '0 KB/s',
                'status': 'finished'
            })
    return hook

def download_clean_subtitles(sub_url, output_path):
    req = urllib.request.Request(
        sub_url, 
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req) as response:
        content = response.read().decode('utf-8')

    lines = content.replace('\r\n', '\n').split('\n')
    clean_lines = []
    prev = None

    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith('WEBVTT') or line.startswith('Kind:') or line.startswith('Language:'):
            continue
        if '-->' in line or line.startswith('STYLE') or line.startswith('NOTE'):
            continue
        if re.match(r'^\d+$', line):
            continue
        plain = re.sub(r'<[^>]*>', '', line).strip()
        if not plain:
            continue
        if plain != prev:
            clean_lines.append(plain)
            prev = plain

    clean_text = ' '.join(clean_lines)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(clean_text)

class AppRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Prevent browser caching of API endpoints
        if self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        
        # Route API Info
        if parsed_path.path == '/api/info':
            self.handle_api_info(parsed_path)
            return
            
        # Route API Download
        if parsed_path.path == '/api/download':
            self.handle_api_download(parsed_path)
            return
            
        # Fallback to SimpleHTTPRequestHandler to serve static files
        super().do_GET()

    def handle_api_info(self, parsed_path):
        query_params = urllib.parse.parse_qs(parsed_path.query)
        video_url = query_params.get('url', [None])[0]

        if not video_url:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'La URL es requerida'}).encode('utf-8'))
            return

        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'skip_download': True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                
                # Extract formats
                formats = []
                for f in info.get('formats', []):
                    ext = f.get('ext')
                    vcodec = f.get('vcodec', 'none')
                    acodec = f.get('acodec', 'none')
                    height = f.get('height')
                    
                    is_video = vcodec != 'none' and vcodec is not None
                    is_audio = acodec != 'none' and acodec is not None
                    
                    if not is_video and not is_audio:
                        continue
                        
                    format_type = 'video_only'
                    if is_video and is_audio:
                        format_type = 'muxed'
                    elif is_audio:
                        format_type = 'audio_only'
                        
                    formats.append({
                        'format_id': f.get('format_id'),
                        'ext': ext,
                        'height': height,
                        'format_note': f.get('format_note'),
                        'type': format_type,
                        'filesize': f.get('filesize') or f.get('filesize_approx'),
                    })
                
                # Subtitles
                subtitles = []
                for lang, tracks in info.get('subtitles', {}).items():
                    if lang in ['es', 'en']:
                        for track in tracks:
                            if track.get('ext') in ['vtt', 'srt']:
                                subtitles.append({
                                    'lang': lang,
                                    'ext': track.get('ext'),
                                    'url': track.get('url'),
                                })
                # Auto subtitles
                for lang, tracks in info.get('automatic_captions', {}).items():
                    if lang in ['es', 'en']:
                        if not any(s['lang'] == lang for s in subtitles):
                            for track in tracks:
                                if track.get('ext') in ['vtt', 'srt']:
                                    subtitles.append({
                                        'lang': f"{lang} (auto)",
                                        'ext': track.get('ext'),
                                        'url': track.get('url'),
                                    })

                response_data = {
                    'id': info.get('id'),
                    'title': info.get('title'),
                    'thumbnail': info.get('thumbnail'),
                    'duration': info.get('duration'),
                    'uploader': info.get('uploader'),
                    'formats': formats,
                    'subtitles': subtitles,
                }

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

    def handle_api_download(self, parsed_path):
        query_params = urllib.parse.parse_qs(parsed_path.query)
        video_url = query_params.get('url', [None])[0]
        format_id = query_params.get('format', [None])[0]
        option_type = query_params.get('type', [None])[0]
        sub_url = query_params.get('sub_url', [None])[0]
        filename = query_params.get('filename', ['download'])[0]

        # Sanitize filename
        filename = re.sub(r'[^\w\s\-\.]', '', filename).strip()

        # Send SSE Headers
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Connection', 'keep-alive')
        self.end_headers()

        q = queue.Queue()

        def send_progress(data):
            q.put(data)

        def download_thread():
            try:
                download_dir = get_download_dir()
                os.makedirs(download_dir, exist_ok=True)

                if option_type == 'subtitles':
                    send_progress({'status': 'downloading', 'percent': 20.0, 'speed': 'N/A'})
                    out_path = os.path.join(download_dir, filename)
                    download_clean_subtitles(sub_url, out_path)
                    send_progress({'status': 'completed', 'path': out_path})
                    return

                # Configure yt-dlp
                ydl_opts = {
                    'outtmpl': os.path.join(download_dir, filename),
                    'progress_hooks': [make_hook(send_progress)],
                    'quiet': True,
                    'no_warnings': True,
                }

                if option_type == 'video':
                    # Best quality video up to selected format_id, merge audio
                    ydl_opts['format'] = f"{format_id}+bestaudio/best"
                    ydl_opts['merge_output_format'] = 'mp4'
                elif option_type == 'audio':
                    ydl_opts['format'] = 'bestaudio/best'
                    ydl_opts['postprocessors'] = [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'mp3',
                        'preferredquality': '192',
                    }]

                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([video_url])
                
                # Determine final file path
                ext = 'mp3' if option_type == 'audio' else 'mp4'
                final_path = os.path.join(download_dir, filename)
                if not final_path.endswith(f'.{ext}'):
                    final_path += f'.{ext}'
                
                send_progress({'status': 'completed', 'path': final_path})
            except Exception as e:
                send_progress({'status': 'error', 'message': str(e)})

        # Start download
        threading.Thread(target=download_thread).start()

        # Stream progress events
        while True:
            try:
                msg = q.get(timeout=20)
                self.wfile.write(f"data: {json.dumps(msg)}\n\n".encode('utf-8'))
                self.wfile.flush()
                
                if msg['status'] in ['completed', 'error']:
                    break
            except queue.Empty:
                # Keepalive connection ping
                try:
                    self.wfile.write(f"data: {json.dumps({'status': 'ping'})}\n\n".encode('utf-8'))
                    self.wfile.flush()
                except Exception:
                    break
            except Exception:
                break

def main():
    PORT = 5000
    server_address = ('', PORT)
    
    # Change working directory to script location
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    httpd = ThreadingHTTPServer(server_address, AppRequestHandler)
    print(f"Servidor local iniciado en: http://localhost:{PORT}")
    print(f"Los archivos se guardarán en: {get_download_dir()}")
    
    # Auto-open web browser
    threading.Timer(1.5, lambda: webbrowser.open(f"http://localhost:{PORT}")).start()
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        sys.exit(0)

if __name__ == '__main__':
    main()
