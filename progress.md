# Solution: Sending Disappearing Photos on Telegram Web

## The Challenge

Telegram mobile allows sending disappearing photos (view once), but Telegram Web doesn't expose this feature in the UI. The goal was to programmatically send disappearing photos using a Chrome extension.

## The Discovery

After reverse engineering Telegram Web's source code, I discovered:

### 1. The API Supports It!

The Telegram GramJS API **fully supports** `ttlSeconds` for photos:

```typescript
// From api.d.ts
export class InputMediaUploadedPhoto {
  file: Api.TypeInputFile;
  spoiler?: true;
  ttlSeconds?: int;  // ✅ This exists!
}

export class MessageMediaPhoto {
  spoiler?: true;
  photo?: Api.TypePhoto;
  ttlSeconds?: int;  // ✅ This exists!
}
```

### 2. Telegram Web Intentionally Blocks It

In `telegram-tt/src/api/gramjs/methods/messages.ts` (lines 946-952):

```javascript
if (SUPPORTED_PHOTO_CONTENT_TYPES.has(mimeType) && mimeType !== GIF_MIME_TYPE) {
  return new GramJs.InputMediaUploadedPhoto({
    file: inputFile,
    spoiler: shouldSendAsSpoiler,
    // ❌ ttlSeconds is NOT passed, even though the attachment has it!
  });
}
```

The `uploadMedia` function receives `ttlSeconds` in the attachment parameter but **intentionally doesn't pass it** to `InputMediaUploadedPhoto`.

### 3. The ttlSeconds Values

```javascript
// From config.ts
export const ONE_TIME_MEDIA_TTL_SECONDS = 2147483647;  // 0x7FFFFFFF
```

Telegram supports two types of disappearing photos:

**View Once (no timer):**
- `ttlSeconds = 2147483647` (0x7FFFFFFF - max int32)
- Photo disappears after being viewed once
- No countdown timer shown

**Timed Disappearing (with countdown):**
- `ttlSeconds = 5, 10, 30, 60, etc.`
- Photo shows timer badge (e.g., "5s") on mobile
- Auto-deletes after X seconds while viewing
- Valid range: 1-60 seconds (from iOS source code)

Main Thread:                          Worker Thread:
-----------                           --------------
1. actions.sendMessage()              
   (with ttlSeconds in attachment)
                    ↓
2. callApi('sendMessage', params) →   3. onmessage receives params
   (connector.ts line 205)               (worker.ts line 52)
                                          ↓
                                       4. callApi('sendMessage', ...args)
                                          (worker.ts line 89)
                                          ↓
                                       5. sendMessage() in messages.ts
                                          (line 538)
                                          ↓
                                       6. uploadMedia() with ttlSeconds
                                          (line 919-997)
                                          ↓
                                       7. Creates InputMediaUploadedPhoto
                                          WITHOUT ttlSeconds (line 949-952)


## Attempted Solutions and Why They Failed

### Approach 1: Work with shouldSendAsFIle: true
- Work with shouldSendAsFIle: true

**Why it failed:**  
- photo was sent as a document/file, telegram treats it differently

---

### Approach 2: Intercept or Patch Worker Code at Runtime
**Details:**  
- Try to inject a script or code to alter the worker’s behavior at runtime, for example:
  - Intercept or monkey-patch the `InputMediaUploadedPhoto` constructor inside the worker (before it’s first used) 
      OR
  - Monkey-patch the `uploadMedia` function in the worker
- This would require code execution inside the worker’s scope, either before or as soon as the worker loads.
 
**Why it failed:**  
- Web workers isolation: workers are sandboxed and isolated from the main page context; scripts injected by extensions cannot access or modify the global scope inside a running worker

---

### Approach 3: Patch and Replace the Worker via Blob and make the main thread call it

**Why it failed:**  
- Telegram Web’s Content Security Policy (CSP) blocks creating or replacing workers from `blob:` URLs for security reasons  

---

> **Note:**  
> The only reliable way is to modify the worker code _before_ the browser loads it, i.e., by patching it in the cache or network response, so Telegram loads your version naturally.

---

### Approach 4: Patch the Worker Code in the Browser Cache (What Actually Worked)

**Details:**  
- The extension injects a script into the page (`content.js` loads `inject.js`) as soon as Telegram Web is open.
- This script searches the browser's Cache API for the Telegram worker file (the JavaScript file that runs in the worker thread).
- If the worker file is present in cache, it reads the JS source code, detects if it’s already patched, and if not:
  - Uses a regex to find where `InputMediaUploadedPhoto` is created.
  - Modifies that line to include the `ttlSeconds` property—so, for example, it changes `new GramJs.InputMediaUploadedPhoto({...})` to also include `ttlSeconds`.
  - Saves the patched worker JS code back into the cache, replacing the old version.
- When Telegram Web next creates the worker, it requests the same worker URL as usual—but the browser now serves the patched version from the cache.
- **Result:** The patched worker executes as if it was the original one from Telegram, but now uploading disappearing photos is possible because `ttlSeconds` gets passed in the right place.

**Why it worked:**  
- No need to bypass CSP; the worker URL and app logic stay the same, so Telegram’s main thread is unaware anything changed.
- The patch is performed before the worker is launched, so the modified logic runs as if it was original.
- Leverages browser extension/content script capabilities and the cache, working around both CSP and worker isolation.
