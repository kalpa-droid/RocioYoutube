from http.server import BaseHTTPRequestHandler
import urllib.parse
import urllib.request
import json
import re
import yt_dlp

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        
        # Route requests manually in this single entrypoint
        if parsed_path.path == '/api/info':
            self.handle_info(parsed_path)
        elif parsed_path.path == '/api/subtitles':
            self.handle_subtitles(parsed_path)
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Endpoint no encontrado'}).encode('utf-8'))

    def handle_info(self, parsed_path):
        query_params = urllib.parse.parse_qs(parsed_path.query)
        video_url = query_params.get('url', [None])[0]

        if not video_url:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'La URL es requerida'}).encode('utf-8'))
            return

        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'skip_download': True,
                'cookiesfrombrowser': ('chrome', 'firefox', 'brave', 'opera', 'edge', 'chromium', 'safari', 'vivaldi'),
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
                        'url': f.get('url'),
                        'type': format_type,
                        'filesize': f.get('filesize') or f.get('filesize_approx'),
                    })

                # Subtitles
                subtitles = []
                # Captions
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
                        # Don't add if already added as manual
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
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

    def handle_subtitles(self, parsed_path):
        query_params = urllib.parse.parse_qs(parsed_path.query)
        sub_url = query_params.get('url', [None])[0]

        if not sub_url:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'URL de subtítulos requerida'}).encode('utf-8'))
            return

        try:
            req = urllib.request.Request(
                sub_url,
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req) as response:
                content = response.read().decode('utf-8')

            # Clean and merge subtitles
            lines = content.replace('\r\n', '\n').split('\n')
            clean_lines = []
            prev = None

            for line in lines:
                line = line.strip()
                if not line:
                    continue
                # Ignore WEBVTT markers
                if line.startswith('WEBVTT') or line.startswith('Kind:') or line.startswith('Language:'):
                    continue
                # Ignore timestamp lines, styling
                if '-->' in line or line.startswith('STYLE') or line.startswith('NOTE'):
                    continue
                # Ignore line numbers
                if re.match(r'^\d+$', line):
                    continue
                # Clean XML/HTML tags
                plain = re.sub(r'<[^>]*>', '', line).strip()
                if not plain:
                    continue
                # Remove duplicates
                if plain != prev:
                    clean_lines.append(plain)
                    prev = plain

            clean_text = ' '.join(clean_lines)

            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(clean_text.encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
