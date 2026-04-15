"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/context";
import "./analytics.css";

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const token = session?.accessToken as string;

  const [overview, setOverview] = useState<any>(null);
  const [momentum, setMomentum] = useState<any>(null);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  const [timeInStage, setTimeInStage] = useState<any[]>([]);
  const [salary, setSalary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [ov, mom, fun, act, src, res, tis, sal] = await Promise.all([
        api.getAnalyticsOverview(token),
        api.getMomentumScore(token),
        api.getAnalyticsFunnel(token),
        api.getAnalyticsActivity(token),
        api.getAnalyticsSources(token),
        api.getAnalyticsResumes(token),
        api.getAnalyticsTimeInStage(token),
        api.getAnalyticsSalary(token),
      ]);
      setOverview(ov);
      setMomentum(mom);
      setFunnel(fun);
      setActivity(act);
      setSources(src);
      setResumes(res);
      setTimeInStage(tis);
      setSalary(sal);
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleExportPdf = async () => {
    if (!token) return;
    setExportingPdf(true);
    setPdfError("");
    try {
      await api.exportAnalyticsPdf(token);
    } catch (err: any) {
      setPdfError(err.message || "Export failed. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-page">
        {/* Header shimmer */}
        <div className="analytics-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="skeleton" style={{ height: 28, width: 200, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 14, width: 280 }} />
          </div>
          <div className="skeleton" style={{ height: 32, width: 160, borderRadius: "var(--radius-md)" }} />
        </div>

        {/* Stat cards shimmer */}
        <div className="an-stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="an-stat-card">
              <div className="skeleton" style={{ height: 12, width: 90, marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 40, width: 64, marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 11, width: 110 }} />
            </div>
          ))}
        </div>

        {/* Two column row */}
        <div className="an-row-2">
          {[1, 2].map((i) => (
            <div key={i} className="an-card">
              <div className="skeleton" style={{ height: 16, width: 140, marginBottom: 16 }} />
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                  <div className="skeleton" style={{ height: 12, width: 80, flexShrink: 0 }} />
                  <div className="skeleton" style={{ height: 10, flex: 1 }} />
                  <div className="skeleton" style={{ height: 12, width: 24, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Wide chart shimmer */}
        <div className="an-card">
          <div className="skeleton" style={{ height: 16, width: 200, marginBottom: 16 }} />
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 120 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ flex: 1, height: `${30 + Math.random() * 70}%`, borderRadius: 4 }} />
            ))}
          </div>
        </div>

        {/* Bottom two column row */}
        <div className="an-row-2">
          {[1, 2].map((i) => (
            <div key={i} className="an-card">
              <div className="skeleton" style={{ height: 16, width: 140, marginBottom: 16 }} />
              {[1, 2, 3].map((j) => (
                <div key={j} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                  <div className="skeleton" style={{ height: 12, width: 90, flexShrink: 0 }} />
                  <div className="skeleton" style={{ height: 10, flex: 1 }} />
                  <div className="skeleton" style={{ height: 12, width: 36, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1);
  const maxActivity = Math.max(...activity.map((a) => a.count), 1);
  const totalSourceApps = sources.reduce((s, src) => s + src.total, 0);

  return (
    <div className="analytics-page">
      <div className="analytics-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <div>
          <h2>{t.analytics.title} 📊</h2>
          <p>{t.analytics.subtitle}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-1)" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportPdf}
            disabled={exportingPdf}
            style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
          >
            {exportingPdf ? (
              <span style={{ display: "inline-block", width: 13, height: 13, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
            ) : "📄"}
            {exportingPdf ? "Generating..." : "Download PDF Report"}
          </button>
          {pdfError && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--danger)" }}>⚠️ {pdfError}</span>
          )}
        </div>
      </div>

      {/* ─── Stat Cards ──────────────────────────────────────────── */}
      <div className="an-stats-grid">
        <div className="an-stat-card">
          <div className="an-stat-label">{t.dashboard.totalApplications}</div>
          <div className="an-stat-value" style={{ color: "var(--accent-primary)" }}>
            {overview?.totalApplications ?? 0}
          </div>
          <div className="an-stat-detail">{overview?.activeCampaigns ?? 0} {t.common.active.toLowerCase()}</div>
        </div>
        <div className="an-stat-card">
          <div className="an-stat-label">Active Interviews</div>
          <div className="an-stat-value" style={{ color: "var(--warning)" }}>
            {overview?.activeInterviews ?? 0}
          </div>
          <div className="an-stat-detail">Phone screens + interviews</div>
        </div>
        <div className="an-stat-card">
          <div className="an-stat-label">Offers</div>
          <div className="an-stat-value" style={{ color: "var(--success)" }}>
            {overview?.offers ?? 0}
          </div>
          <div className="an-stat-detail">{overview?.rejected ?? 0} rejected</div>
        </div>
        <div className="an-stat-card">
          <div className="an-stat-label">Momentum Score</div>
          <div className="an-stat-value" style={{ color: "var(--accent-secondary)" }}>
            {momentum?.score ?? 0}
          </div>
          <div className="an-stat-detail">{momentum?.thisWeekApps ?? 0} apps this week</div>
        </div>
      </div>

      {/* ─── Row: Funnel + Momentum ──────────────────────────── */}
      <div className="an-row-2">
        {/* Conversion Funnel */}
        <div className="an-card">
          <h3 className="an-card-title">Application Funnel</h3>
          {funnel.length === 0 ? (
            <div className="an-empty">No applications yet</div>
          ) : (
            <div className="an-funnel">
              {funnel.map((stage, idx) => (
                <div key={`${stage.name}-${idx}`} className="an-funnel-row">
                  <div className="an-funnel-label">
                    <span className="an-funnel-dot" style={{ background: stage.color }} />
                    {stage.name}
                  </div>
                  <div className="an-funnel-bar-wrap">
                    <div
                      className="an-funnel-bar"
                      style={{
                        width: `${Math.max((stage.count / maxFunnel) * 100, 4)}%`,
                        background: stage.color,
                      }}
                    />
                  </div>
                  <div className="an-funnel-count">{stage.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Momentum Gauge */}
        <div className="an-card an-momentum-card">
          <h3 className="an-card-title">Momentum Score</h3>
          <div className="an-gauge-wrap">
            <svg viewBox="0 0 120 120" className="an-gauge">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border-secondary)" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="50" fill="none"
                stroke="var(--accent-primary)"
                strokeWidth="10"
                strokeDasharray={`${(momentum?.score ?? 0) * 3.14} 314`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                style={{ transition: "stroke-dasharray 1s ease" }}
              />
              <text x="60" y="60" textAnchor="middle" dy="8" className="an-gauge-text">
                {momentum?.score ?? 0}
              </text>
            </svg>
          </div>
          <div className="an-momentum-details">
            {momentum?.breakdown && Object.entries(momentum.breakdown).map(([key, val]: [string, any]) => (
              <div key={key} className="an-momentum-row">
                <span className="an-momentum-label">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                <div className="an-momentum-bar-wrap">
                  <div className="an-momentum-bar" style={{ width: `${val}%` }} />
                </div>
                <span className="an-momentum-val">{val}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Weekly Activity ─────────────────────────────────── */}
      <div className="an-card">
        <h3 className="an-card-title">Weekly Activity (Last 12 Weeks)</h3>
        {activity.length === 0 ? (
          <div className="an-empty">No activity data yet</div>
        ) : (
          <div className="an-activity-chart">
            {activity.slice(-12).map((week) => (
              <div key={week.week} className="an-activity-bar-wrap">
                <div
                  className="an-activity-bar"
                  style={{ height: `${Math.max((week.count / maxActivity) * 100, 4)}%` }}
                  title={`${week.week}: ${week.count} apps`}
                />
                <div className="an-activity-label">{week.week.slice(5)}</div>
                <div className="an-activity-count">{week.count}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Row: Sources + Time in Stage ────────────────────── */}
      <div className="an-row-2">
        {/* Source Performance */}
        <div className="an-card">
          <h3 className="an-card-title">Source Performance</h3>
          {sources.length === 0 ? (
            <div className="an-empty">No source data yet</div>
          ) : (
            <div className="an-sources">
              {sources.map((src) => (
                <div key={src.source} className="an-source-row">
                  <div className="an-source-label">{src.source.replace(/_/g, " ")}</div>
                  <div className="an-source-bars">
                    <div className="an-source-bar total" style={{ width: `${Math.max((src.total / totalSourceApps) * 100, 8)}%` }}>
                      {src.total}
                    </div>
                    {src.responded > 0 && (
                      <div className="an-source-bar responded" style={{ width: `${(src.responded / totalSourceApps) * 100}%` }}>
                        {src.responded}
                      </div>
                    )}
                  </div>
                  <div className="an-source-rate">{src.responseRate}%</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Time in Stage */}
        <div className="an-card">
          <h3 className="an-card-title">Avg. Time in Stage</h3>
          {timeInStage.length === 0 ? (
            <div className="an-empty">Not enough data yet</div>
          ) : (
            <div className="an-time-stages">
              {timeInStage.map((ts, idx) => {
                const maxDays = Math.max(...timeInStage.map((t) => t.avgDays), 1);
                return (
                  <div key={`${ts.stage}-${idx}`} className="an-time-row">
                    <div className="an-time-label">{ts.stage}</div>
                    <div className="an-time-bar-wrap">
                      <div className="an-time-bar" style={{ width: `${(ts.avgDays / maxDays) * 100}%` }} />
                    </div>
                    <div className="an-time-val">{ts.avgDays}d</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Row: Resume Performance + Salary ────────────────── */}
      <div className="an-row-2">
        {/* Resume Performance */}
        <div className="an-card">
          <h3 className="an-card-title">Resume Performance</h3>
          {resumes.length === 0 ? (
            <div className="an-empty">Upload resumes to track performance</div>
          ) : (
            <table className="an-table">
              <thead>
                <tr>
                  <th>Resume</th>
                  <th>Apps</th>
                  <th>Response</th>
                </tr>
              </thead>
              <tbody>
                {resumes.map((r) => (
                  <tr key={r.id}>
                    <td className="an-table-label">{r.label}</td>
                    <td>{r.totalApplications}</td>
                    <td>
                      <span className={`an-rate-badge ${r.responseRate >= 30 ? "good" : r.responseRate >= 15 ? "ok" : "low"}`}>
                        {r.responseRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Salary Distribution */}
        <div className="an-card">
          <h3 className="an-card-title">Salary Ranges</h3>
          {salary.length === 0 ? (
            <div className="an-empty">Add salary data to applications</div>
          ) : (
            <div className="an-salary">
              {salary.slice(0, 8).map((s, i) => {
                const maxSal = Math.max(...salary.map((x) => x.max), 1);
                return (
                  <div key={i} className="an-salary-row">
                    <div className="an-salary-label" title={s.role}>{s.company}</div>
                    <div className="an-salary-bar-wrap">
                      <div
                        className="an-salary-bar"
                        style={{
                          left: `${(s.min / maxSal) * 100}%`,
                          width: `${Math.max(((s.max - s.min) / maxSal) * 100, 3)}%`,
                        }}
                      />
                    </div>
                    <div className="an-salary-val">
                      {s.currency === "USD" ? "$" : s.currency}{(s.min / 1000).toFixed(0)}k-{(s.max / 1000).toFixed(0)}k
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
