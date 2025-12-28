/**
 * Deinitialize helper - removes the patch flag from localStorage
 */
(function() {
  console.log('[Deinit Helper] Removing patch flag...');
  localStorage.removeItem('telegram_worker_patched');
  console.log('[Deinit Helper] ✅ Removed patch flag from localStorage');
  
  // Signal completion
  window.postMessage({ type: 'DEINIT_COMPLETE', success: true }, '*');
})();

