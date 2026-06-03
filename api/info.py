from http.server import BaseHTTPRequestHandler
import urllib.parse
import json
import yt_dlp

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        query_params = urllib.parse.parse_qs(parsed_path.query)
        video_url = query_params.get('url', [None])[0]

        if not video_url:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
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
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
