from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
from werkzeug.utils import secure_filename
import yt_dlp
import os
import time
from pathlib import Path

app = Flask(__name__)

app.config['DOWNLOAD_FOLDER'] = 'static/downloads'
Path(app.config['DOWNLOAD_FOLDER']).mkdir(parents=True, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get-info', methods=['POST'])
def get_info():
    try:
        data = request.get_json()
        url = data.get('url')

        if not url:
            return jsonify({'error': 'URL is required'}), 400

        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'nocheckcertificate': True,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            formats = []
            if 'formats' in info:
                seen = set()
                for f in info['formats']:
                    if f.get('vcodec') != 'none' and f.get('acodec') != 'none':
                        quality = f.get('format_note', f.get('height', 'unknown'))
                        ext = f.get('ext', 'mp4')
                        format_id = f.get('format_id')

                        if quality not in seen:
                            formats.append({
                                'format_id': format_id,
                                'quality': quality,
                                'ext': ext,
                                'filesize': f.get('filesize', 0)
                            })
                            seen.add(quality)

            audio_formats = []
            if 'formats' in info:
                seen_audio = set()
                for f in info['formats']:
                    if f.get('acodec') != 'none' and f.get('vcodec') == 'none':
                        quality = f.get('abr', 'unknown')
                        ext = f.get('ext', 'mp3')
                        format_id = f.get('format_id')

                        format_label = f"{quality}kbps" if quality != 'unknown' else ext
                        if format_label not in seen_audio:
                            audio_formats.append({
                                'format_id': format_id,
                                'quality': format_label,
                                'ext': ext,
                                'filesize': f.get('filesize', 0)
                            })
                            seen_audio.add(format_label)

            return jsonify({
                'title': info.get('title', 'Unknown'),
                'thumbnail': info.get('thumbnail', ''),
                'duration': info.get('duration', 0),
                'uploader': info.get('uploader', 'Unknown'),
                'formats': formats[:10],
                'audio_formats': audio_formats[:5]
            })

    except Exception as e:
        error_message = str(e)
        if 'DRM' in error_message or 'drm' in error_message.lower():
            return jsonify({'error': '🔒 DRM Protection Detected: This content uses encryption that cannot be bypassed. DRM-protected platforms (Spotify Premium, Netflix, Disney+, Apple Music, etc.) are legally and technically protected. Try publicly accessible content from YouTube, Instagram, TikTok, SoundCloud, or similar platforms instead.'}), 400
        elif 'private' in error_message.lower() or 'login' in error_message.lower():
            return jsonify({'error': '🔐 Private Content: This content requires login or is private. Try public content instead.'}), 400
        elif 'geo' in error_message.lower() or 'location' in error_message.lower():
            return jsonify({'error': '🌍 Geo-Restricted: This content may be restricted in your region.'}), 400
        elif '404' in error_message or 'not found' in error_message.lower():
            return jsonify({'error': '❌ Content Not Found: The URL may be incorrect, the content may have been removed, or it may be private. Please check the URL and try again.'}), 404
        elif 'audiomack' in error_message.lower():
            return jsonify({'error': '🎵 Audiomack Error: Unable to access this track. The track may have been removed, is private, or the URL format has changed. Try a different Audiomack track or use the direct track URL.'}), 400
        return jsonify({'error': f'Error: {error_message}'}), 500

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
        output_template = os.path.join(app.config['DOWNLOAD_FOLDER'], f'{timestamp}_%(title)s.%(ext)s')

        ydl_opts = {
            'outtmpl': output_template,
            'quiet': True,
            'no_warnings': True,
            'nocheckcertificate': True,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
        }

        if download_type == 'audio':
            if format_id:
                ydl_opts['format'] = format_id
            else:
                ydl_opts['format'] = 'bestaudio/best'
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }]
        elif format_id:
            ydl_opts['format'] = format_id
        else:
            ydl_opts['format'] = 'best'

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)

            if download_type == 'audio':
                filename = filename.rsplit('.', 1)[0] + '.mp3'

            if os.path.exists(filename):
                original_basename = os.path.basename(filename)
                safe_basename = secure_filename(original_basename)

                if safe_basename != original_basename:
                    safe_path = os.path.join(app.config['DOWNLOAD_FOLDER'], safe_basename)
                    os.rename(filename, safe_path)
                    final_filename = safe_basename
                else:
                    final_filename = original_basename

                return jsonify({
                    'success': True,
                    'filename': final_filename,
                    'download_url': f'/download-file/{final_filename}'
                })
            else:
                return jsonify({'error': 'Download failed'}), 500

    except Exception as e:
        error_message = str(e)
        if 'DRM' in error_message or 'drm' in error_message.lower():
            return jsonify({'error': '🔒 DRM Protection Detected: This content uses encryption that cannot be bypassed. DRM-protected platforms (Spotify Premium, Netflix, Disney+, Apple Music, etc.) are legally and technically protected. Try publicly accessible content from YouTube, Instagram, TikTok, SoundCloud, or similar platforms instead.'}), 400
        elif 'private' in error_message.lower() or 'login' in error_message.lower():
            return jsonify({'error': '🔐 Private Content: This content requires login or is private. Try public content instead.'}), 400
        elif 'geo' in error_message.lower() or 'location' in error_message.lower():
            return jsonify({'error': '🌍 Geo-Restricted: This content may be restricted in your region.'}), 400
        elif '404' in error_message or 'not found' in error_message.lower():
            return jsonify({'error': '❌ Content Not Found: The URL may be incorrect, the content may have been removed, or it may be private. Please check the URL and try again.'}), 404
        elif 'audiomack' in error_message.lower():
            return jsonify({'error': '🎵 Audiomack Error: Unable to access this track. The track may have been removed, is private, or the URL format has changed. Try a different Audiomack track or use the direct track URL.'}), 400
        return jsonify({'error': f'Error: {error_message}'}), 500

@app.route('/download-file/<path:filename>')
def download_file(filename):
    try:
        safe_filename = secure_filename(filename)
        if not safe_filename:
            return "Invalid filename", 400

        file_path = os.path.join(app.config['DOWNLOAD_FOLDER'], safe_filename)
        if not os.path.exists(file_path):
            return "File not found", 404

        if not os.path.abspath(file_path).startswith(os.path.abspath(app.config['DOWNLOAD_FOLDER'])):
            return "Invalid file path", 400

        return send_from_directory(
            app.config['DOWNLOAD_FOLDER'],
            safe_filename,
            as_attachment=True
        )
    except FileNotFoundError:
        return "File not found", 404
    except Exception as e:
        return str(e), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)