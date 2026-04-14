import './popup.css';
import { HireTrackApiClient } from '../shared/api-client';
import { Campaign, Column, JobData } from '../shared/types';

// ─── Inline extractors — self-contained, injected via chrome.scripting.executeScript ──

function extractLinkedInJob(): any {
  // Helper: try selectors in order, return first match with non-empty text
  function q(sels: string[]): Element | null {
    for (const s of sels) {
      try { const e = document.querySelector(s); if (e?.textContent?.trim()) return e; } catch {}
    }
    return null;
  }
  function wt(text: string): string | undefined {
    const t = (text || '').toLowerCase();
    if (t.includes('remote')) return 'REMOTE';
    if (t.includes('hybrid')) return 'HYBRID';
    if (t.includes('on-site') || t.includes('onsite') || t.includes('in-person')) return 'ONSITE';
    return undefined;
  }

  // Debug: log what we find
  console.log('[HireTrack LinkedIn] Starting extraction on:', window.location.href);
  console.log('[HireTrack LinkedIn] All h1 elements:', Array.from(document.querySelectorAll('h1')).map(e => e.textContent?.trim()));

  const titleEl = q([
    'h1.job-details-jobs-unified-top-card__job-title',
    'h1[class*="job-title"]',
    '.jobs-unified-top-card__job-title h1',
    '.jobs-details-top-card__job-title',
    // Collections/search split view
    '.job-details-jobs-unified-top-card__job-title-link',
    '[data-job-title]',
    'h1',
  ]);
  const title = titleEl?.textContent?.trim() ?? '';
  console.log('[HireTrack LinkedIn] Title found:', title, '| Element:', titleEl?.className);

  const companyEl = q([
    '.job-details-jobs-unified-top-card__company-name a',
    '.jobs-unified-top-card__company-name a',
    '.jobs-details-top-card__company-url a',
    'a[href*="/company/"]',
    '.job-details-jobs-unified-top-card__company-name',
  ]);
  const company = companyEl?.textContent?.trim() ?? '';
  console.log('[HireTrack LinkedIn] Company found:', company);

  const locEl = q([
    '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
    '.jobs-unified-top-card__bullet',
    '.jobs-details-top-card__bullet',
    '.job-details-jobs-unified-top-card__primary-description-container span',
  ]);
  const rawLoc = locEl?.textContent?.trim() ?? '';
  const location = rawLoc.split('·')[0].trim();
  console.log('[HireTrack LinkedIn] Location found:', location);

  const wtEl = q(['.job-details-jobs-unified-top-card__workplace-type', '[class*="workplace-type"]']);
  let workType = wt(wtEl?.textContent ?? '') || wt(rawLoc);

  const descEl = q([
    '#job-details',
    '.jobs-description__content',
    '.jobs-description-content__text',
    '[class*="description-content"]',
    '.jobs-box__html-content',
  ]);
  const description = (descEl as HTMLElement)?.innerText?.trim() ?? '';
  console.log('[HireTrack LinkedIn] Description length:', description.length);

  if (!workType && description) workType = wt(description.slice(0, 800));

  let salaryMin: number | undefined;
  let salaryMax: number | undefined;
  const salaryEl = document.querySelector('.compensation-module__salary-range, [class*="salary-range"]');
  if (salaryEl) {
    const nums = (salaryEl.textContent ?? '').match(/[\d,]+/g)?.map(n => parseInt(n.replace(/,/g, ''), 10));
    if (nums?.length) { salaryMin = nums[0]; salaryMax = nums[1] ?? nums[0]; }
  }

  if (!title || !company) {
    console.log('[HireTrack LinkedIn] FAILED — missing title or company. Title:', JSON.stringify(title), 'Company:', JSON.stringify(company));
    // Return partial data even without company so user can fill it
    if (title) return { title, company: company || 'Unknown', location, description, jobUrl: window.location.href.split('?')[0], workType, salaryMin, salaryMax, source: 'LINKEDIN' };
    return null;
  }

  return { title, company, location, description, jobUrl: window.location.href.split('?')[0], workType, salaryMin, salaryMax, source: 'LINKEDIN' };
}

