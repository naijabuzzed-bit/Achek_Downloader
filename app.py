from flask import Flask, render_template, request, jsonify, send_file
import yt_dlp
import os
import time
import json
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
        return jsonify({'error': str(e)}), 500

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
        }
        
        if download_type == 'audio':
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
                return jsonify({
                    'success': True,
                    'filename': os.path.basename(filename),
                    'download_url': f'/download-file/{os.path.basename(filename)}'
                })
            else:
                return jsonify({'error': 'Download failed'}), 500
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/download-file/<filename>')
def download_file(filename):
    try:
        file_path = os.path.join(app.config['DOWNLOAD_FOLDER'], filename)
        if os.path.exists(file_path):
            return send_file(file_path, as_attachment=True)
        else:
            return "File not found", 404
    except Exception as e:
        return str(e), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
