// Modern Media Downloader - Enhanced JavaScript by Achek Digital Solutions

let currentUrl = '';
let mediaInfo = null;

// Dark Mode Toggle
const themeToggle = document.getElementById('themeToggle');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    // Default to light mode - only use dark if explicitly saved as 'dark'
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

themeToggle.addEventListener('click', toggleTheme);
loadTheme();

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

// Display media information - Dynamic & Professional
function displayMediaInfo(info) {
    // Set media details
    document.getElementById('thumbnail').src = info.thumbnail;
    document.getElementById('thumbnail').alt = info.title;
    document.getElementById('mediaTitle').textContent = info.title;
    document.getElementById('uploader').textContent = 'Uploader: ' + info.uploader;
    document.getElementById('duration').textContent = 'Duration: ' + formatDuration(info.duration);
    
    // Display video formats - DYNAMIC
    const videoFormats = document.getElementById('videoFormats');
    videoFormats.innerHTML = '';
    
    // Intelligently detect available qualities from backend
    const availableQualities = new Set();
    if (info.video_formats && info.video_formats.length > 0) {
        info.video_formats.forEach(format => {
            const quality = format.quality || '';
            if (quality.includes('2160') || quality.includes('4K')) availableQualities.add('4K');
            if (quality.includes('1440') || quality.includes('2K')) availableQualities.add('2K');
            if (quality.includes('1080')) availableQualities.add('1080p');
            if (quality.includes('720')) availableQualities.add('720p');
            if (quality.includes('480')) availableQualities.add('480p');
            if (quality.includes('360')) availableQualities.add('360p');
        });
    }
    
    // Best quality button - always show
    const bestVideoBtn = document.createElement('button');
    bestVideoBtn.className = 'format-btn best-quality';
    bestVideoBtn.type = 'button';
    bestVideoBtn.innerHTML = '<i class="fas fa-crown"></i> Best Quality';
    bestVideoBtn.dataset.formatId = 'best';
    bestVideoBtn.dataset.type = 'video';
    bestVideoBtn.addEventListener('click', () => handleFormatDownload(bestVideoBtn, 'best', 'video'));
    videoFormats.appendChild(bestVideoBtn);
    
    // Essential quality options - Show 1080P, 480P, 360P
    const qualityPresets = [
        { id: 'bestvideo[height<=1080]+bestaudio/best', label: '1080P (Full HD)', icon: 'video', key: '1080p' },
        { id: 'bestvideo[height<=480]+bestaudio/best', label: '480P (SD)', icon: 'mobile-alt', key: '480p' },
        { id: 'bestvideo[height<=360]+bestaudio/best', label: '360P (Mobile)', icon: 'mobile', key: '360p' }
    ];
    
    // Only show qualities that are actually available in the video
    qualityPresets.forEach((quality) => {
        if (availableQualities.size === 0 || availableQualities.has(quality.key)) {
            const btn = document.createElement('button');
            btn.className = 'format-btn';
            btn.type = 'button';
            btn.innerHTML = `<i class="fas fa-${quality.icon}"></i> ${quality.label}`;
            btn.dataset.formatId = quality.id;
            btn.dataset.type = 'video';
            btn.addEventListener('click', () => handleFormatDownload(btn, quality.id, 'video'));
            videoFormats.appendChild(btn);
        }
    });
    
    // Display audio formats - DYNAMIC
    const audioFormats = document.getElementById('audioFormats');
    audioFormats.innerHTML = '';
    
    // Best audio button - always show
    const bestAudioBtn = document.createElement('button');
    bestAudioBtn.className = 'format-btn best-quality';
    bestAudioBtn.type = 'button';
    bestAudioBtn.innerHTML = '<i class="fas fa-crown"></i> Best Quality MP3';
    bestAudioBtn.dataset.formatId = 'bestaudio';
    bestAudioBtn.dataset.type = 'audio';
    bestAudioBtn.addEventListener('click', () => handleFormatDownload(bestAudioBtn, 'bestaudio', 'audio'));
    audioFormats.appendChild(bestAudioBtn);
    
    // Essential audio quality options - only necessary ones
    const audioPresets = [
        { id: 'bestaudio[abr<=192]', label: 'High (192kbps)', icon: 'music' },
        { id: 'bestaudio[abr<=128]', label: 'Standard (128kbps)', icon: 'headphones' }
    ];
    
    audioPresets.forEach(quality => {
        const btn = document.createElement('button');
        btn.className = 'format-btn';
        btn.type = 'button';
        btn.innerHTML = `<i class="fas fa-${quality.icon}"></i> ${quality.label}`;
        btn.dataset.formatId = quality.id;
        btn.dataset.type = 'audio';
        btn.addEventListener('click', () => handleFormatDownload(btn, quality.id, 'audio'));
        audioFormats.appendChild(btn);
    });
    
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

// Handle format download with Monetag ad (two-click system)
async function handleFormatDownload(button, formatId, type) {
    const adTriggered = button.dataset.adTriggered === 'true';
    
    if (!adTriggered) {
        // FIRST CLICK: Show Monetag ad redirect
        button.dataset.adTriggered = 'true';
        
        // Update button to show next step
        const originalText = button.innerHTML;
        button.innerHTML = '<span>✅</span> Click Again to Download';
        button.style.background = 'linear-gradient(135deg, #10B981, #059669)';
        button.style.color = 'white';
        button.style.animation = 'pulse 1.5s infinite';
        
        // Open Monetag direct link in new tab
        const adUrl = 'https://otieu.com/4/10117202';
        window.open(adUrl, '_blank', 'noopener,noreferrer');
        
        // Reset button after 10 seconds if not clicked
        setTimeout(() => {
            if (button.dataset.adTriggered === 'true') {
                button.innerHTML = originalText;
                button.style.background = '';
                button.style.color = '';
                button.style.animation = '';
                button.dataset.adTriggered = 'false';
            }
        }, 10000);
        
        return;
    }
    
    // SECOND CLICK: Start actual download
    button.dataset.adTriggered = 'false'; // Reset for next time
    button.disabled = true;
    button.style.pointerEvents = 'none';
    button.style.animation = '';
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
    
    let progressInterval = null;
    let downloadId = null;
    
    try {
        // Step 1: Start the download and get the download_id
        const startResponse = await fetch('/start_download', {
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
        
        const startData = await startResponse.json();
        
        if (!startResponse.ok || !startData.success) {
            showError(startData.error || 'Failed to start download');
            hideDownloadProgress();
            return;
        }
        
        downloadId = startData.download_id;
        
        // Step 2: Start polling for progress updates with the real download_id
        progressInterval = setInterval(async () => {
            try {
                const progressResponse = await fetch(`/progress/${downloadId}`);
                const progressData = await progressResponse.json();
                
                if (progressData.status === 'downloading' || progressData.status === 'processing' || progressData.status === 'starting') {
                    updateProgressDisplay(
                        progressData.percentage || 0,
                        progressData.message || 'Downloading...',
                        progressData.speed || 0,
                        progressData.eta || 0
                    );
                } else if (progressData.status === 'complete') {
                    clearInterval(progressInterval);
                    updateProgressDisplay(100, 'Download complete!', 0, 0);
                } else if (progressData.status === 'error') {
                    clearInterval(progressInterval);
                    showError(progressData.message || 'Download failed');
                    hideDownloadProgress();
                }
            } catch (err) {
                console.log('Progress check:', err);
            }
        }, 500); // Poll every 500ms
        
        // Step 3: Actually perform the download
        const downloadResponse = await fetch('/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: currentUrl,
                format_id: formatId,
                type: type,
                download_id: downloadId
            })
        });
        
        const downloadData = await downloadResponse.json();
        
        // Clear the polling interval
        if (progressInterval) {
            clearInterval(progressInterval);
        }
        
        if (downloadResponse.ok && downloadData.success) {
            updateProgressDisplay(100, 'Download complete!', 0, 0);
            setTimeout(() => {
                showDownloadResult(downloadData.download_url);
                hideDownloadProgress();
            }, 800);
        } else {
            showError(downloadData.error || 'Download failed. Please try again or select a different format.');
            hideDownloadProgress();
        }
    } catch (error) {
        console.error('Download error:', error);
        showError('Download failed. Please check your connection and try again.');
        hideDownloadProgress();
        if (progressInterval) {
            clearInterval(progressInterval);
        }
    }
}

