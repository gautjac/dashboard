// Options script for Daily Dashboard X Bookmarks extension

const DEFAULT_API_URL = 'https://dashboard-jac.netlify.app';

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('settings-form');
  const apiKeyInput = document.getElementById('api-key');
  const apiUrlInput = document.getElementById('api-url');
  const enabledInput = document.getElementById('enabled');
  const testBtn = document.getElementById('test-btn');
  const testResult = document.getElementById('test-result');

  // Load saved settings
  const settings = await chrome.storage.sync.get(['apiKey', 'apiUrl', 'enabled']);
  apiKeyInput.value = settings.apiKey || '';
  apiUrlInput.value = settings.apiUrl || DEFAULT_API_URL;
  enabledInput.checked = settings.enabled !== false;

  // Test connection
  testBtn.addEventListener('click', async () => {
    // Sanitize API key - remove any non-ASCII characters and whitespace
    const apiKey = apiKeyInput.value.trim().replace(/[^\x00-\x7F]/g, '');
    const apiUrl = apiUrlInput.value.trim() || DEFAULT_API_URL;

    // Update the input with sanitized value
    apiKeyInput.value = apiKey;

    if (!apiKey) {
      showTestResult('Please enter an API key', 'error');
      return;
    }

    if (!apiKey.startsWith('dd_')) {
      showTestResult('API key should start with "dd_"', 'error');
      return;
    }

    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    testResult.classList.add('hidden');

    try {
      const response = await fetch(`${apiUrl}/.netlify/functions/extension-bookmarks`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey
        }
      });

      if (response.ok) {
        const data = await response.json();
        showTestResult(`Connected! ${data.total} bookmarks synced.`, 'success');
      } else if (response.status === 401) {
        showTestResult('Invalid API key', 'error');
      } else {
        showTestResult(`Error: ${response.status}`, 'error');
      }
    } catch (error) {
      showTestResult(`Connection failed: ${error.message}`, 'error');
    }

    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
  });

  // Save settings
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Sanitize API key - remove any non-ASCII characters and whitespace
    const apiKey = apiKeyInput.value.trim().replace(/[^\x00-\x7F]/g, '');
    const apiUrl = apiUrlInput.value.trim() || DEFAULT_API_URL;
    const enabled = enabledInput.checked;

    // Update the input with sanitized value
    apiKeyInput.value = apiKey;

    await chrome.storage.sync.set({
      apiKey,
      apiUrl,
      enabled
    });

    showTestResult('Settings saved!', 'success');
    setTimeout(() => testResult.classList.add('hidden'), 2000);
  });

  function showTestResult(message, type) {
    testResult.textContent = message;
    testResult.className = `test-result ${type}`;
    testResult.classList.remove('hidden');
  }
});
