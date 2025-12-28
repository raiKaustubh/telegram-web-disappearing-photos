/**
 * Helper script to send disappearing photos
 * Listens for messages from content script and calls sendDisappearingPhoto
 */
(function() {
  console.log('[Send Helper] Loaded and listening for send requests...');
  
  window.addEventListener('message', async (event) => {
    // Only accept messages from same origin
    if (event.source !== window) return;
    
    if (event.data.type === 'SEND_DISAPPEARING_PHOTO_REQUEST') {
      console.log('[Send Helper] Received send request');
      
      try {
        let blob;
        
        // Check if it's a URL or base64 data
        if (event.data.imageUrl) {
          // Fetch from URL
          console.log('[Send Helper] Fetching image from URL:', event.data.imageUrl);
          const response = await fetch(event.data.imageUrl);
          blob = await response.blob();
        } else if (event.data.blobData) {
          // Convert array buffer back to blob
          console.log('[Send Helper] Converting blob data');
          blob = new Blob([new Uint8Array(event.data.blobData)], { type: event.data.mimeType });
        } else {
          throw new Error('No image data provided');
        }
        
        // Check if sendDisappearingPhoto function exists
        if (typeof window.sendDisappearingPhoto !== 'function') {
          throw new Error('sendDisappearingPhoto function not found. Please initialize the extension first.');
        }
        
        // Send the photo
        await window.sendDisappearingPhoto(blob, event.data.ttl);
        
        // Signal success
        window.postMessage({ 
          type: 'DISAPPEARING_PHOTO_RESULT', 
          success: true 
        }, '*');
      } catch (error) {
        console.error('[Send Helper] Error:', error);
        window.postMessage({ 
          type: 'DISAPPEARING_PHOTO_RESULT', 
          success: false, 
          error: error.message 
        }, '*');
      }
    }
  });
})();

