console.log('[Disappearing Photos] Background script loaded');

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Disappearing Photos] Extension installed successfully!');
  console.log('[Disappearing Photos] Worker patching is handled by declarativeNetRequest');
  console.log('[Disappearing Photos] All requests to 6854*.js will be redirected to patched-worker.js');
});

// Check if declarativeNetRequest rules are active
chrome.declarativeNetRequest.getDynamicRules((rules) => {
  console.log('[Disappearing Photos] Dynamic rules:', rules);
});

chrome.declarativeNetRequest.getEnabledRulesets((rulesets) => {
  console.log('[Disappearing Photos] Enabled rulesets:', rulesets);
});

// Log when requests are redirected
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener?.((details) => {
  console.log('[Disappearing Photos] Rule matched!', details);
});
