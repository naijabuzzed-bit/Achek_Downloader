from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
import yt_dlp
import os
import time
from threading import Thread

app = Flask(__name__)

# Configuration
DOWNLOAD_FOLDER = 'static/downloads'
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

# File cleanup function
def cleanup_old_files():
    """Remove files older than 5 minutes"""
    while True:
        try:
            current_time = time.time()
            for filename in os.listdir(DOWNLOAD_FOLDER):
                filepath = os.path.join(DOWNLOAD_FOLDER, filename)
                if os.path.isfile(filepath):
                    file_age = current_time - os.path.getmtime(filepath)
                    if file_age > 300:  # 5 minutes
                        os.remove(filepath)
                        print(f"Cleaned up old file: {filename}")
        except Exception as e:
            print(f"Cleanup error: {e}")
        time.sleep(60)  # Check every minute

# Start cleanup thread
cleanup_thread = Thread(target=cleanup_old_files, daemon=True)
cleanup_thread.start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/sw.js')
def service_worker():
    """Serve the Monetag service worker file"""
    return send_file('sw.js', mimetype='application/javascript')

@app.route('/fetch_info', methods=['POST'])
def fetch_info():
    try:
        data = request.get_json()
        url = data.get('url')

        if not url:
            return jsonify({'error': 'URL is required'}), 400

        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'socket_timeout': 30,
            'retries': 3,
            'geo_bypass': True,
            'geo_bypass_country': 'US',
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            if info is None:
                return jsonify({'error': 'Could not extract media information'}), 400

            # Get video formats
            video_formats = []
            audio_formats = []

            if 'formats' in info and info['formats']:
                for f in info['formats']:
                    if f.get('vcodec') != 'none' and f.get('acodec') != 'none':
                        quality = f.get('format_note', f.get('quality', 'Unknown'))
                        height = f.get('height', 0)
                        ext = f.get('ext', 'mp4')
                        filesize = f.get('filesize', 0)
                        filesize_mb = round(filesize / (1024 * 1024), 2) if filesize else 'Unknown'

                        video_formats.append({
                            'format_id': f.get('format_id'),
                            'quality': f"{height}p" if height else quality,
                            'ext': ext,
                            'filesize': filesize_mb
                        })

                    elif f.get('acodec') != 'none' and f.get('vcodec') == 'none':
                        abr = f.get('abr', 0)
                        ext = f.get('ext', 'mp3')
                        filesize = f.get('filesize', 0)
                        filesize_mb = round(filesize / (1024 * 1024), 2) if filesize else 'Unknown'

                        audio_formats.append({
                            'format_id': f.get('format_id'),
                            'quality': f"{int(abr)}kbps" if abr else 'Audio',
                            'ext': ext,
                            'filesize': filesize_mb
                        })

                video_formats = sorted(video_formats, key=lambda x: int(x['quality'].replace('p', '')) if x['quality'].replace('p', '').isdigit() else 0, reverse=True)
                audio_formats = sorted(audio_formats, key=lambda x: int(x['quality'].replace('kbps', '')) if 'kbps' in x['quality'] else 0, reverse=True)

            return jsonify({
                'success': True,
                'title': info.get('title', 'Unknown Title'),
                'thumbnail': info.get('thumbnail', ''),
                'uploader': info.get('uploader', 'Unknown'),
                'duration': info.get('duration_string', 'Unknown'),
                'video_formats': video_formats[:15],
                'audio_formats': audio_formats[:8]
            })

    except yt_dlp.utils.DownloadError as e:
        error_msg = str(e)
        if 'DRM' in error_msg or 'protected' in error_msg.lower():
            return jsonify({'error': 'This content is DRM-protected and cannot be downloaded. Try YouTube, Instagram, or TikTok instead.'}), 400
        elif 'geo' in error_msg.lower() or 'not available' in error_msg.lower():
            return jsonify({'error': 'This content is not available in your region or is geo-restricted.'}), 400
        elif 'private' in error_msg.lower():
            return jsonify({'error': 'This content is private and cannot be accessed.'}), 400
        else:
            return jsonify({'error': f'Download error: {error_msg}'}), 400
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@app.route('/download', methods=['POST'])
def download():
    try:
        data = request.get_json()
        url = data.get('url')
        format_id = data.get('format_id')
        download_type = data.get('type', 'video')

        if not url:
            return jsonify({'error': 'URL is required'}), 400

        timestamp = int(time.time())

        if download_type == 'audio':
            output_template = os.path.join(DOWNLOAD_FOLDER, f'audio_{timestamp}.%(ext)s')
            ydl_opts = {
                'format': format_id if format_id else 'bestaudio/best',
                'outtmpl': output_template,
                'quiet': True,
                'no_warnings': True,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '320',
                }],
                'socket_timeout': 30,
                'retries': 3,
            }
        else:
            output_template = os.path.join(DOWNLOAD_FOLDER, f'video_{timestamp}.%(ext)s')
            ydl_opts = {
                'format': format_id if format_id else 'best',
                'outtmpl': output_template,
                'quiet': True,
                'no_warnings': True,
                'socket_timeout': 30,
                'retries': 3,
            }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        downloaded_files = [f for f in os.listdir(DOWNLOAD_FOLDER) if f.startswith(f'{download_type}_{timestamp}')]

        if not downloaded_files:
            return jsonify({'error': 'Download failed - no file was created'}), 500

        download_filename = downloaded_files[0]
        download_url = f'/static/downloads/{download_filename}'

        return jsonify({
            'success': True,
            'download_url': download_url
        })

    except Exception as e:
        return jsonify({'error': f'Download failed: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)