// Helper function to format bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Helper function to format time
function formatTime(seconds) {
    if (!seconds || seconds <= 0) return 'calculating...';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
}

// Update progress display
function updateProgressDisplay(percentage, message, speed, eta) {
    const progressBar = document.getElementById('progressBar');
    const progressPercentage = document.getElementById('progressPercentage');
    const progressSpeed = document.getElementById('progressSpeed');
    const progressEta = document.getElementById('progressEta');
    const progressMessage = document.getElementById('progressMessage');
    
    if (progressBar) {
        progressBar.style.width = percentage + '%';
    }
    if (progressPercentage) {
        progressPercentage.textContent = percentage + '%';
    }
    if (progressSpeed && speed > 0) {
        progressSpeed.textContent = `Speed: ${formatBytes(speed)}/s`;
    }
    if (progressEta && eta > 0) {
        progressEta.textContent = `Time remaining: ${formatTime(eta)}`;
    }
    if (progressMessage && message) {
        progressMessage.textContent = message;
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

// Download Another Button Handler
document.addEventListener('DOMContentLoaded', () => {
    const downloadAnotherBtn = document.getElementById('downloadAnotherBtn');
    if (downloadAnotherBtn) {
        downloadAnotherBtn.addEventListener('click', () => {
            // Reset the form
            document.getElementById('urlInput').value = '';
            currentUrl = '';
            mediaInfo = null;
            
            // Hide all result sections
            hideDownloadResult();
            hideMediaInfo();
            hideDownloadProgress();
            hideError();
            
            // Reset all format buttons
            resetAllFormatButtons();
            
            // Scroll to top of page
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            
            // Focus on URL input
            document.getElementById('urlInput').focus();
        });
    }
});

// Service worker disabled to prevent unwanted redirects
// Google AdSense is used for monetization instead

console.log('Media Downloader by Achek Digital Solutions - Ready!');
