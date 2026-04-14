// Parsed job data from a job posting page
export interface JobData {
  title: string;
  company: string;
  location: string;
  description: string;
  jobUrl: string;
  workType?: 'REMOTE' | 'HYBRID' | 'ONSITE';
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  source: 'LINKEDIN' | 'YEMENHR';
  deadline?: string; // YemenHR application deadline (display only)
}

// Campaign from API
export interface Campaign {
  id: string;
  name: string;
  status: string;
  columns: Column[];
}

// Column within a campaign
export interface Column {
  id: string;
  name: string;
  color: string;
  columnType: string;
  position: number;
}

// Stored extension config
export interface ExtensionConfig {
  apiUrl: string;
  token: string | null;
  webUrl: string;
}

// Messages between content scripts, popup, and background
export type ExtMessage =
  | { type: 'GET_JOB_DATA' }
  | { type: 'JOB_PAGE_DETECTED'; source: 'LINKEDIN' | 'YEMENHR' }
  | { type: 'SAVE_TOKEN'; token: string; apiUrl: string; webUrl: string }
  | { type: 'CLEAR_TOKEN' }
  | { type: 'GET_CONFIG' };
