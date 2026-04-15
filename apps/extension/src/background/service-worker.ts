// Background Service Worker — Manifest V3
// Handles: token storage, badge updates, message relay
export { };


chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'SAVE_TOKEN': {
      chrome.storage.local.set(
        {
          token: message.token,
          apiUrl: message.apiUrl ?? 'https://hiretrack-tjg7.onrender.com',
          webUrl: message.webUrl ?? 'https://hire-track-web.vercel.app',
        },
        () => sendResponse({ success: true }),
      );
      return true; // async response
    }

    case 'CLEAR_TOKEN': {
      chrome.storage.local.remove(['token', 'apiUrl', 'webUrl'], () =>
        sendResponse({ success: true }),
      );
      return true;
    }

    case 'JOB_PAGE_DETECTED': {
      // Show active badge on the extension icon
      chrome.action.setBadgeText({ text: '●' });
      chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
      chrome.action.setTitle({
        title: `HireTrack — ${message.source === 'LINKEDIN' ? 'LinkedIn' : 'YemenHR'} job detected`,
      });
      break;
    }
  }
  return false;
});

// Reset badge when navigating away from a job page
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;

  const isLinkedInJob = tab.url.includes('linkedin.com/jobs/view/');
  const isYemenHRJob =
    tab.url.includes('yemenhr.com/jobs/') &&
    tab.url.replace('https://yemenhr.com/jobs/', '').replace('https://www.yemenhr.com/jobs/', '').includes('-');

  if (!isLinkedInJob && !isYemenHRJob) {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'HireTrack Job Saver' });
  }
});
