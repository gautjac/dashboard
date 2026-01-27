// Background service worker for Daily Dashboard X Bookmarks extension

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[DD Background]', ...args);
}

const DEFAULT_API_URL = 'https://dashboard-jac.netlify.app';

// Queue for batching bookmark uploads
let bookmarkQueue = [];
let uploadTimeout = null;

// Get settings from storage
async function getSettings() {
  const result = await chrome.storage.sync.get(['apiKey', 'apiUrl', 'enabled']);
  return {
    apiKey: result.apiKey || '',
    apiUrl: result.apiUrl || DEFAULT_API_URL,
    enabled: result.enabled !== false
  };
}

// Upload bookmarks to the API
async function uploadBookmarks(bookmarks) {
  log('uploadBookmarks called with', bookmarks.length, 'bookmarks');
  const settings = await getSettings();

  if (!settings.apiKey || !settings.enabled) {
    log('Extension not configured or disabled', { hasKey: !!settings.apiKey, enabled: settings.enabled });
    return { success: false, error: 'Not configured' };
  }

  log('Uploading to:', `${settings.apiUrl}/.netlify/functions/extension-bookmarks`);
  log('API Key prefix:', settings.apiKey.substring(0, 10) + '...');

  try {
    const response = await fetch(`${settings.apiUrl}/.netlify/functions/extension-bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': settings.apiKey
      },
      body: JSON.stringify(bookmarks)
    });

    log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      log('Error response:', errorText);
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { error: errorText };
      }
      throw new Error(error.error || `Upload failed: ${response.status}`);
    }

    const data = await response.json();
    log('Upload successful:', data);

    // Update badge to show success
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);

    return { success: true, added: data.added };
  } catch (error) {
    log('Failed to upload bookmarks:', error);

    // Update badge to show error
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });

    return { success: false, error: error.message };
  }
}

// Process the bookmark queue
async function processQueue() {
  if (bookmarkQueue.length === 0) return;

  const bookmarksToUpload = [...bookmarkQueue];
  bookmarkQueue = [];

  const result = await uploadBookmarks(bookmarksToUpload);

  // Store sync stats
  const stats = await chrome.storage.local.get(['syncCount', 'lastSync']);
  await chrome.storage.local.set({
    syncCount: (stats.syncCount || 0) + (result.success ? bookmarksToUpload.length : 0),
    lastSync: result.success ? new Date().toISOString() : stats.lastSync,
    lastError: result.success ? null : result.error
  });

  return result;
}

// Add bookmark to queue
function queueBookmark(bookmark) {
  if (!bookmark || !bookmark.tweetId) {
    log('Invalid bookmark, skipping:', bookmark);
    return;
  }

  // Check for duplicates in queue
  const exists = bookmarkQueue.some(b => b.tweetId === bookmark.tweetId);
  if (!exists) {
    bookmarkQueue.push(bookmark);
    log('Added to queue:', bookmark.tweetId, '- Queue size:', bookmarkQueue.length);
  } else {
    log('Duplicate, already in queue:', bookmark.tweetId);
  }

  // Debounce: wait 1 second for more bookmarks before uploading
  if (uploadTimeout) {
    clearTimeout(uploadTimeout);
  }
  uploadTimeout = setTimeout(() => {
    log('Debounce timer fired, processing queue');
    processQueue();
  }, 1000);
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('Received message:', message.type, 'from:', sender.tab?.url || 'popup/options');

  if (message.type === 'BOOKMARK_DETECTED') {
    log('Bookmark detected:', message.bookmark?.tweetId);
    queueBookmark(message.bookmark);
    sendResponse({ success: true, queued: true });
  } else if (message.type === 'BOOKMARKS_BATCH') {
    log('Batch of', message.bookmarks?.length, 'bookmarks received');
    message.bookmarks.forEach(bookmark => queueBookmark(bookmark));
    sendResponse({ success: true, queued: message.bookmarks.length });
  } else if (message.type === 'SYNC_NOW') {
    log('Manual sync requested');
    processQueue().then(result => {
      log('Sync result:', result);
      sendResponse(result);
    });
    return true; // Keep channel open for async response
  } else if (message.type === 'GET_STATUS') {
    chrome.storage.local.get(['syncCount', 'lastSync', 'lastError']).then(stats => {
      getSettings().then(settings => {
        const status = {
          configured: Boolean(settings.apiKey),
          enabled: settings.enabled,
          syncCount: stats.syncCount || 0,
          lastSync: stats.lastSync,
          lastError: stats.lastError,
          queueSize: bookmarkQueue.length
        };
        log('Returning status:', status);
        sendResponse(status);
      });
    });
    return true; // Keep channel open for async response
  }
  return false;
});

// Initialize
chrome.runtime.onInstalled.addListener((details) => {
  log('Extension installed/updated:', details.reason);
  // Check initial settings
  getSettings().then(settings => {
    log('Initial settings:', { hasKey: !!settings.apiKey, enabled: settings.enabled });
  });
});

// Also log when service worker starts
log('Background service worker started');
