// Direct approach - access webpack modules by executing them
(function() {
  console.log('[Disappearing Photos] Starting injection...');
  
  // Wait for webpack to be available
  function init() {
    if (!window.webpackChunktelegram_t) {
      console.log('[Disappearing Photos] Waiting for webpack...');
      setTimeout(init, 100);
      return;
    }
    
    console.log('[Disappearing Photos] Webpack found! Waiting for Telegram to initialize...');
    
    // Wait a bit for Telegram to load its modules
    setTimeout(searchModules,2000);
  }
  
  function searchModules() {
    console.log('[Disappearing Photos] Starting search...');
    
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
              console.log('[Disappearing Photos] ✅ Found in module:', id, 'via cl() export');
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
      console.log('[Disappearing Photos] ✅ Functions exposed!');
    } else {
      console.error('[Disappearing Photos] ❌ Could not find module with getActions, getGlobal, setGlobal');
      // Store require for manual debugging
      window.__TG_REQUIRE__ = requireFunc;
      return;
    }
    
    // Create the helper function to send disappearing photos
    window.sendDisappearingPhoto = async function(blob, ttlSeconds = 10, mimeType = 'image/png') {
      try {
        if (!window.__TG_GET_ACTIONS__) {
          throw new Error('Telegram functions not available. Extension not initialized properly.');
        }
        
        const actions = window.__TG_GET_ACTIONS__();
        const global = window.__TG_GET_GLOBAL__();
        
        if (!actions || !global) {
          throw new Error('Could not get actions or global state');
        }
        
        console.log('[Disappearing Photos] Global state keys:', Object.keys(global));
        
        // Get current chat info from the first tab
        const firstTabId = Object.keys(global.byTabId || {})[0];
        if (!firstTabId) {
          throw new Error('No tabs found');
        }

        const firstTab = global.byTabId[firstTabId];
        console.log('[Disappearing Photos] First tab keys:', Object.keys(firstTab || {}));
        console.log('[Disappearing Photos] Message lists:', firstTab?.messageLists);
        
        const messageLists = firstTab?.messageLists;
        
        if (!messageLists) {
          throw new Error('No message lists found');
        }

        // Get the first available message list
        const messageListKeys = Object.keys(messageLists);
        console.log('[Disappearing Photos] Available message list keys:', messageListKeys);
        
        if (messageListKeys.length === 0) {
          throw new Error('No active message lists. Please open a chat first.');
        }

        const currentMessageList = messageLists[messageListKeys[0]];
        console.log('[Disappearing Photos] Current message list:', currentMessageList);
        
        const { chatId, threadId, type } = currentMessageList;
        
        if (!chatId) {
          throw new Error('No chat ID found');
        }
        
        console.log('[Disappearing Photos] Using chat:', { chatId, threadId, type });
        
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
        
        const attachment = {
          filename: 'photo',
          blobUrl: blobUrl,
          mimeType: mimeType,  // Use GIF mime type to force document path with ttlSeconds
          ttlSeconds: ttlSeconds,
          quick: dimensions
        };
        
        console.log('[Disappearing Photos] Sending with ttlSeconds:', ttlSeconds);
        
        await actions.sendMessage({
          messageList: { chatId, threadId, type },
          text: '',
          entities: [],
          attachments: [attachment]
        });
        
        console.log('[Disappearing Photos] ✅ Sent successfully!');
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        
        return true;
      } catch (error) {
        console.error('[Disappearing Photos] Error:', error);
        throw error;
      }
    };
    
    console.log('[Disappearing Photos] ✅ Ready! Use window.sendDisappearingPhoto(file, 10)');
  }
  
  // Start initialization
  init();
})();

