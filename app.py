
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
import yt_dlp
import os
import re
from urllib.parse import urlparse
import threading
import time
from datetime import datetime

app = Flask(__name__)

# Configuration
DOWNLOAD_FOLDER = os.path.join('static', 'downloads')
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

# File cleanup configuration
FILE_RETENTION_SECONDS = 300  # 5 minutes

def cleanup_old_files():
    """Background task to clean up old downloaded files"""
    while True:
        try:
            current_time = time.time()
            for filename in os.listdir(DOWNLOAD_FOLDER):
                filepath = os.path.join(DOWNLOAD_FOLDER, filename)
                if os.path.isfile(filepath):
                    file_age = current_time - os.path.getmtime(filepath)
                    if file_age > FILE_RETENTION_SECONDS:
                        os.remove(filepath)
                        print(f"Cleaned up old file: {filename}")
        except Exception as e:
            print(f"Error in cleanup task: {e}")
        time.sleep(60)  # Run every minute

# Start cleanup thread
cleanup_thread = threading.Thread(target=cleanup_old_files, daemon=True)
cleanup_thread.start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/sitemap.xml')
def sitemap():
    """Serve sitemap for SEO"""
    return send_from_directory('static', 'sitemap.xml', mimetype='application/xml')

@app.route('/robots.txt')
def robots():
    """Serve robots.txt for SEO"""
    robots_content = """User-agent: *
Allow: /
Sitemap: https://downloader.achek.com.ng/sitemap.xml

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /
"""
    return app.response_class(robots_content, mimetype='text/plain')

@app.route('/fetch_info', methods=['POST'])
def fetch_info():
    try:
        data = request.json
        url = data.get('url')
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400

        # Enhanced yt-dlp options for maximum compatibility
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'force_generic_extractor': False,
            'nocheckcertificate': True,
            'geo_bypass': True,
            'socket_timeout': 30,
            'retries': 3,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-us,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
            },
            'extractor_args': {
                'youtube': {
                    'skip': ['dash', 'hls'],
                    'player_client': ['android', 'web'],
                },
                'instagram': {
                    'api': ['graphql'],
                },
                'tiktok': {
                    'api': ['mobile_api'],
                },
                'audiomack': {
                    'api': ['web'],
                }
            },
            'cookiesfrombrowser': None,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '320',
            }]
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(url, download=False)
            except yt_dlp.utils.DownloadError as e:
                error_msg = str(e).lower()
                
                # DRM-protected platforms
                if any(platform in url.lower() for platform in ['spotify', 'netflix', 'disneyplus', 'disney+', 'hulu', 'amazon', 'prime', 'apple.com/music']):
                    return jsonify({
                        'error': 'This platform uses DRM (Digital Rights Management) encryption which makes downloading technically impossible. Please use supported platforms like YouTube, Instagram, TikTok, Facebook, Twitter, Vimeo, or SoundCloud.'
                    }), 400
                
                # Geo-restriction
                if 'geo' in error_msg or 'not available' in error_msg or 'region' in error_msg:
                    return jsonify({
                        'error': 'This content is geo-restricted and not available in your region. Try using a VPN or choose content available in your location.'
                    }), 400
                
                # Private/Login required
                if 'login' in error_msg or 'private' in error_msg or 'sign in' in error_msg:
                    return jsonify({
                        'error': 'This content is private or requires login. We can only download public content.'
                    }), 400
                
                # Generic error
                return jsonify({
                    'error': f'Unable to fetch media info. This could be due to: private content, geo-restrictions, platform limitations, or an invalid URL. Error: {str(e)}'
                }), 400

        # Extract media information
        formats = info.get('formats', [])
        
        video_formats = []
        audio_formats = []
        
        for f in formats:
            if f.get('vcodec') != 'none' and f.get('acodec') != 'none':
                quality = f.get('format_note', f.get('height', 'Unknown'))
                ext = f.get('ext', 'mp4')
                filesize = f.get('filesize') or f.get('filesize_approx', 0)
                
                video_formats.append({
                    'format_id': f['format_id'],
                    'quality': f"{quality}p" if isinstance(quality, int) else quality,
                    'ext': ext,
                    'filesize': round(filesize / (1024*1024), 2) if filesize else 'Unknown'
                })
            
            elif f.get('acodec') != 'none' and f.get('vcodec') == 'none':
                abr = f.get('abr', f.get('tbr', 'Unknown'))
                ext = f.get('ext', 'mp3')
                filesize = f.get('filesize') or f.get('filesize_approx', 0)
                
                audio_formats.append({
                    'format_id': f['format_id'],
                    'quality': f"{int(abr)}kbps" if isinstance(abr, (int, float)) else str(abr),
                    'ext': ext,
                    'filesize': round(filesize / (1024*1024), 2) if filesize else 'Unknown'
                })

        video_formats = sorted(video_formats, key=lambda x: int(re.search(r'\d+', x['quality']).group()) if re.search(r'\d+', x['quality']) else 0, reverse=True)
        audio_formats = sorted(audio_formats, key=lambda x: int(re.search(r'\d+', x['quality']).group()) if re.search(r'\d+', x['quality']) else 0, reverse=True)

        return jsonify({
            'title': info.get('title', 'Unknown Title'),
            'thumbnail': info.get('thumbnail', ''),
            'uploader': info.get('uploader', 'Unknown'),
            'duration': info.get('duration_string', 'Unknown'),
            'video_formats': video_formats[:10],
            'audio_formats': audio_formats[:5]
        })

    except Exception as e:
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/download', methods=['POST'])
def download():
    try:
        data = request.json
        url = data.get('url')
        format_id = data.get('format_id')
        download_type = data.get('type', 'video')
        
        if not url or not format_id:
            return jsonify({'error': 'URL and format_id are required'}), 400

        # Handle best quality selectors
        if format_id == 'best':
            format_selector = 'bestvideo+bestaudio/best'
        elif format_id == 'bestaudio':
            format_selector = 'bestaudio/best'
        else:
            format_selector = format_id

        filename = f"download_{format_id}_{int(time.time())}.%(ext)s"
        filepath = os.path.join(DOWNLOAD_FOLDER, filename)

        ydl_opts = {
            'format': format_selector,
            'outtmpl': filepath,
            'quiet': True,
            'no_warnings': True,
            'nocheckcertificate': True,
            'geo_bypass': True,
            'socket_timeout': 30,
            'retries': 3,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
        }
        
        # Add audio extraction for audio downloads
        if download_type == 'audio' or format_id == 'bestaudio':
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '320',
            }]

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        downloaded_file = None
        for file in os.listdir(DOWNLOAD_FOLDER):
            if file.startswith(f"download_{format_id}"):
                downloaded_file = file
                break

        if downloaded_file:
            return jsonify({
                'success': True,
                'download_url': f'/static/downloads/{downloaded_file}'
            })
        else:
            return jsonify({'error': 'Download failed'}), 500

    except Exception as e:
        return jsonify({'error': f'Download failed: {str(e)}'}), 500

if __name__ == '__main__':
    # For cPanel deployment, it will use its own port management
    # For Replit, use 0.0.0.0:5000
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