function extractYemenHRJob(): any {
  console.log('[HireTrack YemenHR] Starting extraction on:', window.location.href);

  // ── Title: main h1 ──
  const title = document.querySelector('h1')?.textContent?.trim() ?? '';
  console.log('[HireTrack YemenHR] Title:', title);

  // ── Helper: find a <p> or text next to a specific SVG icon ──
  // YemenHR uses plain <p class="border-b-2"> tags for company/location,
  // NOT anchor tags — identify the right div by SVG path d-attribute fingerprint.
  function findByIconPath(pathFragment: string): string {
    const divs = Array.from(document.querySelectorAll('div.flex.items-center, div.flex.items-center.space-x-2'));
    for (const div of divs) {
      const hasSvgMatch = Array.from(div.querySelectorAll('path')).some(p =>
        (p.getAttribute('d') || '').includes(pathFragment)
      );
      if (hasSvgMatch) {
        // Get the text from the <p> sibling
        const text = div.querySelector('p')?.textContent?.trim() ?? '';
        if (text) return text;
      }
    }
    return '';
  }

  // Building/company icon has path containing "M3 21h18"
  let company = findByIconPath('M3 21h18');
  console.log('[HireTrack YemenHR] Company (SVG icon method):', company);

  // Location pin icon has path containing "M19.5 10.5c0 7.142"
  let location = findByIconPath('M19.5 10.5c0 7.142');
  console.log('[HireTrack YemenHR] Location (SVG icon method):', location);

  // ── Fallback: parse from <meta name="description"> ──
  // Format: "Apply for {title} at {company} in {city}. Application deadline..."
  if (!company || !location) {
    const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    console.log('[HireTrack YemenHR] Meta desc fallback:', metaDesc);
    if (!company) {
      const m = metaDesc.match(/Apply for .+ at (.+?) in /);
      if (m) company = m[1].trim();
    }
    if (!location) {
      const m = metaDesc.match(/ in ([^.]+)\./);
      if (m) location = m[1].trim();
    }
  }

  // ── Fallback 2: parse from <title> ──
  // Format: "{title} at {company} | Yemen HR"
  if (!company) {
    const m = document.title.match(/^.+ at (.+?) \|/);
    if (m) company = m[1].trim();
    console.log('[HireTrack YemenHR] Company (page title method):', company);
  }

  console.log('[HireTrack YemenHR] Final — company:', company, '| location:', location);

  // ── Description: target .job-description-container directly ──
  const descEl = document.querySelector<HTMLElement>(
    '.job-description-container, .job-description, [class*="job-description"]'
  );
  let description = descEl?.innerText?.trim() ?? '';
  if (description.length < 100) {
    // Fallback: find biggest text block in main
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('main article, main .prose, main > div'))) {
      const text = el.innerText?.trim() ?? '';
      if (text.length > description.length) description = text;
    }
  }
  console.log('[HireTrack YemenHR] Description length:', description.length);

  // ── Deadline: <p class="text-red-600 border-b-2">Deadline: 15 May, 26</p> ──
  let deadline: string | undefined;
  const deadlineEl = document.querySelector('p.text-red-600');
  if (deadlineEl?.textContent?.trim()) deadline = deadlineEl.textContent.trim();
  console.log('[HireTrack YemenHR] Deadline:', deadline);

  // ── Work type from description text ──
  const t = description.toLowerCase();
  let workType = 'ONSITE';
  if (t.includes('remote') || t.includes('عن بعد')) workType = 'REMOTE';
  else if (t.includes('hybrid') || t.includes('مختلط')) workType = 'HYBRID';

  if (!title) {
    console.log('[HireTrack YemenHR] FAILED — no h1 title found');
    return null;
  }

  return { title, company, location, description, jobUrl: window.location.href, workType, source: 'YEMENHR', deadline };
}

