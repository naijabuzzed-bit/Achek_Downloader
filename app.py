from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
import yt_dlp
import os
import time
import uuid
from threading import Thread

app = Flask(__name__)

# Configuration
DOWNLOAD_FOLDER = 'static/downloads'
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

# Global dictionary to store download progress
download_progress = {}

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
    return send_from_directory('.', 'sw.js', mimetype='application/javascript')

@app.route('/fetch_info', methods=['POST'])
def fetch_info():
    url = ''
    ydl_opts = {}
    try:
        data = request.get_json()
        url = data.get('url')

        if not url:
            return jsonify({'error': 'URL is required'}), 400

        # Enhanced options for Instagram and other platforms
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'socket_timeout': 30,
            'retries': 5,
            'geo_bypass': True,
            'geo_bypass_country': 'US',
            'age_limit': None,
            'nocheckcertificate': True,
            'source_address': '0.0.0.0',
            'force_ipv4': True,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0',
            },
            'extractor_args': {
                'instagram': {
                    'include_stories': True,
                    'include_highlights': True,
                },
                'twitter': {
                    'api': 'syndication',
                },
                'tiktok': {
                    'api': 'mobile_app',
                },
                'youtube': {
                    'player_client': ['android', 'web'],
                    'skip': ['hls', 'dash'],
                },
            },
            'force_generic_extractor': False,
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
                    # Video formats (has video and optionally audio)
                    if f.get('vcodec') != 'none':
                        quality = f.get('format_note', f.get('quality', 'Unknown'))
                        height = f.get('height', 0)
                        ext = f.get('ext', 'mp4')
                        filesize = f.get('filesize', 0) or f.get('filesize_approx', 0)
                        filesize_mb = round(filesize / (1024 * 1024), 2) if filesize else 'Unknown'

                        video_formats.append({
                            'format_id': f.get('format_id'),
                            'quality': f"{height}p" if height else quality,
                            'ext': ext,
                            'filesize': filesize_mb
                        })

                    # Audio-only formats
                    elif f.get('acodec') != 'none' and f.get('vcodec') == 'none':
                        abr = f.get('abr', 0)
                        ext = f.get('ext', 'mp3')
                        filesize = f.get('filesize', 0) or f.get('filesize_approx', 0)
                        filesize_mb = round(filesize / (1024 * 1024), 2) if filesize else 'Unknown'

                        audio_formats.append({
                            'format_id': f.get('format_id'),
                            'quality': f"{int(abr)}kbps" if abr else 'Audio',
                            'ext': ext,
                            'filesize': filesize_mb
                        })

                # Remove duplicates and sort
                video_formats = list({v['format_id']: v for v in video_formats}.values())
                audio_formats = list({a['format_id']: a for a in audio_formats}.values())

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
        print(f"Download Error: {error_msg}")
        
        # Check if it's Instagram and try alternative extraction
        if url and 'instagram.com' in url.lower():
            try:
                # Try with more aggressive options for Instagram
                alt_opts = ydl_opts.copy()
                alt_opts['extractor_args']['instagram'] = {
                    'include_stories': True,
                    'include_highlights': True,
                }
                alt_opts['format'] = 'best'
                
                with yt_dlp.YoutubeDL(alt_opts) as ydl_alt:
                    info = ydl_alt.extract_info(url, download=False)
                    if info:
                        # Process the info as normal
                        video_formats = []
                        audio_formats = []

                        if 'formats' in info and info['formats']:
                            for f in info['formats']:
                                if f.get('vcodec') != 'none':
                                    quality = f.get('format_note', f.get('quality', 'Unknown'))
                                    height = f.get('height', 0)
                                    ext = f.get('ext', 'mp4')
                                    filesize = f.get('filesize', 0) or f.get('filesize_approx', 0)
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
                                    filesize = f.get('filesize', 0) or f.get('filesize_approx', 0)
                                    filesize_mb = round(filesize / (1024 * 1024), 2) if filesize else 'Unknown'

                                    audio_formats.append({
                                        'format_id': f.get('format_id'),
                                        'quality': f"{int(abr)}kbps" if abr else 'Audio',
                                        'ext': ext,
                                        'filesize': filesize_mb
                                    })

                        video_formats = list({v['format_id']: v for v in video_formats}.values())
                        audio_formats = list({a['format_id']: a for a in audio_formats}.values())

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
            except Exception as alt_error:
                print(f"Alternative extraction failed: {alt_error}")
        
        # Handle specific errors
        if 'DRM' in error_msg or 'protected' in error_msg.lower():
            return jsonify({'error': 'This content is DRM-protected and cannot be downloaded.'}), 400
        elif '429' in error_msg or 'Too Many Requests' in error_msg:
            return jsonify({'error': 'Rate limit reached. Please wait 2-3 minutes and try again.'}), 400
        elif 'no video in this post' in error_msg.lower():
            return jsonify({'error': 'This post contains only images. Try a video post or reel instead.'}), 400
        elif 'geo' in error_msg.lower() or 'not available' in error_msg.lower() or 'region' in error_msg.lower():
            return jsonify({'error': 'Content temporarily unavailable. Instagram may be blocking automated requests. Try again in a few minutes or use a different post.'}), 400
        elif 'private' in error_msg.lower():
            return jsonify({'error': 'This content is private. Make sure the account/post is public.'}), 400
        elif 'login' in error_msg.lower() or 'sign in' in error_msg.lower():
            return jsonify({'error': 'Login required. Only public content can be downloaded.'}), 400
        else:
            return jsonify({'error': f'Unable to fetch media. Instagram may be blocking requests. Wait 2-3 minutes and try again, or try a different post.'}), 400
    except Exception as e:
        error_message = str(e)
        print(f"ERROR: {error_message}")
        
        # Provide more helpful, user-friendly error messages
        if 'twitter' in error_message.lower() or (url and 'x.com' in url.lower()):
            if 'no video' in error_message.lower():
                error_message = "😕 This tweet doesn't have a video. We can only download tweets that contain videos."
            else:
                error_message = "❌ Couldn't access this Twitter/X content. Make sure the tweet is public and contains media."
        elif 'instagram' in error_message.lower():
            error_message = "⚠️ Instagram temporarily blocked this request. Please wait 2-3 minutes and try again. Make sure you're using a public post or reel link."
        elif 'audiomack' in error_message.lower():
            error_message = "🎵 Couldn't find this Audiomack song. Please check the link and make sure the song is publicly available."
        elif 'tiktok' in error_message.lower():
            error_message = "📱 TikTok download failed. Make sure the video is public and the link is correct."
        elif 'facebook' in error_message.lower():
            error_message = "📘 Facebook content couldn't be accessed. Only public videos can be downloaded."
        elif 'youtube' in error_message.lower():
            if 'private' in error_message.lower():
                error_message = "🔒 This YouTube video is private or unavailable."
            elif 'age' in error_message.lower():
                error_message = "🔞 Age-restricted YouTube content cannot be downloaded without login."
            else:
                error_message = "🎬 YouTube download failed. The video might be region-locked or removed."
        elif 'unsupported' in error_message.lower():
            error_message = "❓ This website is not supported yet. We support YouTube, Instagram, TikTok, Facebook, Audiomack, and 1000+ other platforms."
        elif 'url' in error_message.lower() or 'invalid' in error_message.lower():
            error_message = "🔗 Invalid link format. Please copy and paste the full URL from your browser."
        else:
            error_message = f"⚠️ Something went wrong: {error_message}. Please try again or use a different link."

        return jsonify({'error': error_message}), 400


