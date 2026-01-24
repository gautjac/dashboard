// Background service worker for Daily Dashboard X Bookmarks extension

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
  const settings = await getSettings();

  if (!settings.apiKey || !settings.enabled) {
    console.log('Extension not configured or disabled');
    return { success: false, error: 'Not configured' };
  }

  try {
    const response = await fetch(`${settings.apiUrl}/.netlify/functions/extension-bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': settings.apiKey
      },
      body: JSON.stringify(bookmarks)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    const data = await response.json();

    // Update badge to show success
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);

    return { success: true, added: data.added };
  } catch (error) {
    console.error('Failed to upload bookmarks:', error);

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
  // Check for duplicates in queue
  const exists = bookmarkQueue.some(b => b.tweetId === bookmark.tweetId);
  if (!exists) {
    bookmarkQueue.push(bookmark);
  }

  // Debounce: wait 1 second for more bookmarks before uploading
  if (uploadTimeout) {
    clearTimeout(uploadTimeout);
  }
  uploadTimeout = setTimeout(processQueue, 1000);
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'BOOKMARK_DETECTED') {
    queueBookmark(message.bookmark);
    sendResponse({ success: true, queued: true });
  } else if (message.type === 'BOOKMARKS_BATCH') {
    message.bookmarks.forEach(bookmark => queueBookmark(bookmark));
    sendResponse({ success: true, queued: message.bookmarks.length });
  } else if (message.type === 'SYNC_NOW') {
    processQueue().then(result => sendResponse(result));
    return true; // Keep channel open for async response
  } else if (message.type === 'GET_STATUS') {
    chrome.storage.local.get(['syncCount', 'lastSync', 'lastError']).then(stats => {
      getSettings().then(settings => {
        sendResponse({
          configured: Boolean(settings.apiKey),
          enabled: settings.enabled,
          syncCount: stats.syncCount || 0,
          lastSync: stats.lastSync,
          lastError: stats.lastError,
          queueSize: bookmarkQueue.length
        });
      });
    });
    return true; // Keep channel open for async response
  }
  return false;
});

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('Daily Dashboard X Bookmarks extension installed');
});
