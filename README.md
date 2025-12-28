# 📸 Telegram Disappearing Photos Extension

A Chrome extension that enables sending disappearing (self-destructing) photos on Telegram Web, a feature normally only available on mobile apps.

## ⚠️ Disclaimer

This is an educational project demonstrating Chrome extension development and reverse engineering techniques. Use at your own risk.

**Important Notes:**
- This extension is not affiliated with, endorsed by, or officially supported by Telegram
- This project modifies Telegram Web's behavior in ways not officially documented
- Telegram may update their code at any time, which could break this extension
- Use of this extension is at your own discretion and responsibility
- For educational and personal use only

## ✨ Features

### Core Functionality
- **Send Disappearing Photos**: Send self-destructing photos that automatically delete after being viewed
- **Customizable TTL**: Set time-to-live from 1 to 60 seconds
- **URL-based Sending**: Send photos directly from any URL
- **Programmatic API**: Access via JavaScript API for automation

### Technical Features
- **Cache Patching**: Automatically patches Telegram's service worker to enable disappearing photo support
- **Webpack Module Integration**: Seamlessly integrates with Telegram's internal state management
- **Non-invasive**: No bundled libraries or external dependencies
- **Clean Architecture**: Modular design with separate concerns for patching, sending, and UI

## 🚀 Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. Navigate to [web.telegram.org/a](https://web.telegram.org/a)

## 📖 Usage

### Via Extension Popup

1. **Initialize the Extension**
   - Click the extension icon in your browser toolbar
   - Click "Initialize Extension" button
   - Reload the Telegram Web page when prompted
   - The extension will patch the service worker cache to enable disappearing photos

2. **Send a Disappearing Photo**
   - Open any chat on Telegram Web
   - Click the extension icon
   - Enter a photo URL (e.g., `https://picsum.photos/800/600`)
   - Select a TTL (Time To Live) using quick options or enter custom seconds (1-60)
   - Click "Send Disappearing Photo"

3. **Deinitialize (Optional)**
   - Click "Deinitialize Extension" to remove the cache patch
   - Reload the page to restore original functionality

### Via JavaScript API

Once initialized, you can programmatically send disappearing photos using the browser console:

```javascript
// Send a disappearing photo with 10 second TTL
await sendDisappearingPhoto(blob, 10);

// Example: Fetch and send an image
const response = await fetch('https://picsum.photos/800/600');
const blob = await response.blob();
await sendDisappearingPhoto(blob, 30);
```

## 🔧 How It Works

### Architecture Overview

The extension consists of several components working together:

1. **Content Script** (`content.js`)
   - Injects scripts into the Telegram Web page context
   - Bridges communication between popup and page context
   - Manages initialization and deinitialization

2. **Telegram Integration** (`inject.js`)
   - Accesses Telegram's webpack modules
   - Extracts internal actions and state management functions
   - Exposes `sendDisappearingPhoto()` API

3. **Cache Patcher** (`cache-patcher.js`)
   - Patches the cached service worker code
   - Adds `ttlSeconds` parameter to `InputMediaUploadedPhoto` API calls
   - Persists patch across sessions using localStorage

4. **Send Helper** (`send-helper.js`)
   - Handles photo sending requests from the popup
   - Converts URLs to blobs
   - Calls the `sendDisappearingPhoto()` function

5. **Popup UI** (`popup.html`, `popup.js`)
   - User-friendly interface for initialization and sending
   - Status monitoring and feedback
   - Quick TTL selection options

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

## 📁 File Structure

```
telegram-web-disappearing-photos/
├── manifest.json           # Extension configuration
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic and event handlers
├── content.js             # Content script (bridge)
├── inject.js              # Telegram integration (page context)
├── cache-patcher.js       # Service worker cache patcher
├── send-helper.js         # Photo sending helper
├── deinit-helper.js       # Deinitialization helper
├── background.js          # Background service worker
└── README.md              # This file
```

## 🎯 Requirements

- Chrome/Chromium-based browser (Chrome, Edge, Brave, etc.)
- Telegram Web A version ([web.telegram.org/a](https://web.telegram.org/a))
- Active Telegram account with an open chat

## ⚠️ Limitations

- Only works on Telegram Web A (`web.telegram.org/a`), not version K
- Requires manual initialization after each browser restart
- Cache patch persists until manually deinitialized or cache is cleared
- Only supports photo files (not videos, GIFs, or documents)

## 🛠️ Development

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

## 🔒 Privacy & Security

- **No Data Collection**: The extension does not collect or transmit any user data
- **Local Processing**: All operations happen locally in your browser
- **No External Dependencies**: No third-party libraries or external API calls
- **Open Source**: All code is visible and auditable

## 📝 License

This project is provided as-is for educational and personal use.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 💡 Tips

- Use quick TTL buttons (5s, 10s, 30s, 60s) for faster selection
- Test with random images from `https://picsum.photos/800/600`
- Check browser console for detailed logs if something goes wrong
- Reinitialize after clearing browser cache

## ❓ Troubleshooting

**Extension not working after installation:**
- Make sure you're on `web.telegram.org/a` (not `/k`)
- Click "Initialize Extension" and reload the page
- Check browser console for error messages

**"Please reload Telegram Web page" error:**
- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Reinitialize the extension

**Photos not sending:**
- Ensure you have a chat open
- Verify the extension is initialized (check status in popup)
- Check that the image URL is accessible
- Try a different image URL

**Cache patch not persisting:**
- Don't clear browser cache while using the extension
- Reinitialize if you clear cache or restart browser
