"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import ConfirmModal from "@/components/ConfirmModal";
import { useI18n } from "@/lib/i18n/context";
import "./vault.css";

export default function VaultPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const router = useRouter();
  const token = session?.accessToken as string;

  const [activeTab, setActiveTab] = useState<"jd" | "archivedJd" | "archivedApp">("jd");
  const [jds, setJds] = useState<any[]>([]);
  const [archivedApps, setArchivedApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | active
  const [sort, setSort] = useState("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [searchDebounce, setSearchDebounce] = useState("");
  const [aiProcessing, setAiProcessing] = useState<Record<string, boolean>>({});
  const [pdfProcessing, setPdfProcessing] = useState<Record<string, boolean>>({});

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchJDs = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getJobDescriptions({ search: searchDebounce || undefined, sort }, token);
      setJds(data);
    } catch {}
  }, [token, searchDebounce, sort]);

  const fetchArchived = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getArchivedApplications(token);
      setArchivedApps(data);
    } catch {}
  }, [token]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchJDs(), fetchArchived()]).finally(() => setLoading(false));
  }, [fetchJDs, fetchArchived]);

  // Derived lists
  const activeJDs = jds.filter((jd) => !jd.isArchived);
  const archivedJDs = jds.filter((jd) => jd.isArchived);

  const handleArchiveJD = async (id: string, isArchived: boolean) => {
    if (!token) return;
    try {
      await api.archiveJobDescription(id, isArchived, token);
      fetchJDs();
    } catch {}
  };

  const handleDeleteJD = async (id: string) => {
    if (!token) return;
    try {
      await api.deleteJobDescription(id, token);
      setDeleteTarget(null);
      fetchJDs();
    } catch {}
  };

  const handleUnarchiveApp = async (id: string) => {
    if (!token) return;
    try {
      await api.archiveApplication(id, false, token);
      fetchArchived();
    } catch {}
  };

  const handleExportPdf = async (id: string) => {
    setPdfProcessing((prev) => ({ ...prev, [id]: true }));
    try {
      const url = api.getJDExportUrl(id);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const jd = jds.find((j) => j.id === id);
      const filename = jd
        ? `${jd.companyName.replace(/[^a-zA-Z0-9]/g, "_")}_${jd.roleTitle.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
        : "job_description.pdf";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (err: any) {
      alert(`PDF export failed: ${err.message || "Unknown error"}`);
    } finally {
      setPdfProcessing((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleSummarize = async (id: string) => {
    if (!token) return;
    setAiProcessing((prev) => ({ ...prev, [id]: true }));
    try {
      await api.reanalyzeJobDescription(id, token);
      await fetchJDs();
    } catch (err: any) {
      alert(err.message || "AI summarization failed");
    } finally {
      setAiProcessing((prev) => ({ ...prev, [id]: false }));
    }
  };

  const highlightSearch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts
      .map((part) =>
        part.toLowerCase() === query.toLowerCase() ? `<mark class="vault-highlight">${part}</mark>` : part
      )
      .join("");
  };

  const renderJDCard = (jd: any) => (
    <div key={jd.id} className={`vault-card ${jd.isArchived ? "archived" : ""}`}>
      <div className="vault-card-header" onClick={() => setExpandedId(expandedId === jd.id ? null : jd.id)}>
        <div className="vault-card-info">
          <div className="vault-card-company">{jd.companyName}</div>
          <div className="vault-card-role">{jd.roleTitle}</div>
          <div className="vault-card-meta">
            {jd.application ? (
              <span
                className="vault-badge active"
                style={{ background: jd.application.column?.color + "22", color: jd.application.column?.color }}
              >
                {jd.application.column?.name}
              </span>
            ) : (
              <span className="vault-badge orphan">Unlinked</span>
            )}
            <span className="vault-date">{new Date(jd.createdAt).toLocaleDateString()}</span>
            {jd.isArchived && <span className="vault-badge archived-badge">Archived</span>}
          </div>
        </div>
        <div className="vault-card-expand">{expandedId === jd.id ? "▲" : "▼"}</div>
      </div>

      {/* Keywords */}
      {(jd.skills?.length > 0 || jd.experience?.length > 0) && (
        <div className="vault-keywords">
          {jd.skills?.slice(0, 8).map((s: string, i: number) => (
            <span key={`skill-${i}`} className="vault-keyword skill">
              {s}
            </span>
          ))}
          {jd.experience?.slice(0, 3).map((e: string, i: number) => (
            <span key={`exp-${i}`} className="vault-keyword exp">
              {e}
            </span>
          ))}
          {jd.education?.slice(0, 2).map((e: string, i: number) => (
            <span key={`edu-${i}`} className="vault-keyword edu">
              {e}
            </span>
          ))}
        </div>
      )}

      {/* Expanded Content */}
      {expandedId === jd.id && (
        <div className="vault-card-body">
          <div
            className="vault-jd-content"
            dangerouslySetInnerHTML={{
              __html: highlightSearch(
                (jd.structured || jd.content || "")
                  .replace(/\n/g, "<br/>")
                  .replace(/^## (.+)/gm, '<h3 class="vault-jd-h3">$1</h3>')
                  .replace(/^### (.+)/gm, '<h4 class="vault-jd-h4">$1</h4>')
                  .replace(/^- (.+)/gm, "<li>$1</li>"),
                searchDebounce
              ),
            }}
          />
          <div className="vault-card-actions">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => handleExportPdf(jd.id)}
              disabled={pdfProcessing[jd.id]}
            >
              {pdfProcessing[jd.id] ? "⏳ Generating..." : "📥 Export PDF"}
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => handleSummarize(jd.id)}
              disabled={aiProcessing[jd.id]}
            >
              {aiProcessing[jd.id] ? (
                <span className="vault-ai-loading">⏳ AI Processing...</span>
              ) : (
                "🤖 Summarize with AI"
              )}
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => handleArchiveJD(jd.id, !jd.isArchived)}>
              {jd.isArchived ? "📂 Unarchive" : "🗃️ Archive"}
            </button>
            {jd.application && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => router.push(`/dashboard/application/${jd.application.id}`)}
              >
                👁️ View Application
              </button>
            )}
            <button
              className="btn btn-sm btn-danger"
              onClick={() => setDeleteTarget({ id: jd.id, name: `${jd.companyName} - ${jd.roleTitle}` })}
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="vault-page">
      {/* Header */}
      <div className="vault-header">
        <div>
          <h2 className="vault-title">📚 {t.vault.title}</h2>
          <p className="vault-subtitle">{t.vault.subtitle}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="vault-tabs">
        <button className={`vault-tab ${activeTab === "jd" ? "active" : ""}`} onClick={() => setActiveTab("jd")}>
          📄 {t.application.jobDescription} <span className="vault-tab-count">{activeJDs.length}</span>
        </button>
        <button
          className={`vault-tab ${activeTab === "archivedJd" ? "active" : ""}`}
          onClick={() => setActiveTab("archivedJd")}
        >
          🗃️ {t.common.archived} JDs <span className="vault-tab-count">{archivedJDs.length}</span>
        </button>
        <button
          className={`vault-tab ${activeTab === "archivedApp" ? "active" : ""}`}
          onClick={() => setActiveTab("archivedApp")}
        >
          📦 {t.vault.archivedApps} <span className="vault-tab-count">{archivedApps.length}</span>
        </button>
      </div>

      {/* JD Tab (Active) */}
      {activeTab === "jd" && (
        <>
          {/* Search & Filters */}
          <div className="vault-toolbar">
            <div className="vault-search-wrap">
              <span className="vault-search-icon">🔍</span>
              <input
                className="vault-search"
                type="text"
                placeholder={t.vault.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="vault-search-clear" onClick={() => setSearch("")}>
                  ✕
                </button>
              )}
            </div>
            <div className="vault-filters">
              <select className="vault-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="company">Company A-Z</option>
              </select>
            </div>
          </div>

          {/* JD List */}
          {loading ? (
            <div className="vault-empty">
              <p>Loading...</p>
            </div>
          ) : activeJDs.length === 0 ? (
            <div className="vault-empty card">
              <div style={{ fontSize: "3rem", marginBottom: "var(--space-3)" }}>📄</div>
              <h3>No job descriptions yet</h3>
              <p>Job descriptions are automatically saved when you add applications with JD text.</p>
            </div>
          ) : (
            <div className="vault-list">{activeJDs.map(renderJDCard)}</div>
          )}
        </>
      )}

      {/* Archived JDs Tab */}
      {activeTab === "archivedJd" && (
        <>
          {loading ? (
            <div className="vault-empty">
              <p>Loading...</p>
            </div>
          ) : archivedJDs.length === 0 ? (
            <div className="vault-empty card">
              <div style={{ fontSize: "3rem", marginBottom: "var(--space-3)" }}>🗃️</div>
              <h3>No archived job descriptions</h3>
              <p>Archive job descriptions from the expanded card view to keep them here separately.</p>
            </div>
          ) : (
            <div className="vault-list">{archivedJDs.map(renderJDCard)}</div>
          )}
        </>
      )}

      {/* Archived Applications Tab */}
      {activeTab === "archivedApp" && (
        <>
          {loading ? (
            <div className="vault-empty">
              <p>Loading...</p>
            </div>
          ) : archivedApps.length === 0 ? (
            <div className="vault-empty card">
              <div style={{ fontSize: "3rem", marginBottom: "var(--space-3)" }}>📦</div>
              <h3>No archived applications</h3>
              <p>Archive applications from the application detail page to see them here.</p>
            </div>
          ) : (
            <div className="vault-list">
              {archivedApps.map((app) => (
                <div key={app.id} className="vault-card archived-app">
                  <div
                    className="vault-card-header"
                    onClick={() => router.push(`/dashboard/application/${app.id}`)}
                  >
                    <div className="vault-card-info">
                      <div className="vault-card-company">{app.companyName}</div>
                      <div className="vault-card-role">{app.roleTitle}</div>
                      <div className="vault-card-meta">
                        <span
                          className="vault-badge"
                          style={{ background: app.column?.color + "22", color: app.column?.color }}
                        >
                          Last: {app.column?.name}
                        </span>
                        <span className="vault-date">{new Date(app.updatedAt).toLocaleDateString()}</span>
                        {app.tags?.map((t: any) => (
                          <span key={t.tag.id} className="vault-keyword skill">
                            {t.tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnarchiveApp(app.id);
                        }}
                      >
                        📂 Unarchive
                      </button>
                      <span className="vault-card-expand">→</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmModal
          open={!!deleteTarget}
          title="Delete Job Description"
          message={`Are you sure you want to permanently delete the JD for "${deleteTarget.name}"?`}
          confirmLabel="Delete"
          onConfirm={() => handleDeleteJD(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