// ─── URL detection ─────────────────────────────────────────────
function detectSite(tabUrl: string): 'linkedin' | 'yemenhr' | null {
  if (
    tabUrl.includes('linkedin.com/jobs/view/') ||
    tabUrl.includes('linkedin.com/jobs/collections/') ||
    tabUrl.includes('linkedin.com/jobs/search/')
  ) return 'linkedin';

  if (/yemenhr\.com\/jobs\/./.test(tabUrl)) return 'yemenhr';

  return null;
}

// ─── State ─────────────────────────────────────────────────────
let apiUrl = 'http://localhost:4000';
let webUrl = 'http://localhost:3000';
let token: string | null = null;
let client: HireTrackApiClient | null = null;
let jobData: JobData | null = null;
let campaigns: Campaign[] = [];
let savedAppId: string | null = null;

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const show = (id: string) => el(id).classList.remove('hidden');
const hide = (id: string) => el(id).classList.add('hidden');

function showView(view: 'auth-view' | 'no-job-view' | 'main-view' | 'success-view') {
  ['auth-view', 'no-job-view', 'main-view', 'success-view'].forEach(id => hide(id));
  show(view);
}

// ─── Init ──────────────────────────────────────────────────────
async function init() {
  const stored = await chrome.storage.local.get(['token', 'apiUrl', 'webUrl']);
  if (stored.apiUrl) apiUrl = stored.apiUrl;
  if (stored.webUrl) webUrl = stored.webUrl;
  if (stored.token) token = stored.token;

  el<HTMLInputElement>('api-url-input').value = apiUrl;

  if (token) {
    client = new HireTrackApiClient(apiUrl, token);
    await loadConnectedState();
  } else {
    el('connection-dot').className = 'conn-dot conn-dot--off';
    showView('auth-view');
  }
}

// ─── Extract job — with retry for slow SPA renders ─────────────
async function extractJobFromTab(tabId: number, tabUrl: string): Promise<JobData | null> {
  const site = detectSite(tabUrl);
  console.log('[HireTrack Popup] extractJobFromTab — URL:', tabUrl, '| site detected:', site);

  if (!site) {
    console.log('[HireTrack Popup] Not a supported job URL — showing no-job view');
    return null;
  }

  const extractFn = site === 'linkedin' ? extractLinkedInJob : extractYemenHRJob;

  // Attempt 1: scripting API (works for SPA pages — no content script needed)
  for (let attempt = 1; attempt <= 2; attempt++) {
    console.log(`[HireTrack Popup] executeScript attempt ${attempt}...`);
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: extractFn,
      });
      const data = results?.[0]?.result;
      console.log(`[HireTrack Popup] executeScript result (attempt ${attempt}):`, data);
      if (data?.title) return data as JobData;
    } catch (err) {
      console.warn(`[HireTrack Popup] executeScript failed (attempt ${attempt}):`, err);
    }

    if (attempt < 2) {
      // Page may still be rendering (SPA) — wait and retry
      console.log('[HireTrack Popup] Waiting 800ms before retry...');
      await new Promise(r => setTimeout(r, 800));
    }
  }

  // Attempt 3: message the content script (if it was loaded on full page load)
  console.log('[HireTrack Popup] Trying sendMessage fallback to content script...');
  try {
    const result: JobData | null = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { type: 'GET_JOB_DATA' }, (resp) => {
        if (chrome.runtime.lastError) {
          console.warn('[HireTrack Popup] sendMessage error:', chrome.runtime.lastError.message);
          resolve(null);
          return;
        }
        console.log('[HireTrack Popup] sendMessage response:', resp);
        resolve(resp?.jobData ?? null);
      });
    });
    if (result?.title) return result;
  } catch (err) {
    console.warn('[HireTrack Popup] sendMessage threw:', err);
  }

  console.log('[HireTrack Popup] All extraction attempts failed — no job data');
  return null;
}

