// Modern Media Downloader - Enhanced JavaScript by Achek Digital Solutions

let currentUrl = '';
let mediaInfo = null;

// Form submission handler
document.getElementById('downloadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const urlInput = document.getElementById('urlInput');
    const url = urlInput.value.trim();
    
    if (!url) {
        showError('Please enter a valid URL');
        return;
    }
    
    if (!isValidUrl(url)) {
        showError('Please enter a valid URL format (must start with http:// or https://)');
        return;
    }
    
    currentUrl = url;
    await fetchMediaInfo(url);
});

// URL validation
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// Fetch media information
async function fetchMediaInfo(url) {
    showLoading();
    hideError();
    hideMediaInfo();
    hideDownloadResult();
    
    try {
        const response = await fetch('/fetch_info', {
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
            showError(data.error || 'Failed to fetch media information. Please check the URL and try again.');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showError('Network error. Please check your internet connection and try again.');
    } finally {
        hideLoading();
    }
}

// Display media information
function displayMediaInfo(info) {
    // Set media details
    document.getElementById('thumbnail').src = info.thumbnail;
    document.getElementById('thumbnail').alt = info.title;
    document.getElementById('mediaTitle').textContent = info.title;
    document.getElementById('uploader').textContent = 'Uploader: ' + info.uploader;
    document.getElementById('duration').textContent = 'Duration: ' + formatDuration(info.duration);
    
    // Display video formats
    const videoFormats = document.getElementById('videoFormats');
    videoFormats.innerHTML = '';
    
    if (info.video_formats && info.video_formats.length > 0) {
        info.video_formats.forEach(format => {
            const btn = createFormatButton(format, 'video');
            videoFormats.appendChild(btn);
        });
    } else {
        const btn = createDefaultButton('video');
        videoFormats.appendChild(btn);
    }
    
    // Display audio formats
    const audioFormats = document.getElementById('audioFormats');
    audioFormats.innerHTML = '';
    
    if (info.audio_formats && info.audio_formats.length > 0) {
        info.audio_formats.forEach(format => {
            const btn = createFormatButton(format, 'audio');
            audioFormats.appendChild(btn);
        });
    } else {
        const btn = createDefaultButton('audio');
        audioFormats.appendChild(btn);
    }
    
    showMediaInfo();
}

// Create format button
function createFormatButton(format, type) {
    const btn = document.createElement('button');
    btn.className = 'format-btn';
    btn.type = 'button';
    
    let displayText = `${format.quality}`;
    if (format.ext) {
        displayText += ` (${format.ext})`;
    }
    if (format.filesize && format.filesize !== 'Unknown') {
        displayText += ` - ${format.filesize}MB`;
    }
    
    btn.textContent = displayText;
    btn.dataset.formatId = format.format_id;
    btn.dataset.type = type;
    btn.dataset.clicked = 'false';
    btn.addEventListener('click', () => handleFormatDownload(btn, format.format_id, type));
    
    return btn;
}

// Create default button
function createDefaultButton(type) {
    const btn = document.createElement('button');
    btn.className = 'format-btn';
    btn.type = 'button';
    btn.textContent = type === 'audio' ? 'Download as MP3 (Best Quality)' : 'Download Best Quality';
    btn.dataset.type = type;
    btn.dataset.clicked = 'false';
    btn.addEventListener('click', () => handleFormatDownload(btn, null, type));
    
    return btn;
}

// Handle format download with confirmation
async function handleFormatDownload(button, formatId, type) {
    // First click - ask for confirmation
    if (button.dataset.clicked === 'false') {
        button.dataset.clicked = 'true';
        button.textContent = '✓ Click again to confirm download';
        button.style.background = 'linear-gradient(135deg, #F59E0B, #D97706)';
        button.style.color = 'white';
        button.style.borderColor = '#F59E0B';
        button.style.transform = 'scale(1.05)';
        button.style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.4)';
        
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 200);
        
        // Reset after 5 seconds if not confirmed
        setTimeout(() => {
            if (button.dataset.clicked === 'true') {
                resetButton(button);
            }
        }, 5000);
        
        return;
    }
    
    // Second click - proceed with download
    button.style.pointerEvents = 'none';
    button.innerHTML = '<span>⏳</span> Downloading...';
    
    await downloadWithFormat(formatId, type);
    
    resetAllFormatButtons();
    
    button.style.pointerEvents = '';
}

