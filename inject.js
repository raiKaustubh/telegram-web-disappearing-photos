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
                  return;
                }
              }
            }
          }
        } catch (error) {
          console.error('[Cache Patch] Error verifying patch:', error);
        }
        
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

/**
 * Telegram Actions Integration
 * Access Telegram's internal state and actions via webpack modules
 */
(function() {
  console.log('[Disappearing Photos] Starting Telegram integration...');
  
  // Wait for webpack to be available
  function init() {
    if (!window.webpackChunktelegram_t) {
      console.log('[Disappearing Photos] Waiting for webpack...');
      setTimeout(init, 100);
      return;
    }
    
    console.log('[Disappearing Photos] Webpack found! Waiting for Telegram to initialize...');
    
    // Wait a bit for Telegram to load its modules
    setTimeout(searchModules, 2000);
  }
  
  function searchModules() {
    console.log('[Disappearing Photos] Searching for Telegram modules...');
    
    // Get the webpack require function
    const webpackChunk = window.webpackChunktelegram_t;
    let requireFunc = null;
    
    // Push a dummy module to get access to require
    webpackChunk.push([
      ['getRequire'],
      {},
      (req) => {
        requireFunc = req;
      }
    ]);
    
    if (!requireFunc || !requireFunc.m) {
      console.error('[Disappearing Photos] Could not access require function');
      return;
    }
    
    console.log('[Disappearing Photos] Searching through', Object.keys(requireFunc.m).length, 'modules...');
    
    // Loop through all module IDs and execute them
    let foundModule = null;
    let foundModuleId = null;
    
    for (const id in requireFunc.m) {
      try {
        // Execute the module to get its exports
        const exports = requireFunc(id);
        
        if (!exports || typeof exports !== 'object') continue;
        
        // Check if this module exports 'cl' function (the pattern we found)
        if (exports.cl && typeof exports.cl === 'function') {
          try {
            const result = exports.cl();
            
            // Check if cl() returns the object with our functions
            if (result && 
                typeof result.getActions === 'function' &&
                typeof result.getGlobal === 'function' &&
                typeof result.setGlobal === 'function') {
              foundModule = result;
              foundModuleId = id;
              console.log('[Disappearing Photos] ✅ Found Telegram module:', id);
              break;
            }
          } catch (e) {
            // cl() might error, skip
          }
        }
      } catch (e) {
        // Skip modules that error when executed
      }
    }
    
    if (foundModule) {
      // Expose the functions globally
      window.__TG_GET_ACTIONS__ = foundModule.getActions;
      window.__TG_GET_GLOBAL__ = foundModule.getGlobal;
      window.__TG_SET_GLOBAL__ = foundModule.setGlobal;
      console.log('[Disappearing Photos] ✅ Telegram functions exposed!');
      
      // Create the helper function
      createSendFunction();
    } else {
      console.error('[Disappearing Photos] ❌ Could not find Telegram module');
      window.__TG_REQUIRE__ = requireFunc;
    }
  }
  
  function createSendFunction() {
    /**
     * Send a disappearing photo
     * @param {Blob} blob - The image blob to send
     * @param {number} ttlSeconds - Time to live in seconds (default: 10)
     * @returns {Promise<boolean>} - Success status
     */
    window.sendDisappearingPhoto = async function(blob, ttlSeconds = 10) {
      try {
        if (!window.__TG_GET_ACTIONS__) {
          throw new Error('Telegram functions not available. Extension not initialized properly.');
        }
        
        const actions = window.__TG_GET_ACTIONS__();
        const global = window.__TG_GET_GLOBAL__();
        
        if (!actions || !global) {
          throw new Error('Could not get actions or global state');
        }
        
        console.log('[Disappearing Photos] Preparing to send...');
        
        // Get current chat info from the first tab
        const firstTabId = Object.keys(global.byTabId || {})[0];
        if (!firstTabId) {
          throw new Error('No tabs found');
        }

        const firstTab = global.byTabId[firstTabId];
        const messageLists = firstTab?.messageLists;
        
        if (!messageLists) {
          throw new Error('No message lists found');
        }

        // Get the first available message list
        const messageListKeys = Object.keys(messageLists);
        
        if (messageListKeys.length === 0) {
          throw new Error('No active message lists. Please open a chat first.');
        }

        const currentMessageList = messageLists[messageListKeys[0]];
        const { chatId, threadId, type } = currentMessageList;
        
        if (!chatId) {
          throw new Error('No chat ID found');
        }
        
        console.log('[Disappearing Photos] Target chat:', chatId);
        console.log('[Disappearing Photos] TTL:', ttlSeconds, 'seconds');
        
        // Handle blob - create blob URL and get dimensions
        const blobUrl = URL.createObjectURL(blob);
        
        // Get image dimensions from blob
        const img = new Image();
        const dimensions = await new Promise((resolve) => {
          img.onload = () => resolve({ width: img.width, height: img.height });
          img.onerror = () => resolve({ width: 1920, height: 1080 }); // fallback
          img.src = blobUrl;
        });
        
        console.log('[Disappearing Photos] Image dimensions:', dimensions);
        
        // Create attachment with ttlSeconds
        // The patched worker will include ttlSeconds in InputMediaUploadedPhoto
        const attachment = {
          filename: 'photo.jpg',
          blobUrl: blobUrl,
          mimeType: blob.type || 'image/jpeg',
          ttlSeconds: ttlSeconds,
          quick: dimensions,
          blob: blob
        };
        
        console.log('[Disappearing Photos] Sending message...');
        
        await actions.sendMessage({
          messageList: { chatId, threadId, type },
          text: '',
          entities: [],
          attachments: [attachment]
        });
        
        console.log('[Disappearing Photos] ✅ Sent successfully with TTL:', ttlSeconds, 'seconds!');
        
        // Clean up blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        
        return true;
      } catch (error) {
        console.error('[Disappearing Photos] ❌ Error:', error);
        throw error;
      }
    };
    
    console.log('[Disappearing Photos] ✅ Ready! Use: window.sendDisappearingPhoto(blob, ttlSeconds)');
    console.log('[Disappearing Photos] 💡 Example: await sendDisappearingPhoto(myBlob, 10)');
  }
  
  // Start initialization
  init();
})();


