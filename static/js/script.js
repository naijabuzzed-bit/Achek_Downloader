let currentUrl = '';
let mediaInfo = null;
let clickedOnce = false;

document.getElementById('downloadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const urlInput = document.getElementById('urlInput');
    const url = urlInput.value.trim();
    const quality = document.getElementById('quality').value;
    
    if (!url) {
        showError('Please enter a valid URL');
        return;
    }
    
    currentUrl = url;
    
    if (!clickedOnce) {
        await fetchMediaInfo(url);
        clickedOnce = true;
    } else {
        await startDownload(url, quality);
    }
});

async function fetchMediaInfo(url) {
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
            mediaInfo = data;
            displayMediaInfo(data);
            document.getElementById('downloadBtn').textContent = 'Download Now';
        } else {
            showError(data.error || 'Failed to fetch media information');
            clickedOnce = false;
        }
    } catch (error) {
        showError('Network error. Please check your connection and try again.');
        clickedOnce = false;
    } finally {
        hideLoading();
    }
}

async function startDownload(url, quality) {
    showDownloadProgress();
    hideError();
    hideDownloadResult();
    
    let formatId = null;
    let downloadType = 'video';
    
    if (quality === 'audio') {
        downloadType = 'audio';
    } else if (quality !== 'best' && mediaInfo && mediaInfo.formats) {
        const selectedFormat = mediaInfo.formats.find(f => {
            const height = f.quality;
            return height && height.toString().includes(quality.replace('p', ''));
        });
        if (selectedFormat) {
            formatId = selectedFormat.format_id;
        }
    }
    
    try {
        const response = await fetch('/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: url,
                format_id: formatId,
                type: downloadType
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showDownloadResult(data.download_url, data.filename);
            clickedOnce = false;
            document.getElementById('downloadBtn').textContent = 'Download';
        } else {
            showError(data.error || 'Download failed');
            clickedOnce = false;
            document.getElementById('downloadBtn').textContent = 'Download';
        }
    } catch (error) {
        showError('Download failed. Please try again.');
        clickedOnce = false;
        document.getElementById('downloadBtn').textContent = 'Download';
    } finally {
        hideDownloadProgress();
    }
}

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
            btn.addEventListener('click', () => downloadWithFormat(format.format_id, 'video'));
            videoFormats.appendChild(btn);
        });
    } else {
        const btn = document.createElement('button');
        btn.className = 'format-btn';
        btn.textContent = 'Download Best Quality';
        btn.dataset.type = 'video';
        btn.addEventListener('click', () => downloadWithFormat(null, 'video'));
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
            btn.addEventListener('click', () => downloadWithFormat(format.format_id, 'audio'));
            audioFormats.appendChild(btn);
        });
    } else {
        const btn = document.createElement('button');
        btn.className = 'format-btn';
        btn.textContent = 'Download as MP3';
        btn.dataset.type = 'audio';
        btn.addEventListener('click', () => downloadWithFormat(null, 'audio'));
        audioFormats.appendChild(btn);
    }
    
    showMediaInfo();
}

async function downloadWithFormat(formatId, type) {
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