// Reset single button
function resetButton(btn) {
    btn.dataset.clicked = 'false';
    btn.style.background = '';
    btn.style.color = '';
    btn.style.borderColor = '';
    btn.style.transform = '';
    btn.style.boxShadow = '';
    
    const formatId = btn.dataset.formatId;
    const type = btn.dataset.type;
    
    if (formatId && mediaInfo) {
        const formats = type === 'audio' ? mediaInfo.audio_formats : mediaInfo.video_formats;
        const format = formats?.find(f => f.format_id === formatId);
        if (format) {
            let displayText = `${format.quality}`;
            if (format.ext) {
                displayText += ` (${format.ext})`;
            }
            if (format.filesize && format.filesize !== 'Unknown') {
                displayText += ` - ${format.filesize}MB`;
            }
            btn.textContent = displayText;
        }
    } else {
        btn.textContent = type === 'audio' ? 'Download as MP3 (Best Quality)' : 'Download Best Quality';
    }
}

// Reset all format buttons
function resetAllFormatButtons() {
    const allButtons = document.querySelectorAll('.format-btn');
    allButtons.forEach(btn => resetButton(btn));
}

// Download with specified format
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
            showDownloadResult(data.download_url);
        } else {
            showError(data.error || 'Download failed. Please try again or select a different format.');
        }
    } catch (error) {
        console.error('Download error:', error);
        showError('Download failed. Please check your connection and try again.');
    } finally {
        hideDownloadProgress();
    }
}

// Format duration helper
function formatDuration(duration) {
    if (!duration || duration === 'Unknown') return 'Unknown';
    
    // If duration is a string like "3:45", return it as is
    if (typeof duration === 'string' && duration.includes(':')) {
        return duration;
    }
    
    // If duration is in seconds
    const seconds = parseInt(duration);
    if (isNaN(seconds)) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Smooth fade in animation
function fadeIn(element) {
    element.style.opacity = '0';
    element.style.display = 'block';
    element.style.transition = 'opacity 0.4s ease-in-out';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            element.style.opacity = '1';
        });
    });
}

// Smooth fade out animation
function fadeOut(element, callback) {
    element.style.transition = 'opacity 0.3s ease-in-out';
    element.style.opacity = '0';
    setTimeout(() => {
        element.style.display = 'none';
        if (callback) callback();
    }, 300);
}

// UI state management functions
function showLoading() {
    const loadingEl = document.getElementById('loadingIndicator');
    if (loadingEl) fadeIn(loadingEl);
}

function hideLoading() {
    const loadingEl = document.getElementById('loadingIndicator');
    if (loadingEl) fadeOut(loadingEl);
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    if (!errorEl) return;
    
    errorEl.textContent = '⚠️ ' + message;
    fadeIn(errorEl);
    
    setTimeout(() => {
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

function hideError() {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) fadeOut(errorEl);
}

function showMediaInfo() {
    const mediaInfoEl = document.getElementById('mediaInfo');
    if (!mediaInfoEl) return;
    
    fadeIn(mediaInfoEl);
    
    setTimeout(() => {
        mediaInfoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
}

function hideMediaInfo() {
    const mediaInfoEl = document.getElementById('mediaInfo');
    if (mediaInfoEl) fadeOut(mediaInfoEl);
}

function showDownloadProgress() {
    const progressEl = document.getElementById('downloadProgress');
    if (progressEl) fadeIn(progressEl);
}

function hideDownloadProgress() {
    const progressEl = document.getElementById('downloadProgress');
    if (progressEl) fadeOut(progressEl);
}

function showDownloadResult(downloadUrl) {
    const downloadLink = document.getElementById('downloadLink');
    if (!downloadLink) return;
    
    downloadLink.href = downloadUrl;
    
    const resultEl = document.getElementById('downloadResult');
    if (!resultEl) return;
    
    fadeIn(resultEl);
    
    setTimeout(() => {
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
}

function hideDownloadResult() {
    const resultEl = document.getElementById('downloadResult');
    if (resultEl) fadeOut(resultEl);
}

// Smooth scroll to top when new search is made
document.getElementById('urlInput').addEventListener('focus', () => {
    if (window.scrollY > 200) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

console.log('Media Downloader by Achek Digital Solutions - Ready!');
