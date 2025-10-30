
let currentUrl = '';
let mediaInfo = null;

document.getElementById('downloadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const urlInput = document.getElementById('urlInput');
    const url = urlInput.value.trim();
    
    if (!url) {
        showError('Please enter a valid URL');
        return;
    }
    
    currentUrl = url;
    await fetchMediaInfo(url);
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
        } else {
            showError(data.error || 'Failed to fetch media information');
        }
    } catch (error) {
        showError('Network error. Please check your connection and try again.');
    } finally {
        hideLoading();
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
            btn.dataset.clicked = 'false';
            btn.addEventListener('click', () => handleFormatDownload(btn, format.format_id, 'video'));
            videoFormats.appendChild(btn);
        });
    } else {
        const btn = document.createElement('button');
        btn.className = 'format-btn';
        btn.textContent = 'Download Best Quality';
        btn.dataset.type = 'video';
        btn.dataset.clicked = 'false';
        btn.addEventListener('click', () => handleFormatDownload(btn, null, 'video'));
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
            btn.dataset.clicked = 'false';
            btn.addEventListener('click', () => handleFormatDownload(btn, format.format_id, 'audio'));
            audioFormats.appendChild(btn);
        });
    } else {
        const btn = document.createElement('button');
        btn.className = 'format-btn';
        btn.textContent = 'Download as MP3';
        btn.dataset.type = 'audio';
        btn.dataset.clicked = 'false';
        btn.addEventListener('click', () => handleFormatDownload(btn, null, 'audio'));
        audioFormats.appendChild(btn);
    }
    
    showMediaInfo();
}

async function handleFormatDownload(button, formatId, type) {
    if (button.dataset.clicked === 'false') {
        button.dataset.clicked = 'true';
        button.textContent = '✓ Click again to confirm';
        button.style.background = 'linear-gradient(135deg, #ffc107 0%, #ffb300 100%)';
        button.style.color = '#000';
        button.style.borderColor = '#ffc107';
        button.style.transform = 'scale(1.05)';
        button.style.boxShadow = '0 4px 15px rgba(255, 193, 7, 0.4)';
        
        button.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 200);
        
        return;
    }
    
    button.style.pointerEvents = 'none';
    button.innerHTML = '<span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span> Downloading...';
    
    await downloadWithFormat(formatId, type);
    
    resetAllFormatButtons();
    
    button.style.pointerEvents = '';
}

function resetAllFormatButtons() {
    const allButtons = document.querySelectorAll('.format-btn');
    allButtons.forEach(btn => {
        btn.dataset.clicked = 'false';
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
        
        // Restore original text
        const formatId = btn.dataset.formatId;
        const type = btn.dataset.type;
        
        if (formatId) {
            // Find original format text
            if (mediaInfo) {
                const formats = type === 'audio' ? mediaInfo.audio_formats : mediaInfo.formats;
                const format = formats?.find(f => f.format_id === formatId);
                if (format) {
                    btn.textContent = `${format.quality} (${format.ext})`;
                }
            }
        } else {
            btn.textContent = type === 'audio' ? 'Download as MP3' : 'Download Best Quality';
        }
    });
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

function fadeIn(element) {
    element.style.opacity = '0';
    element.style.display = 'block';
    element.style.transition = 'opacity 0.4s ease-in-out';
    setTimeout(() => {
        element.style.opacity = '1';
    }, 10);
}

function fadeOut(element, callback) {
    element.style.transition = 'opacity 0.3s ease-in-out';
    element.style.opacity = '0';
    setTimeout(() => {
        element.style.display = 'none';
        if (callback) callback();
    }, 300);
}

function showLoading() {
    const loadingEl = document.getElementById('loadingIndicator');
    fadeIn(loadingEl);
}

function hideLoading() {
    const loadingEl = document.getElementById('loadingIndicator');
    fadeOut(loadingEl);
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    fadeIn(errorEl);
    
    setTimeout(() => {
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

function hideError() {
    const errorEl = document.getElementById('errorMessage');
    fadeOut(errorEl);
}

function showMediaInfo() {
    const mediaInfoEl = document.getElementById('mediaInfo');
    fadeIn(mediaInfoEl);
    
    setTimeout(() => {
        mediaInfoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
}

function hideMediaInfo() {
    const mediaInfoEl = document.getElementById('mediaInfo');
    fadeOut(mediaInfoEl);
}

function showDownloadProgress() {
    const progressEl = document.getElementById('downloadProgress');
    fadeIn(progressEl);
}

function hideDownloadProgress() {
    const progressEl = document.getElementById('downloadProgress');
    fadeOut(progressEl);
}

function showDownloadResult(downloadUrl, filename) {
    const downloadLink = document.getElementById('downloadLink');
    downloadLink.href = downloadUrl;
    downloadLink.download = filename;
    
    const resultEl = document.getElementById('downloadResult');
    fadeIn(resultEl);
    
    setTimeout(() => {
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
}

function hideDownloadResult() {
    const resultEl = document.getElementById('downloadResult');
    fadeOut(resultEl);
}
