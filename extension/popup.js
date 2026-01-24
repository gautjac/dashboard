// Popup script for Daily Dashboard X Bookmarks extension

document.addEventListener('DOMContentLoaded', async () => {
  const statusIcon = document.getElementById('status-icon');
  const statusMessage = document.getElementById('status-message');
  const statusDetail = document.getElementById('status-detail');
  const statsEl = document.getElementById('stats');
  const syncCount = document.getElementById('sync-count');
  const lastSync = document.getElementById('last-sync');
  const errorEl = document.getElementById('error');
  const errorMessage = document.getElementById('error-message');
  const syncBtn = document.getElementById('sync-btn');
  const settingsBtn = document.getElementById('settings-btn');

  // Get status from background script
  async function updateStatus() {
    try {
      const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });

      if (!status.configured) {
        statusIcon.className = 'status-icon warning';
        statusMessage.textContent = 'Not configured';
        statusDetail.textContent = 'Add your API key in settings';
        syncBtn.disabled = true;
        errorEl.classList.add('hidden');
        statsEl.classList.add('hidden');
      } else if (!status.enabled) {
        statusIcon.className = 'status-icon disabled';
        statusMessage.textContent = 'Disabled';
        statusDetail.textContent = 'Enable in settings';
        syncBtn.disabled = true;
        errorEl.classList.add('hidden');
        statsEl.classList.add('hidden');
      } else {
        statusIcon.className = 'status-icon connected';
        statusMessage.textContent = 'Connected';
        statusDetail.textContent = status.queueSize > 0
          ? `${status.queueSize} pending`
          : 'Ready to sync';
        syncBtn.disabled = false;
        statsEl.classList.remove('hidden');

        // Update stats
        syncCount.textContent = status.syncCount || 0;

        if (status.lastSync) {
          const date = new Date(status.lastSync);
          const now = new Date();
          const diff = now - date;

          if (diff < 60000) {
            lastSync.textContent = 'Just now';
          } else if (diff < 3600000) {
            lastSync.textContent = `${Math.floor(diff / 60000)}m ago`;
          } else if (diff < 86400000) {
            lastSync.textContent = `${Math.floor(diff / 3600000)}h ago`;
          } else {
            lastSync.textContent = date.toLocaleDateString();
          }
        } else {
          lastSync.textContent = 'Never';
        }

        // Show error if any
        if (status.lastError) {
          errorEl.classList.remove('hidden');
          errorMessage.textContent = status.lastError;
        } else {
          errorEl.classList.add('hidden');
        }
      }
    } catch (error) {
      statusIcon.className = 'status-icon error';
      statusMessage.textContent = 'Error';
      statusDetail.textContent = error.message;
    }
  }

  // Sync button handler
  syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true;
    syncBtn.textContent = 'Syncing...';

    try {
      await chrome.runtime.sendMessage({ type: 'SYNC_NOW' });
    } catch (error) {
      console.error('Sync failed:', error);
    }

    syncBtn.textContent = 'Sync Now';
    await updateStatus();
    syncBtn.disabled = false;
  });

  // Settings button handler
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Initial status check
  await updateStatus();
});