def progress_hook(d, download_id):
    """Hook function to track download progress"""
    if d['status'] == 'downloading':
        # Calculate progress percentage
        if 'total_bytes' in d or 'total_bytes_estimate' in d:
            total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
            downloaded = d.get('downloaded_bytes', 0)
            
            if total > 0:
                percentage = int((downloaded / total) * 100)
            else:
                percentage = 0
            
            # Calculate speed and ETA
            speed = d.get('speed', 0)
            eta = d.get('eta', 0)
            
            download_progress[download_id] = {
                'status': 'downloading',
                'percentage': percentage,
                'downloaded': downloaded,
                'total': total,
                'speed': speed if speed else 0,
                'eta': eta if eta else 0
            }
        else:
            download_progress[download_id] = {
                'status': 'downloading',
                'percentage': 0,
                'message': 'Starting download...'
            }
    elif d['status'] == 'finished':
        download_progress[download_id] = {
            'status': 'processing',
            'percentage': 100,
            'message': 'Processing file...'
        }

@app.route('/progress/<download_id>')
def get_progress(download_id):
    """Endpoint to check download progress"""
    progress = download_progress.get(download_id, {'status': 'not_found', 'percentage': 0})
    return jsonify(progress)

@app.route('/start_download', methods=['POST'])
def start_download():
    """Initialize download and return download_id for progress tracking"""
    try:
        data = request.get_json()
        url = data.get('url')
        format_id = data.get('format_id')
        download_type = data.get('type', 'video')

        if not url:
            return jsonify({'error': 'URL is required'}), 400

        # Generate unique download ID
        download_id = str(uuid.uuid4())
        timestamp = int(time.time())
        
        # Initialize progress
        download_progress[download_id] = {
            'status': 'starting',
            'percentage': 0,
            'message': 'Initializing download...',
            'timestamp': timestamp,
            'type': download_type
        }
        
        # Return download_id immediately so client can start polling
        return jsonify({
            'success': True,
            'download_id': download_id
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to start download: {str(e)}'}), 500

@app.route('/download', methods=['POST'])
def download():
    download_id = None
    try:
        data = request.get_json()
        url = data.get('url')
        format_id = data.get('format_id')
        download_type = data.get('type', 'video')
        download_id = data.get('download_id')

        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        if not download_id:
            return jsonify({'error': 'Download ID is required'}), 400

        timestamp = int(time.time())
        
        # Update progress status
        if download_id in download_progress:
            download_progress[download_id]['status'] = 'downloading'
            download_progress[download_id]['message'] = 'Starting download...'

        if download_type == 'audio':
            output_template = os.path.join(DOWNLOAD_FOLDER, f'audio_{timestamp}.%(ext)s')
            audio_format = format_id if format_id else 'bestaudio/best'
            ydl_opts = {
                'format': audio_format,
                'outtmpl': output_template,
                'quiet': True,
                'no_warnings': True,
                'progress_hooks': [lambda d: progress_hook(d, download_id)],
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '320',
                }],
                'socket_timeout': 30,
                'retries': 5,
                'geo_bypass': True,
                'nocheckcertificate': True,
                'source_address': '0.0.0.0',
                'force_ipv4': True,
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                'extractor_args': {
                    'youtube': {
                        'player_client': ['android', 'web'],
                        'skip': ['hls', 'dash'],
                    },
                },
            }
        else:
            output_template = os.path.join(DOWNLOAD_FOLDER, f'video_{timestamp}.%(ext)s')
            video_format = format_id if format_id else 'bestvideo+bestaudio/best'
            ydl_opts = {
                'format': video_format,
                'outtmpl': output_template,
                'quiet': True,
                'no_warnings': True,
                'merge_output_format': 'mp4',
                'progress_hooks': [lambda d: progress_hook(d, download_id)],
                'socket_timeout': 30,
                'retries': 5,
                'geo_bypass': True,
                'nocheckcertificate': True,
                'source_address': '0.0.0.0',
                'force_ipv4': True,
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                'extractor_args': {
                    'youtube': {
                        'player_client': ['android', 'web'],
                        'skip': ['hls', 'dash'],
                    },
                },
            }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        downloaded_files = [f for f in os.listdir(DOWNLOAD_FOLDER) if f.startswith(f'{download_type}_{timestamp}')]

        if not downloaded_files:
            if download_id in download_progress:
                download_progress[download_id] = {'status': 'error', 'percentage': 0, 'message': 'No file was created'}
                # Schedule cleanup for this error case too
                def cleanup_no_file():
                    time.sleep(10)
                    download_progress.pop(download_id, None)
                Thread(target=cleanup_no_file, daemon=True).start()
            return jsonify({'error': 'Download failed - no file was created'}), 500

        download_filename = downloaded_files[0]
        download_url = f'/static/downloads/{download_filename}'
        
        # Mark as complete and schedule cleanup
        if download_id in download_progress:
            download_progress[download_id] = {
                'status': 'complete',
                'percentage': 100,
                'message': 'Download complete!'
            }
        
        # Schedule cleanup after 10 seconds
        def cleanup():
            time.sleep(10)
            download_progress.pop(download_id, None)
        Thread(target=cleanup, daemon=True).start()

        return jsonify({
            'success': True,
            'download_url': download_url
        })

    except Exception as e:
        if download_id and download_id in download_progress:
            download_progress[download_id] = {'status': 'error', 'percentage': 0, 'message': str(e)}
            # Schedule cleanup for errored downloads too
            def cleanup_error():
                time.sleep(10)
                download_progress.pop(download_id, None)
            Thread(target=cleanup_error, daemon=True).start()
        return jsonify({'error': f'Download failed: {str(e)}'}), 500

if __name__ == '__main__':
    # For local development
    app.run(host='0.0.0.0', port=5000, debug=False)

# For production WSGI server (required by shared hosting)
# The 'app' object is what the server will use