// ─── Connected State ───────────────────────────────────────────
async function loadConnectedState() {
  el('connection-dot').className = 'conn-dot conn-dot--on';

  try {
    campaigns = await client!.getCampaigns();
    console.log('[HireTrack Popup] Campaigns loaded:', campaigns.length);
  } catch (err: any) {
    console.warn('[HireTrack Popup] getCampaigns error:', err.message);
    if (err.message === 'UNAUTHORIZED') { await disconnectAccount(); return; }
    campaigns = [];
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log('[HireTrack Popup] Active tab:', tab?.url);

  if (!tab?.id || !tab.url) { showView('no-job-view'); return; }

  jobData = await extractJobFromTab(tab.id, tab.url);
  console.log('[HireTrack Popup] Final jobData:', jobData);

  if (!jobData) { showView('no-job-view'); return; }

  // Duplicate check
  if (jobData.jobUrl) {
    try {
      const dup = await client!.checkDuplicate(jobData.jobUrl);
      if (dup) {
        show('duplicate-banner');
        const link = el<HTMLAnchorElement>('dup-link');
        link.textContent = `${dup.companyName} – ${dup.roleTitle} →`;
        link.onclick = (e) => {
          e.preventDefault();
          chrome.tabs.create({ url: `${webUrl}/dashboard/application/${dup.id}` });
          window.close();
        };
      }
    } catch (err) {
      console.warn('[HireTrack Popup] Duplicate check failed:', err);
    }
  }

  populateForm();
  showView('main-view');
}

// ─── Form population ───────────────────────────────────────────
function populateForm() {
  if (!jobData) return;

  el<HTMLInputElement>('role-title').value = jobData.title;
  el<HTMLInputElement>('company-name').value = jobData.company;
  el<HTMLInputElement>('location-input').value = jobData.location;
  el<HTMLInputElement>('job-url-hidden').value = jobData.jobUrl;

  let hostname = jobData.jobUrl;
  try { hostname = new URL(jobData.jobUrl).hostname; } catch {}
  el('url-display').textContent = hostname;

  const badge = el('source-badge');
  badge.textContent = jobData.source === 'LINKEDIN' ? '🔵 LinkedIn' : '🟡 YemenHR';
  badge.className = `source-badge ${jobData.source.toLowerCase()}`;

  if (jobData.workType) el<HTMLSelectElement>('work-type').value = jobData.workType;
  if (jobData.salaryMin) el<HTMLInputElement>('salary-min').value = String(jobData.salaryMin);
  if (jobData.salaryMax) el<HTMLInputElement>('salary-max').value = String(jobData.salaryMax);

  if ((jobData as any).deadline) {
    el('deadline-badge').textContent = `⏰ ${(jobData as any).deadline}`;
    show('deadline-badge');
  }

  populateCampaigns();
}

function populateCampaigns() {
  const sel = el<HTMLSelectElement>('campaign-select');
  sel.innerHTML = '';

  if (!campaigns.length) {
    sel.innerHTML = '<option value="">No campaigns — create one in HireTrack first</option>';
    return;
  }

  const active = campaigns.filter(c => c.status === 'ACTIVE');
  const toShow = active.length ? active : campaigns;

  toShow.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });

  populateColumns(toShow[0]);

  sel.addEventListener('change', () => {
    const camp = campaigns.find(c => c.id === sel.value);
    if (camp) populateColumns(camp);
  });
}

function populateColumns(campaign: Campaign) {
  const sel = el<HTMLSelectElement>('column-select');
  sel.innerHTML = '';

  const cols: Column[] = (campaign.columns ?? []).sort((a, b) => a.position - b.position);
  if (!cols.length) { sel.innerHTML = '<option value="">No columns</option>'; return; }

  cols.forEach(col => {
    const opt = document.createElement('option');
    opt.value = col.id;
    opt.textContent = col.name;
    sel.appendChild(opt);
  });

  const saved = cols.find(c => c.columnType === 'SAVED');
  if (saved) sel.value = saved.id;
}

