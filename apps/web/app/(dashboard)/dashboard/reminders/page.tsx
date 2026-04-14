"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/context";

type FilterTab = "upcoming" | "FOLLOW_UP" | "INTERVIEW_PREP" | "all";

export default function RemindersPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [reminders, setReminders] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [fetching, setFetching] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newReminder, setNewReminder] = useState({ message: "", type: "CUSTOM", remindAt: "", applicationId: "" });
  const [applications, setApplications] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [reminderError, setReminderError] = useState("");
  const token = session?.accessToken as string;

  useEffect(() => {
    if (!token) return;
    api.getReminders(token).then(setReminders).catch(() => {}).finally(() => setFetching(false));
    api.getAllApplications(token).then(setApplications).catch(() => {});
  }, [token]);

  const filtered = reminders.filter((r) => {
    if (filter === "upcoming") return !r.isSent && !r.isDismissed && new Date(r.remindAt) > new Date();
    if (filter === "all") return true;
    return r.type === filter;
  });

  const handleCreate = async (combinedRemindAt: string) => {
    if (!combinedRemindAt || !newReminder.message || !token) return;
    setCreating(true);
    try {
      const body: any = { ...newReminder, remindAt: combinedRemindAt };
      if (!body.applicationId) delete body.applicationId;
      const created = await api.createReminder(body, token);
      setReminders((prev) => [created, ...prev]);
      setShowAdd(false);
      setNewReminder({ message: "", type: "CUSTOM", remindAt: "", applicationId: "" });
      setReminderDate("");
      setReminderTime("");
      setSubmitted(false);
      setReminderError("");
    } catch (err: any) {
      setReminderError(err.message || "Failed to create reminder.");
    } finally { setCreating(false); }
  };

  const handleCreateValidated = () => {
    setSubmitted(true);
    if (!newReminder.message || !reminderDate || !reminderTime) return;
    const combinedRemindAt = new Date(`${reminderDate}T${reminderTime}`).toISOString();
    handleCreate(combinedRemindAt);
  };

  const handleDismiss = async (id: string) => {
    try {
      await api.dismissReminder(id, token);
      setReminders((prev) => prev.map((r) => r.id === id ? { ...r, isDismissed: true } : r));
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteReminder(id, token);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch {}
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "FOLLOW_UP": return "📬";
      case "INTERVIEW_PREP": return "🎯";
      case "OFFER_DEADLINE": return "⏳";
      case "STALE_CARD": return "💤";
      default: return "🔔";
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "FOLLOW_UP": return "var(--info)";
      case "INTERVIEW_PREP": return "var(--warning)";
      case "OFFER_DEADLINE": return "var(--danger)";
      case "STALE_CARD": return "var(--text-muted)";
      default: return "var(--accent-primary)";
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days <= 7) return `In ${days} days`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "upcoming", label: t.reminders.upcoming, count: reminders.filter((r) => !r.isSent && !r.isDismissed && new Date(r.remindAt) > new Date()).length },
    { key: "FOLLOW_UP", label: "Follow-ups", count: reminders.filter((r) => r.type === "FOLLOW_UP").length },
    { key: "INTERVIEW_PREP", label: "Interview Prep", count: reminders.filter((r) => r.type === "INTERVIEW_PREP").length },
    { key: "all", label: t.common.all, count: reminders.length },
  ];

  return (
    <div style={{ maxWidth: 800, animation: "fadeInUp var(--duration-normal) var(--ease-smooth)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
        <div>
          <h2 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, marginBottom: "var(--space-2)" }}>{t.reminders.title} ⏰</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>{t.reminders.subtitle}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>+ {t.reminders.newReminder}</button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className="board-filter-btn"
            onClick={() => setFilter(tab.key)}
            style={filter === tab.key ? { borderColor: "var(--accent-primary)", color: "var(--accent-primary)", background: "var(--accent-primary-subtle)" } : {}}
          >
            {tab.label} <span style={{ opacity: 0.6, marginLeft: 4 }}>({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Add Reminder Form */}
      {showAdd && (
        <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-4)" }}>
          <h3 style={{ fontSize: "var(--text-md)", fontWeight: 700, marginBottom: "var(--space-4)" }}>New Reminder</h3>
          {reminderError && (
            <div style={{ padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)", background: "hsla(0, 70%, 50%, 0.1)", border: "1px solid hsla(0, 70%, 50%, 0.2)", color: "var(--danger)", fontSize: "var(--text-sm)", marginBottom: "var(--space-3)" }}>
              ⚠️ {reminderError}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div>
              <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Message *</label>
              <input className="input" placeholder="e.g. Follow up with Google" value={newReminder.message} onChange={(e) => setNewReminder({ ...newReminder, message: e.target.value })} style={{ marginTop: 4, borderColor: submitted && !newReminder.message ? "var(--danger)" : undefined }} />
              {submitted && !newReminder.message && <span style={{ fontSize: "var(--text-xs)", color: "var(--danger)", marginTop: 2 }}>Message is required</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Type</label>
                <select className="input" value={newReminder.type} onChange={(e) => setNewReminder({ ...newReminder, type: e.target.value })} style={{ marginTop: 4 }}>
                  <option value="CUSTOM">Custom</option>
                  <option value="FOLLOW_UP">Follow-up</option>
                  <option value="INTERVIEW_PREP">Interview Prep</option>
                  <option value="OFFER_DEADLINE">Offer Deadline</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Date *</label>
                <input type="date" className="input" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} style={{ marginTop: 4, borderColor: submitted && !reminderDate ? "var(--danger)" : undefined }} />
                {submitted && !reminderDate && <span style={{ fontSize: "var(--text-xs)", color: "var(--danger)", marginTop: 2 }}>Date is required</span>}
              </div>
            </div>
            <div>
              <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Time *</label>
              <input type="time" className="input" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} style={{ marginTop: 4, borderColor: submitted && !reminderTime ? "var(--danger)" : undefined }} />
              {submitted && !reminderTime && <span style={{ fontSize: "var(--text-xs)", color: "var(--danger)", marginTop: 2 }}>Time is required</span>}
            </div>
            <div>
              <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Link Application</label>
              <select className="input" value={newReminder.applicationId} onChange={(e) => setNewReminder({ ...newReminder, applicationId: e.target.value })} style={{ marginTop: 4 }}>
                <option value="">No application linked</option>
                {applications.map((a: any) => <option key={a.id} value={a.id}>{a.companyName} – {a.roleTitle} ({a.column?.campaign?.name})</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowAdd(false); setSubmitted(false); setReminderError(""); }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreateValidated} disabled={creating}>
                {creating ? "Creating..." : "Create Reminder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminders List */}
      {fetching ? (
        <div className="card" style={{ padding: "var(--space-8)", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)" }}>Loading reminders...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {filtered.map((r) => (
            <div key={r.id} className="card" style={{
              padding: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-4)",
              opacity: r.isDismissed ? 0.5 : 1,
              borderLeft: `3px solid ${typeColor(r.type)}`,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-lg)", background: "var(--bg-tertiary)", flexShrink: 0 }}>
                {typeIcon(r.type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: 2 }}>{r.message}</div>
                <div style={{ display: "flex", gap: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  <span style={{ color: typeColor(r.type) }}>{formatDate(r.remindAt)}</span>
                  <span>{r.type.replace(/_/g, " ")}</span>
                  {r.application && <span>• {r.application.companyName} — {r.application.roleTitle}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
                {!r.isDismissed && (
                  <button className="btn btn-secondary btn-sm" onClick={() => handleDismiss(r.id)}>Dismiss</button>
                )}
                <button className="btn btn-sm" style={{ background: "transparent", border: "1px solid var(--danger)", color: "var(--danger)" }} onClick={() => handleDelete(r.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: "var(--space-10)", textAlign: "center" }}>
          <div style={{ fontSize: "var(--text-4xl)", marginBottom: "var(--space-3)" }}>🔔</div>
          <h3 style={{ fontSize: "var(--text-md)", fontWeight: 700, marginBottom: "var(--space-2)" }}>No reminders {filter !== "all" ? "in this category" : "yet"}</h3>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", maxWidth: 320, margin: "0 auto", lineHeight: "var(--leading-relaxed)" }}>
            Reminders are created automatically when you add applications. You can also create custom ones.
          </p>
        </div>
      )}
    </div>
  );
}
