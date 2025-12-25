console.log('[Disappearing Photos] Background service worker loaded');

// Simple background script - main logic is in inject.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Disappearing Photos] Extension installed!');
  console.log('[Disappearing Photos] Worker patching via Cache API');
});
