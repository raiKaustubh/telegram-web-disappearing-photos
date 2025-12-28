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
