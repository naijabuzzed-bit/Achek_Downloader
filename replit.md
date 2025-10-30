# Media Downloader Website

## Overview
A Python Flask-based web application that allows users to download videos and music from multiple platforms including YouTube, Facebook, Instagram, TikTok, Spotify, and Audiomack. The site features ad placement zones for monetization.

## Recent Changes
- **2025-10-30**: Initial project setup
  - Installed Python 3.11
  - Created Flask application structure
  - Integrated yt-dlp for universal media downloading
  - Added ad placement zones for monetization

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
