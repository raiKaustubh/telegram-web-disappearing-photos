/**
 * Telegram Disappearing Photos - Cache Patcher
 * 
 * This script patches the cached worker file to include ttlSeconds support for photos
 */

(async function() {
  'use strict';
  
  console.log('[Cache Patch] Initializing...');
  
  const WORKER_URL = 'https://web.telegram.org/a/6854.4f54ccf213dac788f56b.js';
  const CHECK_INTERVAL = 500; // Check every 500ms
  const MAX_ATTEMPTS = 60; // Try for 30 seconds
  
  /**
   * Patch the worker code to include ttlSeconds in InputMediaUploadedPhoto
   */
  function patchCode(code) {
    console.log('[Cache Patch] Patching code...');
    
    let patchCount = 0;
    
    // Pattern for MINIFIED code:
    // new Ke.InputMediaUploadedPhoto({file:_,spoiler:l})
    const patched = code.replace(
      /new (\w+)\.InputMediaUploadedPhoto\(\{file:(\w+),spoiler:(\w+)\}\)/g,
      (match, className, fileVar, spoilerVar) => {
        patchCount++;
        console.log(`[Cache Patch] Found pattern (match ${patchCount}):`, match);
        return `new ${className}.InputMediaUploadedPhoto({file:${fileVar},spoiler:${spoilerVar},ttlSeconds:ttlSeconds})`;
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
              // Get the original code
              const originalCode = await cachedResponse.text();
              console.log('[Cache Patch] Original code size:', originalCode.length);
              
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
    console.log('[Cache Patch] Waiting for worker to be cached...');
    
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const success = await patchCachedWorker();
      
      if (success) {
        console.log('[Cache Patch] 🎉 All done! Worker is patched and ready.');
        console.log('[Cache Patch] ✅ Worker will be used on next page load.');
        console.log('[Cache Patch] ⚠️  Please reload the page manually to use the patched worker.');
        
        return;
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    }
    
    console.warn('[Cache Patch] ⚠️  Worker not found in cache after', MAX_ATTEMPTS, 'attempts');
    console.log('[Cache Patch] This is normal on first load. The worker will be patched after it\'s cached.');
  }
  
  // Start the patching process
  waitAndPatch();
  
})();
