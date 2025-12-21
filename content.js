console.log('[Disappearing Photos] Content script loaded');

// Inject the script into the page context to access Telegram's webpack modules
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() {
  console.log('[Disappearing Photos] Inject script loaded');
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Extension is ready - functions are now available in the page context
window.addEventListener('telegramFunctionsReady', () => {
  console.log('[Disappearing Photos] ✅ Ready! Use window.sendDisappearingPhoto(file) from console.');
});