import { Campaign, JobData } from './types';

export class HireTrackApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  // ─── Auth ──────────────────────────────────────────────────
  async login(email: string, password: string): Promise<{ accessToken: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/email-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || 'Login failed. Check your credentials.');
    }
    return res.json();
  }

  // ─── Campaigns ─────────────────────────────────────────────
  async getCampaigns(): Promise<Campaign[]> {
    const res = await fetch(`${this.baseUrl}/api/v1/campaigns`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    if (!res.ok) throw new Error('Failed to fetch campaigns');
    return res.json();
  }

  // ─── Duplicate Detection ───────────────────────────────────
  async checkDuplicate(jobUrl: string): Promise<{ id: string; companyName: string; roleTitle: string } | null> {
    const res = await fetch(
      `${this.baseUrl}/api/v1/applications?jobUrl=${encodeURIComponent(jobUrl)}`,
      { headers: { Authorization: `Bearer ${this.token}` } },
    );
    if (!res.ok) return null;
    const data: any[] = await res.json();
    return data.length > 0 ? data[0] : null;
  }

  // ─── Create Application ────────────────────────────────────
  async createApplication(
    columnId: string,
    job: JobData,
    priority: string,
  ): Promise<{ id: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/applications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        columnId,
        companyName: job.company,
        roleTitle: job.title,
        jobUrl: job.jobUrl,
        jobDescription: job.description,
        location: job.location,
        workType: job.workType || undefined,
        salaryMin: job.salaryMin || undefined,
        salaryMax: job.salaryMax || undefined,
        currency: job.currency || 'USD',
        source: job.source,
        priority,
      }),
    });
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || 'Failed to create application');
    }
    return res.json();
  }
}
