// This script runs in the page context to access Telegram's webpack modules
(function() {
  console.log('[Disappearing Photos] Injecting...');
  
  const modules = window.webpackChunktelegram_t;
  
  if (!modules) {
    console.error('[Disappearing Photos] Webpack modules not found!');
    return;
  }
  
  // Expose Telegram's internal functions
  modules.push([
    ['exposeActions'],
    {},
    (require) => {
      const cache = require.c;
      
      for (let id in cache) {
        const exp = cache[id].exports;
        
        // Find the module that exports getActions, getGlobal, setGlobal
        if (exp && exp.getActions && exp.getGlobal && exp.setGlobal) {
          window.__TG_GET_ACTIONS__ = exp.getActions;
          window.__TG_GET_GLOBAL__ = exp.getGlobal;
          window.__TG_SET_GLOBAL__ = exp.setGlobal;
          console.log('[Disappearing Photos] ✅ Exposed Telegram functions!');
          
          // Signal that functions are ready
          window.dispatchEvent(new CustomEvent('telegramFunctionsReady'));
          break;
        }
      }
    }
  ]);
  
  // Helper function to send disappearing photo
  window.sendDisappearingPhoto = async function(file, ttlSeconds = 10) {
    try {
      const actions = window.__TG_GET_ACTIONS__();
      const global = window.__TG_GET_GLOBAL__();
      
      if (!actions || !global) {
        throw new Error('Telegram functions not available');
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
  
  console.log('[Disappearing Photos] ✅ Ready! Use window.sendDisappearingPhoto(file) to send.');
})();

