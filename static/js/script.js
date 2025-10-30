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
    
    // Add best quality option first
    const bestVideoBtn = document.createElement('button');
    bestVideoBtn.className = 'format-btn best-quality';
    bestVideoBtn.type = 'button';
    bestVideoBtn.innerHTML = '<i class="fas fa-star"></i> Best Quality Available';
    bestVideoBtn.dataset.formatId = 'best';
    bestVideoBtn.dataset.type = 'video';
    bestVideoBtn.addEventListener('click', () => handleFormatDownload(bestVideoBtn, 'best', 'video'));
    videoFormats.appendChild(bestVideoBtn);
    
    // Add standard quality options
    const standardQualities = [
        { id: 'bestvideo[height<=2160]+bestaudio/best', label: '4K (2160p)', icon: 'crown' },
        { id: 'bestvideo[height<=1440]+bestaudio/best', label: '2K (1440p)', icon: 'gem' },
        { id: 'bestvideo[height<=1080]+bestaudio/best', label: 'Full HD (1080p)', icon: 'video' },
        { id: 'bestvideo[height<=720]+bestaudio/best', label: 'HD (720p)', icon: 'video' },
        { id: 'bestvideo[height<=480]+bestaudio/best', label: 'SD (480p)', icon: 'video' },
        { id: 'bestvideo[height<=360]+bestaudio/best', label: 'Low (360p)', icon: 'video' }
    ];
    
    standardQualities.forEach(quality => {
        const btn = document.createElement('button');
        btn.className = 'format-btn';
        btn.type = 'button';
        btn.innerHTML = `<i class="fas fa-${quality.icon}"></i> ${quality.label}`;
        btn.dataset.formatId = quality.id;
        btn.dataset.type = 'video';
        btn.addEventListener('click', () => handleFormatDownload(btn, quality.id, 'video'));
        videoFormats.appendChild(btn);
    });
    
    if (info.video_formats && info.video_formats.length > 0) {
        info.video_formats.forEach(format => {
            const btn = createFormatButton(format, 'video');
            videoFormats.appendChild(btn);
        });
    }
    
    // Display audio formats
    const audioFormats = document.getElementById('audioFormats');
    audioFormats.innerHTML = '';
    
    // Add best audio quality option first
    const bestAudioBtn = document.createElement('button');
    bestAudioBtn.className = 'format-btn best-quality';
    bestAudioBtn.type = 'button';
    bestAudioBtn.innerHTML = '<i class="fas fa-star"></i> Best Quality MP3 (320kbps)';
    bestAudioBtn.dataset.formatId = 'bestaudio';
    bestAudioBtn.dataset.type = 'audio';
    bestAudioBtn.addEventListener('click', () => handleFormatDownload(bestAudioBtn, 'bestaudio', 'audio'));
    audioFormats.appendChild(bestAudioBtn);
    
    // Add standard audio quality options
    const standardAudioQualities = [
        { id: 'bestaudio[abr<=320]', label: 'High Quality (320kbps)', icon: 'music' },
        { id: 'bestaudio[abr<=256]', label: 'Very Good (256kbps)', icon: 'music' },
        { id: 'bestaudio[abr<=192]', label: 'Good (192kbps)', icon: 'music' },
        { id: 'bestaudio[abr<=128]', label: 'Medium (128kbps)', icon: 'music' },
        { id: 'bestaudio[abr<=96]', label: 'Low (96kbps)', icon: 'music' }
    ];
    
    standardAudioQualities.forEach(quality => {
        const btn = document.createElement('button');
        btn.className = 'format-btn';
        btn.type = 'button';
        btn.innerHTML = `<i class="fas fa-${quality.icon}"></i> ${quality.label}`;
        btn.dataset.formatId = quality.id;
        btn.dataset.type = 'audio';
        btn.addEventListener('click', () => handleFormatDownload(btn, quality.id, 'audio'));
        audioFormats.appendChild(btn);
    });
    
    if (info.audio_formats && info.audio_formats.length > 0) {
        info.audio_formats.forEach(format => {
            const btn = createFormatButton(format, 'audio');
            audioFormats.appendChild(btn);
        });
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

// Handle format download - immediate download
async function handleFormatDownload(button, formatId, type) {
    // Disable button and show loading
    button.disabled = true;
    button.style.pointerEvents = 'none';
    const originalText = button.innerHTML;
    button.innerHTML = '<span>⏳</span> Downloading...';
    button.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
    button.style.color = 'white';
    
    try {
        await downloadWithFormat(formatId, type);
    } catch (error) {
        button.innerHTML = originalText;
        button.style.background = '';
        button.style.color = '';
        button.dataset.adTriggered = 'false';
    } finally {
        button.disabled = false;
        button.style.pointerEvents = '';
    }
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
    // Removed auto-scroll to prevent unwanted page jumps
}

function hideError() {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) fadeOut(errorEl);
}

function showMediaInfo() {
    const mediaInfoEl = document.getElementById('mediaInfo');
    if (!mediaInfoEl) return;
    
    fadeIn(mediaInfoEl);
    // Removed auto-scroll to prevent unwanted page jumps
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
    // Removed auto-scroll to prevent unwanted page jumps
}

function hideDownloadResult() {
    const resultEl = document.getElementById('downloadResult');
    if (resultEl) fadeOut(resultEl);
}

// Ad function removed - no redirects anywhere on the page
function triggerAdOnDownload() {
    // Ads disabled to prevent unwanted redirects
    console.log('Ads disabled for better user experience');
}

console.log('Media Downloader by Achek Digital Solutions - Ready!');
