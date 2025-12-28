console.log('[Disappearing Photos] Content script loaded');

// Inject the Telegram integration script into page context (always runs)
(function() {
  const injectScript = document.createElement('script');
  injectScript.src = chrome.runtime.getURL('inject.js');
  injectScript.onload = function() {
    console.log('[Disappearing Photos] ✅ Telegram integration script loaded');
    this.remove();
  };
  injectScript.onerror = function() {
    console.error('[Disappearing Photos] ❌ Failed to load Telegram integration');
  };
  (document.head || document.documentElement).prepend(injectScript);
  
  // Also inject the send helper script
  const helperScript = document.createElement('script');
  helperScript.src = chrome.runtime.getURL('send-helper.js');
  helperScript.onload = function() {
    console.log('[Disappearing Photos] ✅ Send helper script loaded');
    this.remove();
  };
  helperScript.onerror = function() {
    console.error('[Disappearing Photos] ❌ Failed to load send helper');
  };
  (document.head || document.documentElement).prepend(helperScript);
})();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // Check initialization status
  if (request.action === 'checkInitStatus') {
    const isInitialized = localStorage.getItem('telegram_worker_patched') === 'true';
    sendResponse({ initialized: isInitialized });
    return;
  }
  
  // Initialize extension (run cache patcher)
  if (request.action === 'initializeExtension') {
    console.log('[Disappearing Photos] Initializing extension...');
    
    // Inject the cache patcher script
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('cache-patcher.js');
    script.onload = function() {
      console.log('[Disappearing Photos] ✅ Cache patcher script loaded');
      this.remove();
    };
    script.onerror = function() {
      console.error('[Disappearing Photos] ❌ Failed to load cache patcher');
      sendResponse({ success: false, error: 'Failed to load cache patcher script' });
    };
    
    // Listen for result from cache patcher
    const messageListener = (event) => {
      if (event.data.type === 'CACHE_PATCH_RESULT') {
        window.removeEventListener('message', messageListener);
        
        if (event.data.success) {
          sendResponse({ success: true, alreadyPatched: event.data.alreadyPatched });
        } else {
          sendResponse({ success: false, error: event.data.error || 'Cache patching failed' });
        }
      }
    };
    window.addEventListener('message', messageListener);
    
    // Inject the script
    (document.head || document.documentElement).appendChild(script);
    
    return true; // Keep the message channel open for async response
  }
  
  // Send disappearing photo
  if (request.action === 'sendDisappearingPhoto') {
    // Listen for result from page context first
    const messageListener = (event) => {
      if (event.data.type === 'DISAPPEARING_PHOTO_RESULT') {
        window.removeEventListener('message', messageListener);
        sendResponse(event.data);
      }
    };
    window.addEventListener('message', messageListener);
    
    // Send message to page context via postMessage
    // The send-helper.js script will receive this and call sendDisappearingPhoto
    const message = {
      type: 'SEND_DISAPPEARING_PHOTO_REQUEST',
      ttl: request.ttl
    };
    
    // Check if it's a URL or blob data
    if (request.imageUrl) {
      message.imageUrl = request.imageUrl;
    } else if (request.blobData) {
      message.blobData = request.blobData;
      message.mimeType = request.mimeType;
    }
    
    window.postMessage(message, '*');
    
    return true; // Keep the message channel open for async response
  }
});
