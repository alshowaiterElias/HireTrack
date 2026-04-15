// HireTrack web app token bridge
// Runs on localhost:3000/* and app.hiretrack.com/*
// Allows the web app to push auth tokens to the extension seamlessly
export { };


function trySync() {
  try {
    const token = localStorage.getItem('hiretrack_ext_token');
    const apiUrl = localStorage.getItem('hiretrack_ext_apiUrl') ?? 'https://hiretrack-tjg7.onrender.com';
    const webUrl = window.location.origin;

    if (token) {
      chrome.runtime.sendMessage({ type: 'SAVE_TOKEN', token, apiUrl, webUrl }, () => {
        // Confirm back to the page that the extension received the token
        window.postMessage({ type: 'HIRETRACK_EXT_CONNECTED', success: true }, window.location.origin);
      });
    }
  } catch {
    // Extension may not be installed — fail silently
  }
}

// 1. Try on load (covers page refresh after user copied token)
trySync();

// 2. React to explicit connect trigger from the settings page
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  const { type, token, apiUrl } = event.data ?? {};

  if (type === 'HIRETRACK_EXT_CONNECT' && token) {
    // Save to localStorage for persistence across refreshes
    localStorage.setItem('hiretrack_ext_token', token);
    if (apiUrl) localStorage.setItem('hiretrack_ext_apiUrl', apiUrl);

    // Then forward to extension storage
    chrome.runtime.sendMessage(
      { type: 'SAVE_TOKEN', token, apiUrl: apiUrl ?? 'https://hiretrack-tjg7.onrender.com', webUrl: window.location.origin },
      () => {
        window.postMessage({ type: 'HIRETRACK_EXT_CONNECTED', success: true }, window.location.origin);
      },
    );
  }

  if (type === 'HIRETRACK_EXT_DISCONNECT') {
    localStorage.removeItem('hiretrack_ext_token');
    localStorage.removeItem('hiretrack_ext_apiUrl');
    chrome.runtime.sendMessage({ type: 'CLEAR_TOKEN' });
    window.postMessage({ type: 'HIRETRACK_EXT_DISCONNECTED' }, window.location.origin);
  }
});
