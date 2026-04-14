"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/context";
import "./page.css";

export default function DashboardHome() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const token = session?.accessToken as string;
  const firstName = session?.user?.name?.split(" ")[0] || "there";

  const [overview, setOverview] = useState<any>(null);
  const [momentum, setMomentum] = useState<any>(null);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const [ov, mom] = await Promise.all([
        api.getAnalyticsOverview(token),
        api.getMomentumScore(token),
      ]);
      setOverview(ov);
      setMomentum(mom);
    } catch {}
  }, [token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <div className="dash-home">
      {/* Welcome */}
      <div className="dash-welcome">
        <h2>{t.dashboard.welcome}, {firstName} 👋</h2>
        <p>{t.dashboard.title === 'Dashboard' ? "Here's a snapshot of your job search progress." : 'إليك لمحة عن تقدم بحثك عن عمل.'}</p>
      </div>

      {/* Quick Stats */}
      <div className="dash-stats">
        <div className="dash-stat-card">
          <div className="dash-stat-label">{t.dashboard.totalApplications}</div>
          <div className="dash-stat-value" style={{ color: "var(--accent-primary)" }}>
            {overview?.totalApplications ?? "—"}
          </div>
          <div className="dash-stat-change" style={{ color: "var(--text-muted)" }}>
            {overview?.activeCampaigns ?? 0} {t.common.active.toLowerCase()}
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-label">{t.dashboard.interviews}</div>
          <div className="dash-stat-value" style={{ color: "var(--warning)" }}>
            {overview?.activeInterviews ?? "—"}
          </div>
          <div className="dash-stat-change" style={{ color: "var(--text-muted)" }}>
            Phone screens + interviews
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-label">{t.dashboard.offers}</div>
          <div className="dash-stat-value" style={{ color: "var(--success)" }}>
            {overview?.offers ?? "—"}
          </div>
          <div className="dash-stat-change" style={{ color: "var(--text-muted)" }}>
            {overview?.rejected ?? 0} {t.common.archived.toLowerCase()}
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-label">{t.analytics.momentumScore}</div>
          <div className="dash-stat-value" style={{ color: "var(--accent-secondary)" }}>
            {momentum?.score ?? "—"}
          </div>
          <div className="dash-stat-change" style={{ color: "var(--text-muted)" }}>
            {momentum?.thisWeekApps ?? 0} {t.analytics.applications.toLowerCase()}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dash-section-title">{t.dashboard.quickActions}</div>
      <div className="dash-actions">
        <Link href="/dashboard/analytics" className="dash-action-card" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="dash-action-icon" style={{ background: "var(--accent-primary-subtle)" }}>📊</div>
          <div className="dash-action-info">
            <h3>{t.analytics.title}</h3>
            <p>{t.analytics.subtitle}</p>
          </div>
        </Link>

        <Link href="/dashboard/vault" className="dash-action-card" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="dash-action-icon" style={{ background: "var(--info-subtle)" }}>📚</div>
          <div className="dash-action-info">
            <h3>{t.vault.title}</h3>
            <p>{t.vault.subtitle}</p>
          </div>
        </Link>

        <Link href="/dashboard/resumes" className="dash-action-card" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="dash-action-icon" style={{ background: "var(--warning-subtle)" }}>📄</div>
          <div className="dash-action-info">
            <h3>{t.resumes.title}</h3>
            <p>{t.resumes.subtitle}</p>
          </div>
        </Link>

        <Link href="/dashboard/reminders" className="dash-action-card" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="dash-action-icon" style={{ background: "var(--success-subtle)" }}>⏰</div>
          <div className="dash-action-info">
            <h3>{t.reminders.title}</h3>
            <p>{t.reminders.subtitle}</p>
          </div>
        </Link>
      </div>

      {/* Archive Summary */}
      {overview?.archivedApplications > 0 && (
        <div style={{ marginTop: "var(--space-6)" }}>
          <div className="dash-section-title">Archive</div>
          <Link href="/dashboard/vault" className="dash-action-card" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="dash-action-icon" style={{ background: "var(--bg-tertiary)" }}>🗃️</div>
            <div className="dash-action-info">
              <h3>{overview.archivedApplications} Archived Application{overview.archivedApplications !== 1 ? "s" : ""}</h3>
              <p>View archived applications and job descriptions in the Vault</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
