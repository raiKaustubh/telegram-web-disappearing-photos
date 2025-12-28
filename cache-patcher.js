/**
 * Telegram Disappearing Photos - Cache Patcher
 * 
 * This script patches the cached worker file to include ttlSeconds support for photos
 * This is triggered manually via the popup UI
 */

(async function() {
  'use strict';
  
  console.log('[Cache Patch] Initializing...');
  
  const CHECK_INTERVAL = 500; // Check every 500ms
  const MAX_ATTEMPTS = 60; // Try for 30 seconds
  
  /**
   * Check if the code is already patched
   */
  function isAlreadyPatched(code) {
    // Look for the patched pattern: InputMediaUploadedPhoto with ttlSeconds
    const patchedPattern = /new \w+\.InputMediaUploadedPhoto\(\{[^}]*ttlSeconds[^}]*\}\)/;
    return patchedPattern.test(code);
  }
  
  /**
   * Patch the worker code to include ttlSeconds in InputMediaUploadedPhoto
   */
  function patchCode(code) {
    console.log('[Cache Patch] Patching code...');
    
    // Check if already patched
    if (isAlreadyPatched(code)) {
      console.log('[Cache Patch] ✅ Code is already patched! Skipping...');
      return code; // Return as-is, no changes needed
    }
    
    let patchCount = 0;
    
    // Pattern for MINIFIED code:
    // new Ke.InputMediaUploadedPhoto({file:_,spoiler:l})
    const patched = code.replace(
      /new (\w+)\.InputMediaUploadedPhoto\(\{file:(\w+),spoiler:(\w+)\}\)/g,
      (match, className, fileVar, spoilerVar) => {
        patchCount++;
        const originalMatch = match;
        const patchedCode = `new ${className}.InputMediaUploadedPhoto({file:${fileVar},spoiler:${spoilerVar},ttlSeconds:f})`;
        
        console.log(`[Cache Patch] Found pattern (match ${patchCount}):`);
        console.log(`  ORIGINAL: ${originalMatch}`);
        console.log(`  PATCHED:  ${patchedCode}`);
        
        return patchedCode;
      }
    );
    
    if (patchCount === 0) {
      console.warn('[Cache Patch] ⚠️  No InputMediaUploadedPhoto patterns found!');
      return null;
    }
    
    console.log(`[Cache Patch] ✅ Successfully patched ${patchCount} occurrence(s)`);
    return patched;
  }
  
  /**
   * Try to patch the cached worker
   */
  async function patchCachedWorker() {
    try {
      // Get all cache names
      const cacheNames = await caches.keys();
      console.log('[Cache Patch] Found caches:', cacheNames);
      
      // Try each cache and look for the worker
      for (const cacheName of cacheNames) {
        console.log('[Cache Patch] Checking cache:', cacheName);
        const cache = await caches.open(cacheName);
        
        // Get all keys (URLs) in this cache
        const requests = await cache.keys();
        console.log(`[Cache Patch] Cache "${cacheName}" has ${requests.length} entries`);
        
        // Look for our worker URL
        for (const request of requests) {
          const url = request.url;
          
          // Check if this is the worker we're looking for
          if (url.includes('6854') && url.includes('.js')) {
            console.log('[Cache Patch] 🎯 FOUND WORKER in cache:', cacheName);
            console.log('[Cache Patch] Worker URL:', url);
            
            const cachedResponse = await cache.match(request);
            
            if (cachedResponse) {
              // Get the code
              const originalCode = await cachedResponse.text();
              console.log('[Cache Patch] Code size:', originalCode.length);
              
              // Check if already patched
              if (isAlreadyPatched(originalCode)) {
                console.log('[Cache Patch] ✅ Worker is already patched! Nothing to do.');
                return true; // Success, but no action needed
              }
              
              // Patch it
              const patchedCode = patchCode(originalCode);
              
              if (!patchedCode) {
                console.error('[Cache Patch] ❌ Failed to patch code');
                return false;
              }
              
              // Create new response with patched code
              const patchedResponse = new Response(patchedCode, {
                status: cachedResponse.status,
                statusText: cachedResponse.statusText,
                headers: cachedResponse.headers
              });
              
              // Replace in cache using the exact request that was cached
              await cache.put(request, patchedResponse);
              
              console.log('[Cache Patch] ✅ Successfully patched cached worker!');
              console.log('[Cache Patch] ✅ Patched code size:', patchedCode.length);
              return true;
            }
          }
        }
      }
      
      console.log('[Cache Patch] Worker not found in any cache');
      return false;
    } catch (error) {
      console.error('[Cache Patch] ❌ Error:', error);
      return false;
    }
  }
  
  /**
   * Wait for worker to be cached, then patch it
   */
  async function waitAndPatch() {
    // Check if we've already successfully patched the worker
    const PATCH_FLAG = 'telegram_worker_patched';
    
    if (localStorage.getItem(PATCH_FLAG) === 'true') {
      console.log('[Cache Patch] ✅ Worker was already patched in a previous session. Skipping...');
      window.postMessage({ type: 'CACHE_PATCH_RESULT', success: true, alreadyPatched: true }, '*');
      return;
    }
    
    console.log('[Cache Patch] Waiting for worker to be cached...');
    
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const success = await patchCachedWorker();
      
      if (success) {
        console.log('[Cache Patch] 🎉 All done! Worker is patched and ready.');
        
        // Verify the patch is in cache and set the flag
        try {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            
            for (const request of requests) {
              if (request.url.includes('6854') && request.url.includes('.js')) {
                const response = await cache.match(request);
                const code = await response.text();
                
                if (isAlreadyPatched(code)) {
                  // Mark as patched so we don't run this again
                  localStorage.setItem(PATCH_FLAG, 'true');
                  console.log('[Cache Patch] ✅ Patch confirmed and saved to localStorage');
                  console.log('[Cache Patch] ⚠️  Please reload the page MANUALLY to use the patched worker.');
                  console.log('[Cache Patch] 💡 TIP: To re-patch, run: localStorage.removeItem("telegram_worker_patched")');
                  
                  // Signal success to content script
                  window.postMessage({ type: 'CACHE_PATCH_RESULT', success: true }, '*');
                  return;
                }
              }
            }
          }
        } catch (error) {
          console.error('[Cache Patch] Error verifying patch:', error);
        }
        
        window.postMessage({ type: 'CACHE_PATCH_RESULT', success: true }, '*');
        return;
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    }
    
    console.warn('[Cache Patch] ⚠️  Worker not found in cache after', MAX_ATTEMPTS, 'attempts');
    console.log('[Cache Patch] This is normal on first load. The worker will be patched after it\'s cached.');
    window.postMessage({ type: 'CACHE_PATCH_RESULT', success: false, error: 'Worker not found in cache' }, '*');
  }
  
  // Start the patching process
  waitAndPatch();
  
})();

