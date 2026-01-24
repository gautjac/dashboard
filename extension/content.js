// Content script for detecting X/Twitter bookmarks

// Track processed tweets to avoid duplicates
const processedTweets = new Set();

// Extract tweet data from a tweet article element
function extractTweetData(tweetElement) {
  try {
    // Find the tweet link to get the tweet ID
    const tweetLink = tweetElement.querySelector('a[href*="/status/"]');
    if (!tweetLink) return null;

    const href = tweetLink.getAttribute('href');
    const match = href.match(/\/([^/]+)\/status\/(\d+)/);
    if (!match) return null;

    const authorHandle = match[1];
    const tweetId = match[2];

    // Skip if already processed
    if (processedTweets.has(tweetId)) return null;

    // Get author name
    const authorNameEl = tweetElement.querySelector('[data-testid="User-Name"] a span');
    const authorName = authorNameEl ? authorNameEl.textContent : authorHandle;

    // Get tweet text
    const tweetTextEl = tweetElement.querySelector('[data-testid="tweetText"]');
    const tweetText = tweetTextEl ? tweetTextEl.textContent : '';

    // Get media URLs (images, videos)
    const mediaUrls = [];
    const mediaElements = tweetElement.querySelectorAll('[data-testid="tweetPhoto"] img, video source');
    mediaElements.forEach(el => {
      const src = el.src || el.getAttribute('src');
      if (src) mediaUrls.push(src);
    });

    return {
      tweetId,
      tweetUrl: `https://x.com/${authorHandle}/status/${tweetId}`,
      authorHandle,
      authorName,
      tweetText,
      mediaUrls
    };
  } catch (error) {
    console.error('Error extracting tweet data:', error);
    return null;
  }
}

// Find the tweet element that contains a given element
function findTweetElement(element) {
  let current = element;
  while (current && current !== document.body) {
    if (current.tagName === 'ARTICLE' && current.getAttribute('data-testid') === 'tweet') {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

// Handle bookmark button click
function handleBookmarkClick(event) {
  const target = event.target;

  // Check if this is a bookmark button or its child
  const bookmarkButton = target.closest('[data-testid="bookmark"]') ||
                         target.closest('[data-testid="removeBookmark"]');

  if (!bookmarkButton) return;

  // Find the tweet element
  const tweetElement = findTweetElement(bookmarkButton);
  if (!tweetElement) return;

  // Small delay to let the bookmark state change
  setTimeout(() => {
    // Check if it's now bookmarked (has removeBookmark testid)
    const isBookmarked = tweetElement.querySelector('[data-testid="removeBookmark"]');

    if (isBookmarked) {
      const tweetData = extractTweetData(tweetElement);
      if (tweetData) {
        processedTweets.add(tweetData.tweetId);

        // Send to background script
        chrome.runtime.sendMessage({
          type: 'BOOKMARK_DETECTED',
          bookmark: tweetData
        });

        console.log('Bookmark detected:', tweetData.tweetId);
      }
    }
  }, 100);
}

// Scan bookmarks page for all bookmarked tweets
function scanBookmarksPage() {
  if (!window.location.pathname.includes('/i/bookmarks')) return;

  const tweets = document.querySelectorAll('article[data-testid="tweet"]');
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
    });
    console.log('Scanned', bookmarks.length, 'bookmarks from page');
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
  // Listen for bookmark button clicks
  document.addEventListener('click', handleBookmarkClick, true);

  // If on bookmarks page, scan existing bookmarks
  if (window.location.pathname.includes('/i/bookmarks')) {
    // Wait for page to load
    setTimeout(() => {
      scanBookmarksPage();
      observeBookmarksPage();
    }, 2000);
  }

  // Listen for navigation changes (X uses client-side routing)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      if (url.includes('/i/bookmarks')) {
        setTimeout(() => {
          scanBookmarksPage();
          observeBookmarksPage();
        }, 2000);
      }
    }
  }).observe(document, { subtree: true, childList: true });

  console.log('Daily Dashboard X Bookmarks content script initialized');
}

// Start
init();
