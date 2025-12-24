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

Your Solutions:
Solution 1: Intercept the GramJS Constructor in the Worker 
Since the worker loads GramJS, you can intercept the InputMediaUploadedPhoto constructor BEFORE the worker uses it:
Approach:
Inject a script that runs BEFORE the worker loads
Wrap GramJs.InputMediaUploadedPhoto constructor to always add ttlSeconds from a hidden property
When the worker creates the object at line 949, your wrapper adds ttlSeconds

Solution 2: Monkey-patch the uploadMedia function in the Worker
Find the webpack module containing uploadMedia in the worker context
Replace it with a patched version that passes ttlSeconds to InputMediaUploadedPhoto

## Attempted Solutions and Why They Failed

### Attempt 1: Force Document Path with `shouldSendAsFile: true`
**Approach:** Set `shouldSendAsFile: true` in the attachment to force the code to take the document upload path (line 988) instead of the photo path (line 949), since the document path DOES pass `ttlSeconds`.

**Why it failed:** 
- The photo was sent as a document/file, not as a photo
- Telegram treats it differently - doesn't display as a proper disappearing photo
- The UI shows it as a file attachment rather than an inline photo


### Attempt 2:
intercepting Telegram Web’s worker, patching its source code, and recreating it as a new (blob-based) worker won’t work because Telegram Web’s Content Security Policy blocks creating or replacing workers from blob: URLs, so you can’t patch or re-run the worker code at all, even from a Chrome extension.

Instead of trying to modify the worker AFTER it loads (blocked by CSP), you modify it DURING the network request, BEFORE it reaches the browser.