// ─── Login ─────────────────────────────────────────────────────
async function handleLogin(e: Event) {
  e.preventDefault();
  const email = el<HTMLInputElement>('login-email').value.trim();
  const password = el<HTMLInputElement>('login-password').value.trim();
  const btn = el<HTMLButtonElement>('login-btn');
  hide('login-error');
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    apiUrl = el<HTMLInputElement>('api-url-input').value.trim() || 'http://localhost:4000';
    const tempClient = new HireTrackApiClient(apiUrl, '');
    const result = await tempClient.login(email, password);
    token = result.accessToken;
    await chrome.storage.local.set({ token, apiUrl });
    client = new HireTrackApiClient(apiUrl, token);
    await loadConnectedState();
  } catch (err: any) {
    el('login-error').textContent = err.message || 'Login failed.';
    show('login-error');
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

// ─── Save ──────────────────────────────────────────────────────
async function handleSave(e: Event) {
  e.preventDefault();
  if (!jobData || !client) return;

  const columnId = el<HTMLSelectElement>('column-select').value;
  if (!columnId) { el('save-error').textContent = 'Please select a column.'; show('save-error'); return; }

  const btn = el<HTMLButtonElement>('save-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Saving…';
  hide('save-error');

  const updatedJob: JobData = {
    ...jobData,
    title:    el<HTMLInputElement>('role-title').value.trim(),
    company:  el<HTMLInputElement>('company-name').value.trim(),
    location: el<HTMLInputElement>('location-input').value.trim(),
    workType: (el<HTMLSelectElement>('work-type').value as JobData['workType']) || undefined,
    salaryMin: parseFloat(el<HTMLInputElement>('salary-min').value) || undefined,
    salaryMax: parseFloat(el<HTMLInputElement>('salary-max').value) || undefined,
  };

  try {
    const newApp = await client.createApplication(columnId, updatedJob, el<HTMLSelectElement>('priority-select').value);
    savedAppId = newApp.id;
    el('success-desc').textContent = `${updatedJob.company} — ${updatedJob.title}`;
    showView('success-view');
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') { await disconnectAccount(); return; }
    el('save-error').textContent = err.message || 'Failed to save.';
    show('save-error');
    btn.disabled = false;
    btn.textContent = '✓ Save to HireTrack';
  }
}

// ─── Disconnect ────────────────────────────────────────────────
async function disconnectAccount() {
  await chrome.storage.local.remove(['token']);
  token = null; client = null;
  el('connection-dot').className = 'conn-dot conn-dot--off';
  showView('auth-view');
}

// ─── Bootstrap ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();
  el('login-form').addEventListener('submit', handleLogin);
  el('save-form').addEventListener('submit', handleSave);
  el('disconnect-btn').addEventListener('click', async () => { await disconnectAccount(); hide('settings-panel'); });
  el('settings-toggle').addEventListener('click', () => el('settings-panel').classList.toggle('hidden'));
  el('api-url-save').addEventListener('click', async () => {
    const url = el<HTMLInputElement>('api-url-input').value.trim();
    if (!url) return;
    apiUrl = url;
    await chrome.storage.local.set({ apiUrl });
    if (token) client = new HireTrackApiClient(apiUrl, token);
    show('toast-api'); setTimeout(() => hide('toast-api'), 2000);
  });
  el('view-app-btn').addEventListener('click', () => {
    if (savedAppId) { chrome.tabs.create({ url: `${webUrl}/dashboard/application/${savedAppId}` }); window.close(); }
  });
  el('save-another-btn').addEventListener('click', () => { savedAppId = null; showView('main-view'); });
  el('open-web-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: `${webUrl}/dashboard/settings` });
    window.close();
  });
});
