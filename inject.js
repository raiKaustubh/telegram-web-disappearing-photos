/**
 * Telegram Disappearing Photos - Worker URL Replacement
 * 
 * This script intercepts Worker creation and replaces the URL with our patched worker
 */

(function() {
  'use strict';
  
  console.log('[TTL Patch] Initializing worker URL replacement...');
  
  // Store the original Worker constructor
  const OriginalWorker = window.Worker;
  
  // Get the extension ID from the script's URL
  const scriptUrl = document.currentScript?.src || '';
  const extensionId = scriptUrl.match(/chrome-extension:\/\/([^\/]+)/)?.[1];
  
  if (!extensionId) {
    console.error('[TTL Patch] Could not determine extension ID!');
    return;
  }
  
  console.log('[TTL Patch] Extension ID:', extensionId);
  
  // Override the Worker constructor
  window.Worker = class PatchedWorker extends OriginalWorker {
    constructor(scriptURL, options) {
      const urlString = scriptURL.toString();
      
      console.log('[TTL Patch] Worker being created:', urlString);
      
      // Check if this is the GramJS worker (6854.xxx.js)
      if (urlString.includes('6854') && urlString.includes('.js')) {
        console.log('[TTL Patch] ✅ Detected GramJS worker!');
        
        // Replace with our patched worker from the extension
        const patchedURL = `chrome-extension://${extensionId}/patched-worker.js`;
        console.log('[TTL Patch] Redirecting to:', patchedURL);
        
        // Call super with the patched URL
        super(patchedURL, options);
        console.log('[TTL Patch] ✅ Worker created with patched code!');
        return;
      }
      
      // For other workers, use original URL
      console.log('[TTL Patch] Using original worker');
      super(scriptURL, options);
    }
  };
  
  console.log('[TTL Patch] ✅ Worker interception installed');
  
  // Mark as active
  window.__telegramTTLPatchActive = true;
  
})();
