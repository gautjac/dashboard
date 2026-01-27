// Content script for detecting X/Twitter bookmarks
// Debug mode - set to true to see console logs
const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log('[DD Bookmarks]', ...args);
}

// Track processed tweets to avoid duplicates
const processedTweets = new Set();

// Extract tweet data from a tweet article element
function extractTweetData(tweetElement) {
  try {
    // Find the tweet link to get the tweet ID - try multiple selectors
    let tweetLink = tweetElement.querySelector('a[href*="/status/"]');

    // Also check time element links (X sometimes uses these)
    if (!tweetLink) {
      tweetLink = tweetElement.querySelector('time')?.closest('a[href*="/status/"]');
    }

    if (!tweetLink) {
      log('No tweet link found in element');
      return null;
    }

    const href = tweetLink.getAttribute('href');
    const match = href.match(/\/([^/]+)\/status\/(\d+)/);
    if (!match) {
      log('Could not parse tweet URL:', href);
      return null;
    }

    const authorHandle = match[1];
    const tweetId = match[2];

    // Skip if already processed
    if (processedTweets.has(tweetId)) {
      return null;
    }

    // Get author name - try multiple selectors
    let authorName = authorHandle;
    const authorSelectors = [
      '[data-testid="User-Name"] a span',
      '[data-testid="User-Name"] span span',
      'a[role="link"] span span'
    ];
    for (const selector of authorSelectors) {
      const el = tweetElement.querySelector(selector);
      if (el?.textContent && el.textContent.trim() && !el.textContent.startsWith('@')) {
        authorName = el.textContent.trim();
        break;
      }
    }

    // Get tweet text - try multiple selectors
    let tweetText = '';
    const textSelectors = [
      '[data-testid="tweetText"]',
      '[lang] > span',
      'div[dir="auto"] span'
    ];
    for (const selector of textSelectors) {
      const el = tweetElement.querySelector(selector);
      if (el?.textContent) {
        tweetText = el.textContent;
        break;
      }
    }

    // Get media URLs (images, videos)
    const mediaUrls = [];
    const mediaSelectors = [
      '[data-testid="tweetPhoto"] img',
      'img[src*="pbs.twimg.com"]',
      'video source',
      '[data-testid="videoPlayer"] video'
    ];
    mediaSelectors.forEach(selector => {
      tweetElement.querySelectorAll(selector).forEach(el => {
        const src = el.src || el.getAttribute('src');
        if (src && !mediaUrls.includes(src)) mediaUrls.push(src);
      });
    });

    log('Extracted tweet:', { tweetId, authorHandle, authorName, textLength: tweetText.length });

    return {
      tweetId,
      tweetUrl: `https://x.com/${authorHandle}/status/${tweetId}`,
      authorHandle,
      authorName,
      tweetText,
      mediaUrls
    };
  } catch (error) {
    console.error('[DD Bookmarks] Error extracting tweet data:', error);
    return null;
  }
}

// Find the tweet element that contains a given element
function findTweetElement(element) {
  let current = element;
  while (current && current !== document.body) {
    // Try multiple ways to identify a tweet container
    if (current.tagName === 'ARTICLE') {
      if (current.getAttribute('data-testid') === 'tweet' ||
          current.getAttribute('role') === 'article' ||
          current.querySelector('a[href*="/status/"]')) {
        return current;
      }
    }
    current = current.parentElement;
  }
  return null;
}

// Handle bookmark button click
function handleBookmarkClick(event) {
  const target = event.target;

  // Check if this is a bookmark button or its child - try multiple selectors
  const bookmarkButton = target.closest('[data-testid="bookmark"]') ||
                         target.closest('[data-testid="removeBookmark"]') ||
                         target.closest('[aria-label*="Bookmark"]') ||
                         target.closest('[aria-label*="bookmark"]') ||
                         target.closest('button[data-testid*="bookmark"]');

  if (!bookmarkButton) return;

  log('Bookmark button clicked!', bookmarkButton);

  // Find the tweet element
  const tweetElement = findTweetElement(bookmarkButton);
  if (!tweetElement) {
    log('Could not find parent tweet element');
    return;
  }

  // Small delay to let the bookmark state change
  setTimeout(() => {
    // Check if it's now bookmarked - try multiple indicators
    const isBookmarked = tweetElement.querySelector('[data-testid="removeBookmark"]') ||
                         tweetElement.querySelector('[aria-label*="Remove from Bookmarks"]') ||
                         bookmarkButton.getAttribute('data-testid') === 'removeBookmark';

    log('Bookmark state after click:', { isBookmarked: !!isBookmarked });

    if (isBookmarked) {
      const tweetData = extractTweetData(tweetElement);
      if (tweetData) {
        processedTweets.add(tweetData.tweetId);

        // Send to background script
        chrome.runtime.sendMessage({
          type: 'BOOKMARK_DETECTED',
          bookmark: tweetData
        }, (response) => {
          if (chrome.runtime.lastError) {
            log('Error sending to background:', chrome.runtime.lastError);
          } else {
            log('Sent to background, response:', response);
          }
        });

        log('Bookmark detected and sent:', tweetData.tweetId);
      }
    }
  }, 200);
}

