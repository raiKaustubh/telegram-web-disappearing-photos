console.log('[Disappearing Photos] Background script loaded');

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Disappearing Photos] Extension installed successfully!');
});