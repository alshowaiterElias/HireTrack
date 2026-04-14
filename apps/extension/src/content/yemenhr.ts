// YemenHR job detail page parser
// Injects on: yemenhr.com/jobs/*
// URL pattern: yemenhr.com/jobs/[title-slug]-[org-slug]-[location-slug]-[uuid]
export {};

function isJobDetailPage(): boolean {
  const parts = window.location.pathname.split('/').filter(Boolean);
  // Must be /jobs/<slug> (2 segments minimum)
  return parts[0] === 'jobs' && parts.length >= 2;
}

function parseWorkType(text: string): 'REMOTE' | 'HYBRID' | 'ONSITE' {
  const t = text.toLowerCase();
  if (t.includes('remote') || t.includes('عن بعد')) return 'REMOTE';
  if (t.includes('hybrid') || t.includes('مختلط')) return 'HYBRID';
  return 'ONSITE'; // Default: YemenHR is predominantly in-person roles
}

function extractJobData() {
  if (!isJobDetailPage()) return null;

  // ── Job Title ──────────────────────────────────────────────
  // Confirmed: h1 with Tailwind classes "text-2xl sm:text-3xl font-bold text-gray-800"
  const title = document.querySelector('h1')?.textContent?.trim() ?? '';

  // ── Company ────────────────────────────────────────────────
  // Confirmed: <a href="/organizations/...">INSO</a>
  const company =
    document.querySelector<HTMLAnchorElement>('a[href*="/organizations/"]')?.textContent?.trim() ?? '';

  // ── Location ───────────────────────────────────────────────
  // Confirmed: <a href="/locations/...">Aden</a>
  const location =
    document.querySelector<HTMLAnchorElement>('a[href*="/locations/"]')?.textContent?.trim() ?? '';

  // ── Description ────────────────────────────────────────────
  // The main content div follows a heading with "Job Description"
  // Try multiple selectors for robustness
  let description = '';
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(
    'article, .prose, [class*="description"], [class*="content"], main',
  ));
  for (const el of candidates) {
    const text = el.innerText?.trim();
    if (text && text.length > 200) {
      description = text;
      break;
    }
  }
  // Fallback: just grab the page body text from the main area
  if (!description) {
    const main = document.querySelector<HTMLElement>('main');
    description = main?.innerText?.trim() ?? '';
  }

  // ── Work Type ──────────────────────────────────────────────
  const workType = parseWorkType(description.slice(0, 1000));

  // ── Application Deadline (display only) ────────────────────
  let deadline: string | undefined;
  const allText = Array.from(document.querySelectorAll('span, div, p'));
  for (const el of allText) {
    const t = el.textContent?.trim() ?? '';
    if (t.toLowerCase().startsWith('deadline') && t.length < 50) {
      deadline = t;
      break;
    }
  }

  if (!title || !company) return null;

  return {
    title,
    company,
    location,
    description,
    jobUrl: window.location.href,
    workType,
    source: 'YEMENHR' as const,
    deadline,
  };
}

// Respond to popup requests
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_JOB_DATA') {
    sendResponse({ jobData: extractJobData() });
  }
  return true;
});

// Badge update
if (isJobDetailPage()) {
  chrome.runtime.sendMessage({ type: 'JOB_PAGE_DETECTED', source: 'YEMENHR' });
}