// Scan bookmarks page for all bookmarked tweets
function scanBookmarksPage() {
  if (!window.location.pathname.includes('/i/bookmarks')) {
    log('Not on bookmarks page, skipping scan');
    return;
  }

  log('Scanning bookmarks page...');

  // Try multiple selectors to find tweets
  let tweets = document.querySelectorAll('article[data-testid="tweet"]');
  if (tweets.length === 0) {
    tweets = document.querySelectorAll('article[role="article"]');
  }
  if (tweets.length === 0) {
    tweets = document.querySelectorAll('article');
  }

  log('Found', tweets.length, 'potential tweet elements');

  const bookmarks = [];

  tweets.forEach(tweetElement => {
    const tweetData = extractTweetData(tweetElement);
    if (tweetData) {
      processedTweets.add(tweetData.tweetId);
      bookmarks.push(tweetData);
    }
  });

  if (bookmarks.length > 0) {
    chrome.runtime.sendMessage({
      type: 'BOOKMARKS_BATCH',
      bookmarks
    }, (response) => {
      if (chrome.runtime.lastError) {
        log('Error sending batch:', chrome.runtime.lastError);
      } else {
        log('Batch sent, response:', response);
      }
    });
    log('Scanned and sent', bookmarks.length, 'bookmarks from page');
  } else {
    log('No bookmarks extracted from page');
  }
}

// Observe for new tweets on bookmarks page
function observeBookmarksPage() {
  if (!window.location.pathname.includes('/i/bookmarks')) return;

  const observer = new MutationObserver((mutations) => {
    let hasNewTweets = false;

    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tweets = node.querySelectorAll?.('article[data-testid="tweet"]') || [];
          if (tweets.length > 0 || node.matches?.('article[data-testid="tweet"]')) {
            hasNewTweets = true;
          }
        }
      });
    });

    if (hasNewTweets) {
      // Debounce scanning
      clearTimeout(window.scanTimeout);
      window.scanTimeout = setTimeout(scanBookmarksPage, 500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize
function init() {
  log('Initializing content script on:', window.location.href);

  // Listen for bookmark button clicks on the entire document
  document.addEventListener('click', handleBookmarkClick, true);

  // Also listen on capture phase to catch early
  document.addEventListener('mousedown', (e) => {
    const btn = e.target.closest('[data-testid="bookmark"], [data-testid="removeBookmark"]');
    if (btn) {
      log('Mousedown on bookmark button detected');
    }
  }, true);

  // If on bookmarks page, scan existing bookmarks
  if (window.location.pathname.includes('/i/bookmarks')) {
    log('On bookmarks page, will scan after delay');
    // Wait for page to load
    setTimeout(() => {
      scanBookmarksPage();
      observeBookmarksPage();
    }, 3000);
  }

  // Listen for navigation changes (X uses client-side routing)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      log('URL changed from', lastUrl, 'to', url);
      lastUrl = url;
      if (url.includes('/i/bookmarks')) {
        log('Navigated to bookmarks page');
        setTimeout(() => {
          scanBookmarksPage();
          observeBookmarksPage();
        }, 3000);
      }
    }
  }).observe(document, { subtree: true, childList: true });

  // Log that we're active
  log('Content script initialized and listening');

  // Also check if extension can communicate with background
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (chrome.runtime.lastError) {
      log('Cannot communicate with background script:', chrome.runtime.lastError);
    } else {
      log('Background script status:', response);
    }
  });
}

// Start
init();
