console.log('[Disappearing Photos] Content script loaded');

// Wait for page to be ready
function injectScript() {
  if (!document.head && !document.documentElement) {
    setTimeout(injectScript, 100);
    return;
  }
  
  try {
    // Inject the script into the page context to access Telegram's webpack modules
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject_v2.js');
    script.onload = function() {
      console.log('[Disappearing Photos] Inject script loaded');
      this.remove();
    };
    script.onerror = function() {
      console.error('[Disappearing Photos] Failed to load inject script');
    };
    (document.head || document.documentElement).appendChild(script);
    console.log('[Disappearing Photos] Script injection attempted');
  } catch (error) {
    console.error('[Disappearing Photos] Injection error:', error);
  }
}

// Start injection
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectScript);
} else {
  injectScript();
}