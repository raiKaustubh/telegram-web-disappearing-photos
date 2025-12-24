console.log('[Disappearing Photos] Content script loaded - injecting IMMEDIATELY');

// Inject SYNCHRONOUSLY before any other scripts run
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
(document.head || document.documentElement || document).prepend(script);
