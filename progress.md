# Progress Tracker: Telegram Disappearing Photos Challenge

## Goal
Send disappearing photos programmatically on Telegram Web (web.telegram.org/a) using a Chrome extension.

---

## ✅ Completed

### 1. Understanding the Problem
- [x] Read and understood the challenge requirements
- [x] Identified that Telegram Web has the functionality but it's hidden from UI
- [x] Confirmed we need to work with version A (web.telegram.org/a)

### 2. Research & Discovery
- [x] Found `messages.js` - contains `uploadMedia()` and `sendApiMessage()`
- [x] Found `composer.tsx` - UI component that calls send functions
- [x] Found `actions_messages.ts` - action handlers that wrap API calls
- [x] **DISCOVERED THE KEY PARAMETER:** `ttlSeconds` in attachment object (line 921 in messages.js)

### 3. Understanding the Flow
```
UI (composer.tsx)
  ↓ calls
getActions().sendMessage()
  ↓ calls
callApi('sendMessage', params)
  ↓ calls
sendApiMessage() [messages.js]
  ↓ calls
uploadMedia() [messages.js line 919]
  ↓ reads
attachment.ttlSeconds [line 921]
  ↓ passes to
GramJs.InputMediaUploadedDocument({ ttlSeconds }) [line 995]
  ↓
Sent as disappearing photo!
```

### 4. Key Findings
- [x] `ttlSeconds` is the parameter that makes photos disappear
- [x] It's set in the attachment object: `{ filename, blobUrl, mimeType, ttlSeconds: 10 }`
- [x] Voice messages already use this (line 1265-1271 in composer.tsx)
- [x] The value `ONE_TIME_MEDIA_TTL_SECONDS` is used for "view once" media

---

## ✅ Completed (Continued)

### 5. Accessing Telegram's Functions
- [x] Searched for `window.getActions` - not exposed
- [x] Searched for `window.callApi` - not exposed
- [x] Tried accessing webpack modules - functions not in exports
- [x] Found the functions in main bundle (main_x.js line 12495-12497)
- [x] Created injection method to expose functions via webpack module cache

### 6. Implementation
- [x] Write Chrome extension code:
  - [x] Created `inject.js` - Accesses webpack modules and exposes functions
  - [x] Updated `content.js` - Injects script and adds UI button
  - [x] Updated `manifest.json` - Added web_accessible_resources
  - [x] Updated `background.js` - Added installation logging
  - [x] Created `window.sendDisappearingPhoto()` helper function
  - [x] Built attachment object with `ttlSeconds: 10`
  - [x] Added beautiful floating UI button
  - [x] Added file picker functionality
  - [x] Added success/error notifications

---

## 🔄 In Progress

### 7. Testing
- [ ] Load extension in Chrome
- [ ] Test sending a disappearing photo
- [ ] Verify it appears as "view once" on mobile
- [ ] Verify web shows "This message is not supported on web version"
- [ ] Test with different chats (personal, groups)
- [ ] Test error handling

### 8. Cleanup & Submission
- [ ] Remove debug/context files (messages.js, composer.tsx, etc.)
- [ ] Test the extension works from fresh install
- [ ] Record demo video
- [ ] Upload to Google Drive (as folder, not zip)
- [ ] Submit

---

## 🎯 Next Steps

### Immediate (Access Functions)
1. **Option A:** Continue searching webpack modules with different patterns
2. **Option B:** Intercept/hook into existing send flow (monkey patch)
3. **Option C:** Directly manipulate the DOM to trigger existing functionality
4. **Option D:** Find and call lower-level API functions (GramJs directly)

### Most Promising Approach
Try to find where `callApi` is defined by searching in DevTools Sources for:
- `export function callApi`
- `callApi = function`
- `api/gramjs` (the import path)

Or hook into the existing attachment flow by:
- Monitoring when photos are selected
- Intercepting the attachment object
- Adding `ttlSeconds: 10` before it's sent

---

## 📝 Notes

### Important Constants
- `ONE_TIME_MEDIA_TTL_SECONDS` - likely 10 or similar (from config)
- TTL values are probably: 10, 30, 60 seconds

### Key Files
- `messages.js` - API layer (line 919: uploadMedia, line 995: ttlSeconds usage)
- `composer.tsx` - UI component (line 1265: voice recording with TTL example)
- `actions_messages.ts` - Action handlers (line 1954: sendMessage function)

### Webpack Info
- Bundle: `window.webpackChunktelegram_t`
- 22,978 modules found
- Functions are not directly exported on module.exports

---

## 🚧 Blockers

1. **Cannot access `callApi` or `getActions` from window** - Functions are in webpack module scope
2. **Content script isolation** - Extension runs in isolated context, can't directly access page's JavaScript

### Potential Solutions
- Inject script tag into page to run in page context
- Use `window.postMessage` to communicate between contexts
- Find the module ID that contains the functions
- Hook into React/Teact component props

