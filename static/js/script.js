let currentUrl = '';

document.getElementById('downloadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const urlInput = document.getElementById('urlInput');
    const url = urlInput.value.trim();
    
    if (!url) {
        showError('Please enter a valid URL');
        return;
    }
    
    currentUrl = url;
    
    showLoading();
    hideError();
    hideMediaInfo();
    hideDownloadResult();
    
    try {
        const response = await fetch('/get-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: url })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayMediaInfo(data);
        } else {
            showError(data.error || 'Failed to fetch media information');
        }
    } catch (error) {
        showError('Network error. Please check your connection and try again.');
    } finally {
        hideLoading();
    }
});

function displayMediaInfo(info) {
    document.getElementById('thumbnail').src = info.thumbnail;
    document.getElementById('mediaTitle').textContent = info.title;
    document.getElementById('uploader').textContent = 'Uploader: ' + info.uploader;
    document.getElementById('duration').textContent = 'Duration: ' + formatDuration(info.duration);
    
    const videoFormats = document.getElementById('videoFormats');
    videoFormats.innerHTML = '';
    
    if (info.formats && info.formats.length > 0) {
        info.formats.forEach(format => {
            const btn = document.createElement('button');
            btn.className = 'format-btn';
            btn.textContent = `${format.quality} (${format.ext})`;
            btn.dataset.formatId = format.format_id;
            btn.dataset.type = 'video';
            btn.addEventListener('click', () => downloadMedia(format.format_id, 'video'));
            videoFormats.appendChild(btn);
        });
    } else {
        const btn = document.createElement('button');
        btn.className = 'format-btn';
        btn.textContent = 'Download Best Quality';
        btn.dataset.type = 'video';
        btn.addEventListener('click', () => downloadMedia(null, 'video'));
        videoFormats.appendChild(btn);
    }
    
    const audioFormats = document.getElementById('audioFormats');
    audioFormats.innerHTML = '';
    
    if (info.audio_formats && info.audio_formats.length > 0) {
        info.audio_formats.forEach(format => {
            const btn = document.createElement('button');
            btn.className = 'format-btn';
            btn.textContent = `${format.quality} (${format.ext})`;
            btn.dataset.formatId = format.format_id;
            btn.dataset.type = 'audio';
            btn.addEventListener('click', () => downloadMedia(format.format_id, 'audio'));
            audioFormats.appendChild(btn);
        });
    } else {
        const btn = document.createElement('button');
        btn.className = 'format-btn';
        btn.textContent = 'Download as MP3';
        btn.dataset.type = 'audio';
        btn.addEventListener('click', () => downloadMedia(null, 'audio'));
        audioFormats.appendChild(btn);
    }
    
    showMediaInfo();
}

async function downloadMedia(formatId, type) {
    showDownloadProgress();
    hideError();
    hideDownloadResult();
    
    try {
        const response = await fetch('/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: currentUrl,
                format_id: formatId,
                type: type
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showDownloadResult(data.download_url, data.filename);
        } else {
            showError(data.error || 'Download failed');
        }
    } catch (error) {
        showError('Download failed. Please try again.');
    } finally {
        hideDownloadProgress();
    }
}

function formatDuration(seconds) {
    if (!seconds) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function showLoading() {
    document.getElementById('loadingIndicator').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loadingIndicator').style.display = 'none';
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

function showMediaInfo() {
    document.getElementById('mediaInfo').style.display = 'block';
}

function hideMediaInfo() {
    document.getElementById('mediaInfo').style.display = 'none';
}

function showDownloadProgress() {
    document.getElementById('downloadProgress').style.display = 'block';
}

function hideDownloadProgress() {
    document.getElementById('downloadProgress').style.display = 'none';
}

function showDownloadResult(downloadUrl, filename) {
    const downloadLink = document.getElementById('downloadLink');
    downloadLink.href = downloadUrl;
    downloadLink.download = filename;
    document.getElementById('downloadResult').style.display = 'block';
}

function hideDownloadResult() {
    document.getElementById('downloadResult').style.display = 'none';
}
