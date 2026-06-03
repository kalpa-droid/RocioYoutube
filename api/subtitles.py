from http.server import BaseHTTPRequestHandler
import urllib.parse
import urllib.request
import json
import re

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        query_params = urllib.parse.parse_qs(parsed_path.query)
        sub_url = query_params.get('url', [None])[0]

        if not sub_url:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
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
            self.send_header('Content-type', 'text/plain; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(clean_text.encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
