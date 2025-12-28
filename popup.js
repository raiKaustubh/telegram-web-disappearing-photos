// Get DOM elements
const initBtn = document.getElementById('initBtn');
const deinitBtn = document.getElementById('deinitBtn');
const initStatus = document.getElementById('initStatus');
const ttlInput = document.getElementById('ttl');
const photoUrl = document.getElementById('photoUrl');
const sendBtn = document.getElementById('sendBtn');
const statusDiv = document.getElementById('status');
const quickOptions = document.querySelectorAll('.quick-option');

// Check initialization status on load
checkInitStatus();

// Handle deinitialization button
deinitBtn.addEventListener('click', async () => {
  try {
    deinitBtn.disabled = true;
    initStatus.textContent = 'Deinitializing...';
    initStatus.className = 'init-status';
    initStatus.style.display = 'block';
    
    // Query the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we're on Telegram Web
    if (!tab.url || !tab.url.includes('web.telegram.org')) {
      initStatus.textContent = '❌ Please open Telegram Web (web.telegram.org/a)';
      initStatus.className = 'init-status';
      deinitBtn.disabled = false;
      return;
    }
    
    // Send message to content script to deinitialize
    chrome.tabs.sendMessage(tab.id, {
      action: 'deinitializeExtension'
    }, (response) => {
      if (chrome.runtime.lastError) {
        initStatus.textContent = '❌ Please reload Telegram Web page and try again';
        initStatus.className = 'init-status';
        deinitBtn.disabled = false;
        console.error('Connection error:', chrome.runtime.lastError);
        return;
      }
      
      if (response && response.success) {
        initStatus.textContent = '✅ Extension deinitialized! Reload to re-patch.';
        initStatus.className = 'init-status';
        initBtn.disabled = false;
        localStorage.removeItem('extension_initialized');
      } else {
        initStatus.textContent = '❌ ' + (response?.error || 'Deinitialization failed');
        initStatus.className = 'init-status';
      }
      deinitBtn.disabled = false;
    });
    
  } catch (error) {
    initStatus.textContent = '❌ Error: ' + error.message;
    initStatus.className = 'init-status';
    deinitBtn.disabled = false;
  }
});

// Handle initialization button
initBtn.addEventListener('click', async () => {
  try {
    initBtn.disabled = true;
    initStatus.textContent = 'Initializing...';
    initStatus.className = 'init-status';
    initStatus.style.display = 'block';
    
    // Query the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we're on Telegram Web
    if (!tab.url || !tab.url.includes('web.telegram.org')) {
      initStatus.textContent = '❌ Please open Telegram Web (web.telegram.org/a)';
      initStatus.className = 'init-status';
      initBtn.disabled = false;
      return;
    }
    
    // Send message to content script to initialize
    chrome.tabs.sendMessage(tab.id, {
      action: 'initializeExtension'
    }, (response) => {
      if (chrome.runtime.lastError) {
        initStatus.textContent = '❌ Please reload Telegram Web page and try again';
        initStatus.className = 'init-status';
        initBtn.disabled = false;
        console.error('Connection error:', chrome.runtime.lastError);
        return;
      }
      
      if (response && response.success) {
        initStatus.textContent = '✅ Extension initialized! Please reload the page.';
        initStatus.className = 'init-status initialized';
        localStorage.setItem('extension_initialized', 'true');
      } else {
        initStatus.textContent = '❌ ' + (response?.error || 'Initialization failed');
        initStatus.className = 'init-status';
        initBtn.disabled = false;
      }
    });
    
  } catch (error) {
    initStatus.textContent = '❌ Error: ' + error.message;
    initStatus.className = 'init-status';
    initBtn.disabled = false;
  }
});

// Check if extension is already initialized
async function checkInitStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url || !tab.url.includes('web.telegram.org')) {
      initStatus.textContent = '⚠️ Open Telegram Web (web.telegram.org/a)';
      initStatus.style.display = 'block';
      initBtn.disabled = true;
      deinitBtn.disabled = true;
      return;
    }
    
    // Check with content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'checkInitStatus'
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not loaded - page needs reload
        initStatus.textContent = '⚠️ Please reload Telegram Web page first';
        initStatus.style.display = 'block';
        initBtn.disabled = true;
        deinitBtn.disabled = true;
        return;
      }
      
      if (response && response.initialized) {
        initStatus.textContent = '✅ Extension is initialized';
        initStatus.className = 'init-status initialized';
        initStatus.style.display = 'block';
        initBtn.disabled = true;
        deinitBtn.disabled = false;
      } else {
        initStatus.textContent = 'Click to initialize extension';
        initStatus.style.display = 'block';
        initBtn.disabled = false;
        deinitBtn.disabled = true;
      }
    });
  } catch (error) {
    console.error('Error checking init status:', error);
    initStatus.textContent = '❌ Error checking status';
    initStatus.style.display = 'block';
  }
}

// Handle quick TTL options
quickOptions.forEach(option => {
  option.addEventListener('click', () => {
    const ttl = option.getAttribute('data-ttl');
    ttlInput.value = ttl;
    
    // Update active state
    quickOptions.forEach(opt => opt.classList.remove('active'));
    option.classList.add('active');
  });
});

// Handle photo URL input
photoUrl.addEventListener('input', (e) => {
  const url = e.target.value.trim();
  if (url) {
    sendBtn.disabled = false;
  } else {
    sendBtn.disabled = true;
  }
});

// Handle send button click
sendBtn.addEventListener('click', async () => {
  const url = photoUrl.value.trim();
  
  if (!url) {
    showStatus('Please enter a photo URL', 'error');
    return;
  }
  
  const ttl = parseInt(ttlInput.value);
  if (isNaN(ttl) || ttl < 1 || ttl > 60) {
    showStatus('TTL must be between 1 and 60 seconds', 'error');
    return;
  }
  
  try {
    sendBtn.disabled = true;
    showStatus('Sending photo...', 'info');
    
    // Query the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we're on Telegram Web
    if (!tab.url || !tab.url.includes('web.telegram.org')) {
      showStatus('Please open Telegram Web (web.telegram.org/a)', 'error');
      sendBtn.disabled = false;
      return;
    }
    
    // Send message to content script to execute the function
    chrome.tabs.sendMessage(tab.id, {
      action: 'sendDisappearingPhoto',
      ttl: ttl,
      imageUrl: url
    }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('Please reload Telegram Web page and try again', 'error');
        sendBtn.disabled = false;
        console.error('Connection error:', chrome.runtime.lastError);
        return;
      }
      
      if (response && response.success) {
        showStatus(`✅ Photo sent successfully! (${ttl}s TTL)`, 'success');
        // Reset after success
        setTimeout(() => {
          photoUrl.value = '';
          sendBtn.disabled = true;
          statusDiv.style.display = 'none';
        }, 2000);
      } else {
        showStatus('Error: ' + (response?.error || 'Unknown error'), 'error');
        sendBtn.disabled = false;
      }
    });
    
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
    sendBtn.disabled = false;
  }
});

// Helper function to show status messages
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;
  statusDiv.style.display = 'block';
}
