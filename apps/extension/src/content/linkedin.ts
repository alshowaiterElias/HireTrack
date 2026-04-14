// LinkedIn job detail page parser
// Injects on: linkedin.com/jobs/view/*
export {};

function isJobDetailPage(): boolean {
  return (
    window.location.href.includes('/jobs/view/') ||
    window.location.href.includes('/jobs/collections/')
  );
}

function trySelect(selectors: string[]): Element | null {
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el && el.textContent?.trim()) return el;
  }
  return null;
}

function parseWorkType(text: string): 'REMOTE' | 'HYBRID' | 'ONSITE' | undefined {
  const t = text.toLowerCase();
  if (t.includes('remote')) return 'REMOTE';
  if (t.includes('hybrid')) return 'HYBRID';
  if (t.includes('on-site') || t.includes('onsite') || t.includes('in-person')) return 'ONSITE';
  return undefined;
}

function extractJobData() {
  if (!isJobDetailPage()) return null;

  // ── Job Title ──────────────────────────────────────────────
  const titleEl = trySelect([
    'h1.job-details-jobs-unified-top-card__job-title',
    'h1[class*="job-title"]',
    '.jobs-unified-top-card__job-title h1',
    'h1',
  ]);
  const title = titleEl?.textContent?.trim() ?? '';

  // ── Company ────────────────────────────────────────────────
  const companyEl = trySelect([
    '.job-details-jobs-unified-top-card__company-name a',
    '.jobs-unified-top-card__company-name a',
    'a[href*="/company/"]',
  ]);
  const company = companyEl?.textContent?.trim() ?? '';

  // ── Location ───────────────────────────────────────────────
  const locationEl = trySelect([
    '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
    '.jobs-unified-top-card__bullet',
    '.jobs-unified-top-card__workplace-type',
  ]);
  // Location text often includes "· Remote" — split on the bullet
  const rawLocation = locationEl?.textContent?.trim() ?? '';
  const location = rawLocation.split('·')[0].trim();

  // ── Work Type ──────────────────────────────────────────────
  const workTypeEl = trySelect([
    '.job-details-jobs-unified-top-card__workplace-type',
    '[class*="workplace-type"]',
  ]);
  let workType = parseWorkType(workTypeEl?.textContent ?? '');
  // Fallback: check location string and raw description
  if (!workType) workType = parseWorkType(rawLocation);

  // ── Description ────────────────────────────────────────────
  const descEl = trySelect([
    '#job-details',
    '.jobs-description__content',
    '.jobs-description-content__text',
    '[class*="description-content"]',
  ]);
  const description = (descEl as HTMLElement)?.innerText?.trim() ?? '';

  // Also try description for work type fallback
  if (!workType && description) {
    workType = parseWorkType(description.slice(0, 500));
  }

  // ── Salary (optional) ──────────────────────────────────────
  let salaryMin: number | undefined;
  let salaryMax: number | undefined;
  const salaryEl = document.querySelector(
    '.compensation-module__salary-range, [class*="salary"]',
  );
  if (salaryEl) {
    const nums = salaryEl.textContent?.match(/[\d,]+/g)?.map((n) =>
      parseInt(n.replace(/,/g, ''), 10),
    );
    if (nums?.length) {
      salaryMin = nums[0];
      salaryMax = nums[1] ?? nums[0];
    }
  }

  if (!title || !company) return null;

  return {
    title,
    company,
    location,
    description,
    jobUrl: window.location.href.split('?')[0], // strip query params
    workType,
    salaryMin,
    salaryMax,
    source: 'LINKEDIN' as const,
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
  chrome.runtime.sendMessage({ type: 'JOB_PAGE_DETECTED', source: 'LINKEDIN' });
}
