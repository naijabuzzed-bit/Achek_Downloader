# Achek Media Downloader

## Overview
A Python Flask-based web application that allows users to download videos and music from multiple platforms including YouTube, Facebook, Instagram, TikTok, Spotify, and more. The site features Monetag ad integration for monetization with a two-click download system.

## Recent Changes
- **2025-10-30**: Achek Media Downloader Launch
  - Installed Python 3.11 and latest yt-dlp (2025.10.22)
  - Created Flask application structure
  - Integrated yt-dlp for universal media downloading
  - Added Monetag ad script integration with SW.js service worker
  - Implemented two-click download system (first click fetches info, second downloads)
  - Added quality selector dropdown with multiple resolution options
  - Created custom favicon and updated all branding to "Achek Media Downloader"
  - Fixed security vulnerabilities (path traversal prevention)
  - Added audio format selection functionality

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
