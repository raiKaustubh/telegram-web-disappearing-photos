# Telegram Disappearing Photos Extension
A Chrome extension that enables sending disappearing (self-destructing) photos on Telegram Web, a feature normally only available on mobile apps.
> [!CAUTION]
> This is an educational project demonstrating Chrome extension development and reverse engineering techniques.
>
> **Important Notes:**
> - This extension is not affiliated with, endorsed by, or officially supported by Telegram
> - This project modifies Telegram Web's behavior in ways not officially documented
> - For educational purposes only


> [!NOTE]
> This project was developed as part of an assignment with the following constraints:
>
> 1. Solution must be fully contained in a Chrome extension (no external servers)
> 2. Cannot bundle Telegram web source files or external libraries (ie. gramjs, mtproto, mqtt, etc)
> 3. Must work on `web.telegram.org/a` (version A), not version K or others
> 4. Must send **photos** specifically (not videos, gifs, docs, or other file types)
> 5. Must be able to send photos **programmatically** (not require manual UI interaction)


## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Via JavaScript API](#via-javascript-api)
- [How It Works](#how-it-works)
  - [Architecture Overview](#architecture-overview)
  - [Technical Implementation](#technical-implementation)
  - [Key Innovation](#key-innovation)
- [File Structure](#file-structure)
- [Development](#development)
  - [Debugging](#debugging)
  - [Reset Extension State](#reset-extension-state)
- [Privacy & Security](#privacy--security)
- [License](#license)
- [Tips](#tips)
- [Troubleshooting](#troubleshooting)

## Features

### Core Functionality
- **Send Disappearing Photos**: Send self-destructing photos that automatically delete after being viewed
- **Customizable TTL**: Set time-to-live from 1 to 60 seconds
- **URL-based Sending**: Send photos directly from any URL
- **Programmatic API**: Access via JavaScript API for automation

### Technical Features
- **Automatic Cache Patching**: Patches Telegram's worker file in the browser cache on page load
- **Webpack Module Integration**: Discovers and integrates with Telegram's internal state management
- **Zero Dependencies**: No bundled libraries or external dependencies
- **Lightweight**: Minimal codebase focused on core functionality

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. Navigate to [web.telegram.org/a](https://web.telegram.org/a)

## Usage

### Via JavaScript API

```javascript
// Example: Fetch and send an image
const response = await fetch('https://picsum.photos/800/600');
const blob = await response.blob();
await sendDisappearingPhoto(blob, 30);
```

## How It Works

### Architecture Overview

The extension consists of three core components working together:

1. **Content Script** (`content.js`)
   - Injects the main script into the Telegram Web page context
   - Acts as a bridge between the extension and the page's JavaScript environment
   - Loads on every Telegram Web page load

2. **Main Integration Script** (`inject.js`)
   - **Cache Patcher**: Automatically patches the cached worker file to include `ttlSeconds` support
   - **Webpack Module Discovery**: Searches through Telegram's webpack modules to find internal state management
   - **Action Extraction**: Extracts `getActions()`, `getGlobal()`, and `setGlobal()` functions from Telegram's internals
   - **API Exposure**: Exposes the `sendDisappearingPhoto()` function globally for programmatic use

3. **Background Service Worker** (`background.js`)
   - Minimal background script for extension lifecycle management

### Technical Implementation

The extension works by:

1. **Webpack Module Discovery**: Searches through Telegram's webpack modules to find the state management module
2. **Action Extraction**: Extracts `getActions()`, `getGlobal()`, and `setGlobal()` functions
3. **Cache Patching**: Modifies the cached service worker to include `ttlSeconds` in photo uploads
4. **Message Sending**: Uses Telegram's internal `sendMessage` action with custom attachment parameters

### Key Innovation

The extension patches this code pattern in the service worker:

```javascript
// Before (original)
new InputMediaUploadedPhoto({file:_, spoiler:l})

// After (patched)
new InputMediaUploadedPhoto({file:_, spoiler:l, ttlSeconds:f})
```

This enables the `ttlSeconds` parameter to be passed through to Telegram's API, enabling disappearing photos.

## File Structure

```
telegram-web-disappearing-photos/
├── manifest.json           # Extension configuration
├── content.js             # Content script (injection bridge)
├── inject.js              # Main script (cache patcher + Telegram integration)
├── background.js          # Background service worker
└── README.md              # This file
```


## Development

### Debugging

Enable console logging to see detailed information:

```javascript
// All extension logs are prefixed with:
[Disappearing Photos]  // Main extension logs
[Cache Patch]          // Cache patching logs
[Send Helper]          // Photo sending logs
```

### Reset Extension State

To reset the extension and re-patch:

```javascript
// In browser console on Telegram Web
localStorage.removeItem('telegram_worker_patched');
// Then reload the page and reinitialize
```

## Privacy & Security

- **No Data Collection**: The extension does not collect or transmit any user data
- **Local Processing**: All operations happen locally in your browser
- **No External Dependencies**: No third-party libraries or external API calls
- **Open Source**: All code is visible and auditable

## License

This project is provided as-is for educational purposes only.

## Tips

- Check browser console for detailed logs if something goes wrong
- Reinitialize after clearing browser cache

## Troubleshooting

**Extension not working after installation:**
- Make sure you're on `web.telegram.org/a` (not `/k`)
- Reload the Telegram Web page after installing the extension
- Check browser console for error messages

**Photos not sending:**
- Ensure you have a chat open on Telegram Web
- Check that the image URL is accessible
- Verify the console shows `[Disappearing Photos] ✅ Ready!` message
- Try a different image URL

**Cache patch not persisting:**
- Don't clear browser cache while using the extension
- If cache is cleared, reload Telegram Web to re-patch automatically
