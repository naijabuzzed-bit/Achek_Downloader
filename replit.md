# Achek Media Downloader

## Overview
A Python Flask-based web application that allows users to download videos and music from multiple platforms including YouTube, Facebook, Instagram, TikTok, Spotify, and more. The site features Monetag ad integration for monetization with a two-click download system.

## Recent Changes
- **2025-10-30**: Platform Compatibility Enhancement & Expectation Management
  - Enhanced yt-dlp configuration for maximum compatibility:
    - Added Instagram and TikTok specific extractor arguments
    - Improved HTTP headers with compression support
    - Added socket timeout and retry settings for reliability
    - Better geo-bypass configuration
  - Improved error handling with specific messages:
    - Clear DRM-protection warnings for Spotify, Netflix, Disney+, etc.
    - Honest messaging about technical limitations
    - Helpful suggestions for alternative platforms
    - Better Audiomack, geo-restriction, and private content errors
  - Updated UI to set proper expectations:
    - Clear "✅ Supported Platforms (Working)" section
    - Prominent DRM warning for protected platforms
    - Removed false claims about premium downloads
    - Updated to offer legitimate custom development services
  - Focus on platforms that actually work: YouTube, Instagram, TikTok, Facebook, Twitter, Vimeo, SoundCloud, Reddit, Twitch, etc.

- **2025-10-30**: Major UI/UX Redesign & Download Fixes
  - Fixed YouTube and audio download functionality with proper format selection
  - Improved audio quality to 320kbps MP3 with FFmpeg extraction
  - Fixed video downloads to use reliable format selectors
  - Added null checks to prevent type errors in media info extraction
  - Complete UI redesign with professional animations:
    - Animated gradient background with color-shifting effect
    - Smooth fade-in/fade-out transitions for all UI elements
    - Professional button hover effects with ripple animations
    - Dual-spinner loading animation
    - Enhanced shadows, borders, and modern spacing
    - Animated error messages with shake effect
    - Success animations for download completion
    - Interactive platform cards with hover effects
  - Enhanced JavaScript with smooth transitions and better user feedback
  - Added button confirmation states and loading indicators
  
- **2025-10-30**: Initial Launch
  - Installed Python 3.11 and latest yt-dlp (2025.10.22)
  - Created Flask application structure
  - Integrated yt-dlp for universal media downloading
  - Added Monetag ad script integration with SW.js service worker
  - Implemented two-click download system
  - Created custom favicon and branding

## User Preferences
- Wants both free (with ads) and premium monetization options
- Requires support for video downloads from YouTube, Facebook, Instagram, TikTok
- Requires music downloads from Spotify and Audiomack
- Wants profile picture and story download capabilities
- Has a license for the service

## Project Architecture
### Stack
- **Backend**: Flask (Python)
- **Frontend**: HTML, CSS, JavaScript
- **Media Downloader**: yt-dlp (supports 1000+ websites)
- **Media Processing**: ffmpeg

### Key Features
- Multi-platform video/audio downloader
- Format and quality selection
- Download progress tracking
- Ad placement zones for monetization
- Clean, user-friendly interface

### Structure
```
/
├── app.py                 # Main Flask application
├── templates/             # HTML templates
│   └── index.html        # Main interface
├── static/               # CSS, JS, images
│   ├── css/
│   ├── js/
│   └── downloads/        # Temporary download storage
└── requirements.txt      # Python dependencies
```
