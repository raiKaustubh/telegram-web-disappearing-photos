console.log('[Disappearing Photos] Content script loaded');

// Inject the cache patching script into page context
(function() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.onload = function() {
    console.log('[Disappearing Photos] ✅ Cache patcher script loaded');
    this.remove();
  };
  script.onerror = function() {
    console.error('[Disappearing Photos] ❌ Failed to load cache patcher');
  };
  (document.head || document.documentElement).prepend(script);
})();
