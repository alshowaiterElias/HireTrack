const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

interface FetchOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { token, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Only set Content-Type for non-FormData requests
    if (!(fetchOptions.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...fetchOptions,
        headers,
      });
    } catch {
      throw new Error(
        `Cannot connect to API server at ${this.baseUrl}. Check your network or backend deployment.`
      );
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  // ─── Auth ──────────────────────────────────────────────────

  async register(email: string, password: string, name?: string) {
    return this.request<{
      user: { id: string; email: string; name: string; avatarUrl: string };
      accessToken: string;
      refreshToken: string;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
  }

  async emailLogin(email: string, password: string) {
    return this.request<{
      user: { id: string; email: string; name: string; avatarUrl: string };
      accessToken: string;
      refreshToken: string;
    }>("/auth/email-login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async login(data: {
    email: string;
    name?: string;
    avatarUrl?: string;
    provider: string;
    providerId: string;
  }) {
    return this.request<{
      user: { id: string; email: string; name: string; avatarUrl: string };
      accessToken: string;
      refreshToken: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async sendCode(email: string) {
    return this.request<{ success: boolean; message: string }>("/auth/send-code", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async verifyCode(email: string, code: string) {
    return this.request<{ success: boolean; verified: boolean }>("/auth/verify-code", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
  }

  async forgotPassword(email: string) {
    return this.request<{ success: boolean; message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    return this.request<{ success: boolean; message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, code, newPassword }),
    });
  }

  async refreshTokens(refreshToken: string) {
    return this.request<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }

  async getProfile(token: string) {
    return this.request<{
      id: string; email: string; name: string; avatarUrl: string;
      timezone: string; digestEnabled: boolean; oauthProvider: string;
    }>("/auth/profile", { token });
  }

  async updateProfile(data: { name?: string; timezone?: string; digestEnabled?: boolean }, token: string) {
    return this.request<any>("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    });
  }

  async deleteAccount(token: string) {
    return this.request<{ success: boolean }>("/auth/account", {
      method: "DELETE",
      token,
    });
  }

  async exportApplicationsCsv(token: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/applications/export/csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Export failed");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hiretrack-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async exportAnalyticsPdf(token: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/analytics/export/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("PDF export failed");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hiretrack-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Campaigns ─────────────────────────────────────────────

  async getCampaigns(token: string) {
    return this.request<any[]>("/campaigns", { token });
  }

  async getCampaign(id: string, token: string) {
    return this.request<any>(`/campaigns/${id}`, { token });
  }

  async createCampaign(data: any, token: string) {
    return this.request<any>("/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
  }

  async updateCampaign(id: string, data: any, token: string) {
    return this.request<any>(`/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    });
  }

  async deleteCampaign(id: string, token: string) {
    return this.request<any>(`/campaigns/${id}`, {
      method: "DELETE",
      token,
    });
  }

  // ─── Columns ─────────────────────────────────────────────────

  async addColumn(campaignId: string, data: { name: string; color?: string }, token: string) {
    return this.request<any>(`/campaigns/${campaignId}/columns`, {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
  }

  async updateColumn(columnId: string, data: { name?: string; color?: string; wipLimit?: number | null; columnType?: string }, token: string) {
    return this.request<any>(`/campaigns/columns/${columnId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    });
  }

  async deleteColumn(columnId: string, token: string) {
    return this.request<any>(`/campaigns/columns/${columnId}`, {
      method: "DELETE",
      token,
    });
  }

  async reorderColumns(campaignId: string, columnIds: string[], token: string) {
    return this.request<any>(`/campaigns/${campaignId}/columns/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ columnIds }),
      token,
    });
  }

  // ─── Applications ─────────────────────────────────────────

  async getApplications(token: string) {
    return this.request<any[]>("/applications", { token });
  }

  async createApplication(data: any, token: string) {
    return this.request<any>("/applications", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
  }

  async getApplication(id: string, token: string) {
    return this.request<any>(`/applications/${id}`, { token });
  }

  async updateApplication(id: string, data: any, token: string) {
    return this.request<any>(`/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    });
  }

  async moveApplication(id: string, data: { columnId: string; position: number; interviewDate?: string; offerDeadline?: string }, token: string) {
    return this.request<any>(`/applications/${id}/move`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    });
  }

  async archiveApplication(id: string, isArchived: boolean, token: string) {
    return this.request<any>(`/applications/${id}/archive`, {
      method: "PATCH",
      body: JSON.stringify({ isArchived }),
      token,
    });
  }

  async deleteApplication(id: string, token: string) {
    return this.request<any>(`/applications/${id}`, {
      method: "DELETE",
      token,
    });
  }

  async addNote(applicationId: string, data: { content: string; type?: string }, token: string) {
    return this.request<any>(`/applications/${applicationId}/notes`, {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
  }

  async addContact(applicationId: string, data: any, token: string) {
    return this.request<any>(`/applications/${applicationId}/contacts`, {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
  }

  async updateNote(applicationId: string, noteId: string, data: { content?: string; type?: string }, token: string) {
    return this.request<any>(`/applications/${applicationId}/notes/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    });
  }

  async updateContact(applicationId: string, contactId: string, data: any, token: string) {
    return this.request<any>(`/applications/${applicationId}/contacts/${contactId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    });
  }

  // ─── Reminders ────────────────────────────────────────────

  async getReminders(token: string) {
    return this.request<any[]>("/reminders", { token });
  }

  async getUpcomingReminders(token: string) {
    return this.request<any[]>("/reminders/upcoming", { token });
  }

  async createReminder(data: { message: string; type: string; remindAt: string; applicationId?: string }, token: string) {
    return this.request<any>("/reminders", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
  }

  async dismissReminder(id: string, token: string) {
    return this.request<any>(`/reminders/${id}/dismiss`, {
      method: "PATCH",
      token,
    });
  }

  async deleteReminder(id: string, token: string) {
    return this.request<any>(`/reminders/${id}`, {
      method: "DELETE",
      token,
    });
  }

  // ─── Resumes ──────────────────────────────────────────────

  async getResumes(token: string) {
    return this.request<any[]>("/resumes", { token });
  }

  async uploadResume(file: File, label: string, token: string) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("label", label);

    return this.request<any>("/resumes/upload", {
      method: "POST",
      body: formData,
      token,
    });
  }

  async deleteResume(id: string, token: string) {
    return this.request<any>(`/resumes/${id}`, {
      method: "DELETE",
      token,
    });
  }

  getResumeDownloadUrl(id: string) {
    return `${this.baseUrl}/resumes/${id}/download`;
  }

  // ─── Email Templates ─────────────────────────────────────

  async getTemplates(token: string) {
    return this.request<any[]>("/email-templates", { token });
  }

  async createTemplate(data: { name: string; subject: string; body: string; category: string }, token: string) {
    return this.request<any>("/email-templates", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
  }

  async updateTemplate(id: string, data: any, token: string) {
    return this.request<any>(`/email-templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    });
  }

  async deleteTemplate(id: string, token: string) {
    return this.request<any>(`/email-templates/${id}`, {
      method: "DELETE",
      token,
    });
  }

  async seedDefaultTemplates(token: string) {
    return this.request<any>("/email-templates/seed-defaults", {
      method: "POST",
      token,
    });
  }

  // ─── Notifications ────────────────────────────────────────

  async getNotifications(token: string) {
    return this.request<any[]>("/notifications", { token });
  }

  async getUnreadCount(token: string) {
    return this.request<{ count: number }>("/notifications/unread-count", { token });
  }

  async markNotificationsRead(ids: string[], token: string) {
    return this.request<any>("/notifications/read", {
      method: "PATCH",
      body: JSON.stringify({ ids }),
      token,
    });
  }

  // ─── Analytics ────────────────────────────────────────────

  async getAnalyticsOverview(token: string) {
    return this.request<any>("/analytics/overview", { token });
  }

  async getMomentumScore(token: string) {
    return this.request<any>("/analytics/momentum", { token });
  }

  // ─── New: All Applications (for dropdowns) ─────────────────

  async getAllApplications(token: string) {
    return this.request<any[]>("/applications", { token });
  }

  // ─── Application Detail Endpoints ──────────────────────────

  async addTag(applicationId: string, name: string, token: string) {
    return this.request<any>(`/applications/${applicationId}/tags`, {
      method: "POST",
      body: JSON.stringify({ name }),
      token,
    });
  }

  async removeTag(applicationId: string, tagId: string, token: string) {
    return this.request<any>(`/applications/${applicationId}/tags/${tagId}`, {
      method: "DELETE",
      token,
    });
  }

  async removeNote(applicationId: string, noteId: string, token: string) {
    return this.request<any>(`/applications/${applicationId}/notes/${noteId}`, {
      method: "DELETE",
      token,
    });
  }

  async removeContact(applicationId: string, contactId: string, token: string) {
    return this.request<any>(`/applications/${applicationId}/contacts/${contactId}`, {
      method: "DELETE",
      token,
    });
  }

  async uploadAttachment(applicationId: string, file: File, token: string) {
    const formData = new FormData();
    formData.append("file", file);
    return this.request<any>(`/applications/${applicationId}/attachments`, {
      method: "POST",
      body: formData,
      token,
    });
  }

  async removeAttachment(applicationId: string, attachmentId: string, token: string) {
    return this.request<any>(`/applications/${applicationId}/attachments/${attachmentId}`, {
      method: "DELETE",
      token,
    });
  }

  getAttachmentDownloadUrl(applicationId: string, attachmentId: string) {
    return `${this.baseUrl}/applications/${applicationId}/attachments/${attachmentId}/download`;
  }

  // ─── Archived Applications ─────────────────────────────────

  async getArchivedApplications(token: string) {
    return this.request<any[]>("/applications/archived", { token });
  }

  // ─── Job Description Vault ─────────────────────────────────

  async getJobDescriptions(params: { search?: string; archived?: string; sort?: string }, token: string) {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.archived) query.set("archived", params.archived);
    if (params.sort) query.set("sort", params.sort);
    const qs = query.toString();
    return this.request<any[]>(`/job-descriptions${qs ? `?${qs}` : ""}`, { token });
  }

  async getJobDescription(id: string, token: string) {
    return this.request<any>(`/job-descriptions/${id}`, { token });
  }

  async archiveJobDescription(id: string, isArchived: boolean, token: string) {
    return this.request<any>(`/job-descriptions/${id}/archive?value=${isArchived}`, {
      method: "PATCH",
      token,
    });
  }

  async deleteJobDescription(id: string, token: string) {
    return this.request<any>(`/job-descriptions/${id}`, {
      method: "DELETE",
      token,
    });
  }

  async reanalyzeJobDescription(id: string, token: string) {
    return this.request<any>(`/job-descriptions/${id}/reanalyze`, {
      method: "POST",
      token,
    });
  }

  getJDExportUrl(id: string) {
    return `${this.baseUrl}/job-descriptions/${id}/export/pdf`;
  }

  // ─── Analytics (Full) ──────────────────────────────────────

  async getAnalyticsFunnel(token: string, campaignId?: string) {
    const qs = campaignId ? `?campaignId=${campaignId}` : "";
    return this.request<any[]>(`/analytics/funnel${qs}`, { token });
  }

  async getAnalyticsActivity(token: string, weeks?: number) {
    const qs = weeks ? `?weeks=${weeks}` : "";
    return this.request<any[]>(`/analytics/activity${qs}`, { token });
  }

  async getAnalyticsSources(token: string, campaignId?: string) {
    const qs = campaignId ? `?campaignId=${campaignId}` : "";
    return this.request<any[]>(`/analytics/sources${qs}`, { token });
  }

  async getAnalyticsResumes(token: string) {
    return this.request<any[]>("/analytics/resumes", { token });
  }

  async getAnalyticsTimeInStage(token: string) {
    return this.request<any[]>("/analytics/time-in-stage", { token });
  }

  async getAnalyticsSalary(token: string) {
    return this.request<any[]>("/analytics/salary", { token });
  }
}

export const api = new ApiClient(API_BASE_URL);
