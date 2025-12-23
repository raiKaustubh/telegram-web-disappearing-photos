# Progress Report: Telegram Disappearing Photos Extension

## ✅ Completed Tasks

### 1. Chrome Extension Setup
- ✅ Created `manifest.json` with proper permissions and configuration
- ✅ Created `content.js` to inject scripts into Telegram Web
- ✅ Created `background.js` service worker
- ✅ Configured `web_accessible_resources` to bypass CSP restrictions

### 2. Reverse Engineering Telegram Web
- ✅ Found webpack module system in Telegram's bundled code
- ✅ Located the `require` function to access internal modules
- ✅ Discovered module 37932 exports `getActions`, `getGlobal`, `setGlobal` via `cl()` function
- ✅ Successfully exposed these functions on `window` object as:
  - `window.__TG_GET_ACTIONS__()`
  - `window.__TG_GET_GLOBAL__()`
  - `window.__TG_SET_GLOBAL__()`

### 3. Understanding Telegram's Message Sending Flow
- ✅ Identified `sendMessage` action as the high-level entry point
- ✅ Found `uploadMedia` function that handles attachments
- ✅ Discovered `ttlSeconds` parameter in `ApiAttachment` interface
- ✅ Located two media upload paths:
  - `InputMediaUploadedPhoto` (for photos) - **does NOT support `ttlSeconds`**
  - `InputMediaUploadedDocument` (for documents) - **supports `ttlSeconds`**

### 4. Accessing Current Chat Information
- ✅ Fixed path to get current chat: `global.byTabId[tabId].messageLists`
- ✅ Successfully extract `chatId`, `threadId`, and `type` from active chat

### 5. Sending Photos Programmatically
- ✅ Created `window.sendDisappearingPhoto(file, ttlSeconds)` function
- ✅ Successfully sends photos via `actions.sendMessage()`
- ✅ Photos appear in chat and on mobile devices

### 6. Debugging and Analysis
- ✅ Intercepted `sendMessage` to analyze attachment structure
- ✅ Compared spoiler photos vs regular photos
- ✅ Identified that spoiler photos work: `shouldSendAsSpoiler: true` + `quick` dimensions
- ✅ Searched for view-once related code in webpack modules
- ✅ Found that Telegram Web UI only supports view-once for **voice messages**, not photos

## ❌ Current Blocker

### The `ttlSeconds` Problem

**Issue**: Photos sent with `ttlSeconds` parameter do NOT disappear.

**Root Cause**: In `messages.js:946-952`, the code checks:
```javascript
if (!shouldSendAsFile) {
  if (quick) {
    if (SUPPORTED_PHOTO_CONTENT_TYPES.has(mimeType) && mimeType !== GIF_MIME_TYPE) {
      return new GramJs.InputMediaUploadedPhoto({
        file: inputFile,
        spoiler: shouldSendAsSpoiler,
        // ❌ NO ttlSeconds parameter!
      });
    }
  }
}
```

This returns early, never reaching the `InputMediaUploadedDocument` path which has `ttlSeconds` support (line 988-996).

**What We've Tried**:
1. ❌ Setting `shouldSendAsFile: true` → Sends as file icon (not a viewable photo)
2. ❌ Removing `quick` property → Unknown result (needs testing)
3. ❌ Changing mime type to `image/gif` → User reverted this change

## 🔍 Key Findings

### Attachment Properties for Different Media Types

**Regular Photo**:
```javascript
{
  filename: 'photo.jpg',
  blobUrl: 'blob:...',
  mimeType: 'image/jpeg',
  quick: { width: 2062, height: 3664 },
  shouldSendAsFile: undefined,
  shouldSendAsSpoiler: false,
  ttlSeconds: undefined
}
```

**Spoiler Photo** (works on mobile):
```javascript
{
  filename: 'photo.jpg',
  blobUrl: 'blob:...',
  mimeType: 'image/jpeg',
  quick: { width: 2062, height: 3664 },
  shouldSendAsFile: undefined,
  shouldSendAsSpoiler: true,  // ✅ This works!
  ttlSeconds: undefined
}
```

**Our Disappearing Photo Attempt** (doesn't work):
```javascript
{
  filename: 'photo.jpg',
  blobUrl: 'blob:...',
  mimeType: 'image/jpeg',
  quick: { width: 1920, height: 1080 },
  shouldSendAsFile: undefined,
  shouldSendAsSpoiler: false,
  ttlSeconds: 10  // ❌ Gets ignored!
}
```

### Why Spoilers Work But TTL Doesn't

- `InputMediaUploadedPhoto` **has** a `spoiler` parameter → Spoilers work
- `InputMediaUploadedPhoto` **does NOT have** a `ttlSeconds` parameter → TTL ignored
- `InputMediaUploadedDocument` **has both** `spoiler` and `ttlSeconds` parameters

## 🎯 Next Steps to Try

### Option 1: Force Document Path Without File Icon
- Remove `quick` property entirely
- Keep `mimeType: 'image/jpeg'`
- Add `ttlSeconds: 10`
- **Risk**: Might send as file icon or not display properly

### Option 2: Use GIF Mime Type Hack
- Set `mimeType: 'image/gif'` (forces document path per line 948)
- Keep `quick` property for dimensions
- Add `ttlSeconds: 10`
- **Risk**: Might display as GIF or not work at all

### Option 3: Check for Special TTL Value
- Find the actual value of `ONE_TIME_MEDIA_TTL_SECONDS` constant
- Try using that specific value instead of `10`
- **Theory**: Maybe there's a special value like `0x7FFFFFFF` for "view once"

### Option 4: Intercept and Modify uploadMedia
- Hook into the `uploadMedia` function itself
- Modify the logic to check for `ttlSeconds` before returning `InputMediaUploadedPhoto`
- **Complexity**: High, requires deeper webpack module manipulation

### Option 5: Accept Limitation
- Document that Telegram Web's API doesn't properly support disappearing photos
- Only support disappearing voice messages (which work via `isViewOnceEnabled`)
- **Note**: This might be the reality - the feature may not be fully implemented in Telegram Web

## 📝 Technical Notes

- Telegram Web version: web.telegram.org/a
- Main bundle: `main_x.js` (31,836 lines)
- Key module: 37932 (exports `cl()` → `{getActions, getGlobal, setGlobal}`)
- Webpack chunk: `window.webpackChunktelegram_t`
- Extension successfully hooks into Telegram runtime ✅
- Message sending works programmatically ✅
- TTL parameter is recognized but not applied ❌

## 🤔 Open Questions

1. Does Telegram's official mobile app send disappearing photos differently?
2. Is there a different API method specifically for disappearing media?
3. Could we use `messages.sendMedia` directly instead of `sendMessage` action?
4. Is there a flag or property we're missing that enables TTL for photos?
5. Does the `previewBlobUrl` property affect how media is sent?

## 📚 References

- `context/messages.js:919-997` - `uploadMedia` function
- `context/composer.tsx:1263-1274` - View-once for voice messages
- `context/messages.js:948-952` - Photo path (no TTL support)
- `context/messages.js:988-996` - Document path (has TTL support)
- `context/composer.tsx:2690` - `canSendOneTimeMedia` condition
