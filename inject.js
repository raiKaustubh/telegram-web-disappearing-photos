// This script runs in the page context to access Telegram's webpack modules
(function() {
  console.log('[Disappearing Photos] Injecting...');
  
  // Wait for webpack modules to be available
  function waitForWebpack() {
    return new Promise((resolve) => {
      if (window.webpackChunktelegram_t) {
        resolve(window.webpackChunktelegram_t);
      } else {
        const interval = setInterval(() => {
          if (window.webpackChunktelegram_t) {
            clearInterval(interval);
            resolve(window.webpackChunktelegram_t);
          }
        }, 100);
      }
    });
  }
  
  // Expose Telegram's internal functions
  async function exposeActions() {
    const modules = await waitForWebpack();
    console.log('[Disappearing Photos] Webpack modules found');
    
    return new Promise((resolve) => {
      // Store the require function for later use
      let requireFn = null;
      
      modules.push([
        ['exposeActions'],
        {},
        (require) => {
          requireFn = require;
          const cache = require.c;
          let found = false;
          let candidateModules = [];
          
          console.log('[Disappearing Photos] Searching', Object.keys(cache).length, 'modules...');
          
          for (let id in cache) {
            try {
              const module = cache[id];
              const exp = module?.exports;
              
              if (!exp || typeof exp !== 'object') continue;
              
              // Check if this module has any of our target functions
              const hasGetActions = typeof exp.getActions === 'function';
              const hasGetGlobal = typeof exp.getGlobal === 'function';
              const hasSetGlobal = typeof exp.setGlobal === 'function';
              
              if (hasGetActions || hasGetGlobal || hasSetGlobal) {
                candidateModules.push({
                  id,
                  hasGetActions,
                  hasGetGlobal,
                  hasSetGlobal,
                  keys: Object.keys(exp).slice(0, 10)
                });
              }
              
              // Find the module that exports ALL THREE
              if (hasGetActions && hasGetGlobal && hasSetGlobal) {
                window.__TG_GET_ACTIONS__ = exp.getActions;
                window.__TG_GET_GLOBAL__ = exp.getGlobal;
                window.__TG_SET_GLOBAL__ = exp.setGlobal;
                window.__TG_REQUIRE__ = requireFn;
                console.log('[Disappearing Photos] ✅ Found in module:', id);
                console.log('[Disappearing Photos] ✅ Exposed Telegram functions!');
                found = true;
                resolve(true);
                break;
              }
            } catch (e) {
              // Skip modules that error
            }
          }
          
          if (!found) {
            console.error('[Disappearing Photos] Could not find module with all 3 functions');
            console.log('[Disappearing Photos] Candidate modules:', candidateModules);
            
            // Store require anyway for manual debugging
            window.__TG_REQUIRE__ = requireFn;
            window.__TG_MODULE_CACHE__ = cache;
            
            console.log('[Disappearing Photos] Stored require and cache for manual inspection');
            console.log('[Disappearing Photos] Try: Object.keys(window.__TG_MODULE_CACHE__).length');
            
            resolve(false);
          }
        }
      ]);
    });
  }
  
  // Helper function to send disappearing photo
  window.sendDisappearingPhoto = async function(file, ttlSeconds = 10) {
    try {
      // Make sure functions are exposed
      if (!window.__TG_GET_ACTIONS__) {
        console.log('[Disappearing Photos] Functions not ready, exposing now...');
        await exposeActions();
      }
      
      const actions = window.__TG_GET_ACTIONS__();
      const global = window.__TG_GET_GLOBAL__();
      
      if (!actions || !global) {
        throw new Error('Telegram functions not available. Please refresh the page and try again.');
      }
      
      // Get current chat info
      const currentMessageList = global.messages?.currentMessageList;
      if (!currentMessageList) {
        throw new Error('No chat selected. Please open a chat first.');
      }
      
      const { chatId, threadId, type } = currentMessageList;
      
      if (!chatId) {
        throw new Error('No chat ID found');
      }
      
      // Create blob URL from file
      const blobUrl = URL.createObjectURL(file);
      
      // Create attachment object with ttlSeconds
      const attachment = {
        filename: file.name,
        blobUrl: blobUrl,
        mimeType: file.type,
        ttlSeconds: ttlSeconds, // This is the key parameter!
        quick: {
          width: 1920,
          height: 1080
        }
      };
      
      console.log('[Disappearing Photos] Sending with attachment:', attachment);
      
      // Call sendMessage action
      await actions.sendMessage({
        messageList: { chatId, threadId, type },
        text: '',
        entities: [],
        attachments: [attachment]
      });
      
      console.log('[Disappearing Photos] ✅ Sent successfully!');
      
      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      
      return true;
    } catch (error) {
      console.error('[Disappearing Photos] Error:', error);
      throw error;
    }
  };
  
  // Initialize on load
  (async function init() {
    const success = await exposeActions();
    if (success) {
      window.dispatchEvent(new CustomEvent('telegramFunctionsReady'));
      console.log('[Disappearing Photos] ✅ Ready! Use window.sendDisappearingPhoto(file) to send.');
    } else {
      console.error('[Disappearing Photos] Failed to initialize. Try refreshing the page.');
    }
  })();
})();

