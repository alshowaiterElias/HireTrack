"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import ConfirmModal from "@/components/ConfirmModal";
import { useI18n } from "@/lib/i18n/context";
import "./application.css";

type TabKey = "timeline" | "notes" | "contacts" | "attachments" | "tags";

export default function ApplicationDetailPage() {
  const params = useParams();
  const appId = params.id as string;
  const { data: session } = useSession();
  const { t } = useI18n();
  const token = session?.accessToken as string;
  const router = useRouter();

  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("timeline");
  const [editing, setEditing] = useState(false);
  const [resumes, setResumes] = useState<any[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; label: string } | null>(null);

  // Edit form
  const [editForm, setEditForm] = useState<any>({});

  // Add forms
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteForm, setNoteForm] = useState({ content: "", type: "GENERAL" });
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", role: "", email: "", linkedinUrl: "", phone: "", notes: "" });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const attachRef = useRef<HTMLInputElement>(null);

  // View/Edit popups
  const [viewNote, setViewNote] = useState<any>(null);
  const [editNoteForm, setEditNoteForm] = useState({ content: "", type: "GENERAL" });
  const [viewContact, setViewContact] = useState<any>(null);
  const [editContactForm, setEditContactForm] = useState({ name: "", role: "", email: "", linkedinUrl: "", phone: "", notes: "" });
  const [editingItem, setEditingItem] = useState(false);

  const fetchApp = useCallback(async () => {
    if (!token || !appId) return;
    try {
      const data = await api.getApplication(appId, token);
      setApp(data);
      setEditForm({
        companyName: data.companyName || "",
        roleTitle: data.roleTitle || "",
        jobUrl: data.jobUrl || "",
        jobDescription: data.jobDescription || "",
        location: data.location || "",
        workType: data.workType || "REMOTE",
        salaryMin: data.salaryMin || "",
        salaryMax: data.salaryMax || "",
        currency: data.currency || "USD",
        source: data.source || "OTHER",
        priority: data.priority || "MEDIUM",
        resumeVersionId: data.resumeVersionId || "",
        coverLetter: data.coverLetter || "",
      });
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token, appId]);

  useEffect(() => { fetchApp(); }, [fetchApp]);

  useEffect(() => {
    if (!token) return;
    api.getResumes(token).then(setResumes).catch(() => {});
  }, [token]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const formatShortDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // ─── Handlers ─────────────────────────────────────────────

  const handleSaveEdit = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const updated = await api.updateApplication(appId, editForm, token);
      setApp((prev: any) => ({ ...prev, ...updated }));
      setEditing(false);
    } catch {} finally { setSaving(false); }
  };

  const handleArchive = async () => {
    if (!token) return;
    const updated = await api.archiveApplication(appId, !app.isArchived, token);
    setApp((prev: any) => ({ ...prev, isArchived: updated.isArchived }));
  };

  const handleAddNote = async () => {
    if (!noteForm.content.trim() || !token) return;
    setSaving(true);
    try {
      const note = await api.addNote(appId, noteForm, token);
      setApp((prev: any) => ({ ...prev, notes: [note, ...(prev.notes || [])] }));
      setNoteForm({ content: "", type: "GENERAL" });
      setShowAddNote(false);
    } catch {} finally { setSaving(false); }
  };

  const handleAddContact = async () => {
    if (!contactForm.name.trim() || !token) return;
    setSaving(true);
    try {
      const contact = await api.addContact(appId, contactForm, token);
      setApp((prev: any) => ({ ...prev, contacts: [...(prev.contacts || []), contact] }));
      setContactForm({ name: "", role: "", email: "", linkedinUrl: "", phone: "", notes: "" });
      setShowAddContact(false);
    } catch {} finally { setSaving(false); }
  };

  const handleAddTag = async () => {
    if (!tagInput.trim() || !token) return;
    try {
      const result = await api.addTag(appId, tagInput.trim(), token);
      setApp((prev: any) => {
        const existing = (prev.tags || []).some((t: any) => t.tagId === result.tagId);
        if (existing) return prev;
        return { ...prev, tags: [...(prev.tags || []), result] };
      });
      setTagInput("");
    } catch {}
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!token) return;
    try {
      await api.removeTag(appId, tagId, token);
      setApp((prev: any) => ({ ...prev, tags: (prev.tags || []).filter((t: any) => t.tagId !== tagId) }));
    } catch {}
  };

  const handleUploadAttachment = async (file: File) => {
    if (!token) return;
    setSaving(true);
    try {
      const attachment = await api.uploadAttachment(appId, file, token);
      setApp((prev: any) => ({ ...prev, attachments: [attachment, ...(prev.attachments || [])] }));
    } catch {} finally { setSaving(false); }
  };

  const handleDownloadAttachment = async (attachId: string, fileName: string) => {
    if (!token) return;
    const url = api.getAttachmentDownloadUrl(appId, attachId);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await response.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const confirmDeleteItem = async () => {
    if (!deleteConfirm || !token) return;
    const { type, id } = deleteConfirm;
    setDeleteConfirm(null);
    try {
      if (type === "note") {
        await api.removeNote(appId, id, token);
        setApp((prev: any) => ({ ...prev, notes: (prev.notes || []).filter((n: any) => n.id !== id) }));
      } else if (type === "contact") {
        await api.removeContact(appId, id, token);
        setApp((prev: any) => ({ ...prev, contacts: (prev.contacts || []).filter((c: any) => c.id !== id) }));
      } else if (type === "attachment") {
        await api.removeAttachment(appId, id, token);
        setApp((prev: any) => ({ ...prev, attachments: (prev.attachments || []).filter((a: any) => a.id !== id) }));
      }
    } catch {}
  };

  const handleOpenNote = (note: any) => {
    setViewNote(note);
    setEditNoteForm({ content: note.content, type: note.type });
    setEditingItem(false);
  };

  const handleUpdateNote = async () => {
    if (!viewNote || !token) return;
    setSaving(true);
    try {
      const updated = await api.updateNote(appId, viewNote.id, editNoteForm, token);
      setApp((prev: any) => ({ ...prev, notes: (prev.notes || []).map((n: any) => n.id === viewNote.id ? { ...n, ...updated } : n) }));
      setViewNote(null);
      setEditingItem(false);
    } catch {} finally { setSaving(false); }
  };

  const handleOpenContact = (contact: any) => {
    setViewContact(contact);
    setEditContactForm({ name: contact.name || "", role: contact.role || "", email: contact.email || "", linkedinUrl: contact.linkedinUrl || "", phone: contact.phone || "", notes: contact.notes || "" });
    setEditingItem(false);
  };

  const handleUpdateContact = async () => {
    if (!viewContact || !token) return;
    setSaving(true);
    try {
      const updated = await api.updateContact(appId, viewContact.id, editContactForm, token);
      setApp((prev: any) => ({ ...prev, contacts: (prev.contacts || []).map((c: any) => c.id === viewContact.id ? { ...c, ...updated } : c) }));
      setViewContact(null);
      setEditingItem(false);
    } catch {} finally { setSaving(false); }
  };

  // ─── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="app-detail">
        <div className="skeleton" style={{ height: 18, width: 200, marginBottom: "var(--space-4)" }} />
        <div style={{ display: "flex", gap: "var(--space-4)", marginBottom: "var(--space-6)", padding: "var(--space-6)", background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-primary)" }}>
          <div className="skeleton" style={{ width: 64, height: 64, borderRadius: "var(--radius-md)", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <div className="skeleton" style={{ height: 24, width: "60%" }} />
            <div className="skeleton" style={{ height: 18, width: "40%" }} />
            <div className="skeleton" style={{ height: 14, width: "30%" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
          {[140, 90, 100, 120, 80].map((w, i) => (
            <div key={i} className="skeleton" style={{ height: 36, width: w, borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 72, width: "100%", borderRadius: "var(--radius-md)", marginBottom: "var(--space-3)" }} />
        ))}
      </div>
    );
  }

  if (!app) {
    return (
      <div className="app-detail" style={{ padding: "var(--space-8)", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "var(--space-3)" }}>📋</div>
        <h3>Application not found</h3>
        <button className="btn btn-secondary btn-sm" style={{ marginTop: "var(--space-3)" }} onClick={() => router.back()}>← {t.common.back}</button>
      </div>
    );
  }

  const col = app.column;
  const campaignName = col?.campaign?.name || "";
  const colColor = col?.color || "var(--accent-primary)";

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "timeline", label: "Timeline", count: app.statusChanges?.length || 0 },
    { key: "notes", label: t.application.notes, count: app.notes?.length || 0 },
    { key: "contacts", label: t.application.contacts, count: app.contacts?.length || 0 },
    { key: "attachments", label: t.application.attachments, count: app.attachments?.length || 0 },
    { key: "tags", label: t.application.tags, count: app.tags?.length || 0 },
  ];

  return (
    <div className="app-detail">
      {/* Breadcrumb */}
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--accent-primary)", cursor: "pointer", fontSize: "var(--text-xs)", padding: 0 }}>← {campaignName || "Board"}</button>
        <span>/</span>
        <span style={{ color: "var(--text-secondary)" }}>{app.companyName}</span>
      </div>

      {/* Header */}
      <div className="app-detail-header">
        <div className="app-detail-logo" style={{ background: colColor }}>{app.companyName?.[0] || "?"}</div>
        <div className="app-detail-info">
          <div className="app-detail-company">{app.companyName}</div>
          <div className="app-detail-role">{app.roleTitle}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <span className="app-detail-status" style={{ background: `${colColor}22`, color: colColor }}>{col?.name}</span>
            {app.isArchived && <span className="app-detail-status" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>Archived</span>}
            {app.priority && <span className="app-detail-status" style={{ background: app.priority === "HIGH" ? "hsla(0,70%,50%,0.1)" : app.priority === "LOW" ? "hsla(200,70%,50%,0.1)" : "var(--bg-tertiary)", color: app.priority === "HIGH" ? "var(--danger)" : app.priority === "LOW" ? "var(--info)" : "var(--text-muted)" }}>{app.priority}</span>}
          </div>
        </div>
        <div className="app-detail-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>✏️ Edit</button>
          <button className="btn btn-sm" onClick={handleArchive} style={{ background: app.isArchived ? "var(--success)" : "var(--bg-tertiary)", color: app.isArchived ? "white" : "var(--text-secondary)", border: "none" }}>
            {app.isArchived ? "📦 Unarchive" : "📦 Archive"}
          </button>
        </div>
      </div>

      {/* Meta Grid */}
      <div className="app-detail-meta">
        {app.location && <div className="app-meta-item"><div className="app-meta-label">Location</div><div className="app-meta-value">📍 {app.location}</div></div>}
        {app.workType && <div className="app-meta-item"><div className="app-meta-label">Work Type</div><div className="app-meta-value">{app.workType}</div></div>}
        {app.source && <div className="app-meta-item"><div className="app-meta-label">Source</div><div className="app-meta-value">{app.source}</div></div>}
        {(app.salaryMin || app.salaryMax) && <div className="app-meta-item"><div className="app-meta-label">Salary</div><div className="app-meta-value">{app.currency} {app.salaryMin && Number(app.salaryMin).toLocaleString()}{app.salaryMin && app.salaryMax ? " – " : ""}{app.salaryMax && Number(app.salaryMax).toLocaleString()}</div></div>}
        {app.appliedDate && <div className="app-meta-item"><div className="app-meta-label">Applied</div><div className="app-meta-value">{formatShortDate(app.appliedDate)}</div></div>}
        {app.interviewDate && <div className="app-meta-item"><div className="app-meta-label">Interview Date</div><div className="app-meta-value">📅 {new Date(app.interviewDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div></div>}
        {app.offerDeadline && <div className="app-meta-item"><div className="app-meta-label">Offer Deadline</div><div className="app-meta-value">⏰ {new Date(app.offerDeadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div></div>}
        {app.resumeVersion && <div className="app-meta-item"><div className="app-meta-label">Resume</div><div className="app-meta-value">📄 {app.resumeVersion.label}</div></div>}
        {app.jobUrl && <div className="app-meta-item"><div className="app-meta-label">Job URL</div><div className="app-meta-value"><a href={app.jobUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-primary)", fontSize: "var(--text-xs)", wordBreak: "break-all" }}>{app.jobUrl.replace(/https?:\/\//, "").substring(0, 40)}...</a></div></div>}
        <div className="app-meta-item"><div className="app-meta-label">Created</div><div className="app-meta-value">{formatShortDate(app.createdAt)}</div></div>
      </div>

      {/* Job Description */}
      {app.jobDescription && (
        <div className="card" style={{ padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <div className="app-meta-label" style={{ marginBottom: "var(--space-2)" }}>Job Description</div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: "var(--leading-relaxed)", whiteSpace: "pre-wrap" }}>{app.jobDescription}</div>
        </div>
      )}

      {/* Cover Letter */}
      {app.coverLetter && (
        <div className="card" style={{ padding: "var(--space-4)", marginBottom: "var(--space-6)" }}>
          <div className="app-meta-label" style={{ marginBottom: "var(--space-2)" }}>Cover Letter</div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: "var(--leading-relaxed)", whiteSpace: "pre-wrap" }}>{app.coverLetter}</div>
        </div>
      )}

      {/* Tabs */}
      <div className="app-tabs">
        {tabs.map((t) => (
          <button key={t.key} className={`app-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
            {t.count > 0 && <span className="app-tab-badge">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="app-section">
        {/* ─── Timeline ──────── */}
        {tab === "timeline" && (
          <div>
            <div className="app-section-title">Status History</div>
            {(app.statusChanges?.length || 0) === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>No status changes yet. Drag the card between columns to log changes.</p>
            ) : (
              <div className="timeline">
                {app.statusChanges.map((sc: any) => (
                  <div key={sc.id} className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <span style={{ fontWeight: 600 }}>{sc.fromColumn}</span>
                      <span style={{ margin: "0 6px", color: "var(--text-muted)" }}>→</span>
                      <span style={{ fontWeight: 600, color: "var(--accent-primary)" }}>{sc.toColumn}</span>
                    </div>
                    <div className="timeline-time">{formatDate(sc.changedAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Notes ──────── */}
        {tab === "notes" && (
          <div>
            <div className="app-section-title">
              <span>Notes</span>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddNote(!showAddNote)}>+ Add Note</button>
            </div>
            {showAddNote && (
              <div className="app-add-form" style={{ marginBottom: "var(--space-4)" }}>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Type</label>
                  <select className="input" value={noteForm.type} onChange={(e) => setNoteForm({ ...noteForm, type: e.target.value })} style={{ marginTop: 4 }}>
                    <option value="GENERAL">General</option>
                    <option value="INTERVIEW_PREP">Interview Prep</option>
                    <option value="FEEDBACK">Feedback</option>
                    <option value="POST_INTERVIEW">Post-Interview</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Content *</label>
                  <textarea className="input" rows={4} placeholder="Write your note..." value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })} style={{ marginTop: 4, resize: "vertical", fontFamily: "inherit" }} />
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowAddNote(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={saving || !noteForm.content.trim()}>{saving ? "Saving..." : "Save Note"}</button>
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {(app.notes || []).map((n: any) => (
                <div key={n.id} className="app-item" style={{ cursor: "pointer" }} onClick={() => handleOpenNote(n)}>
                  <div className="app-item-header">
                    <div>
                      <span className="app-item-title">{n.type === "GENERAL" ? "📝" : n.type === "INTERVIEW_PREP" ? "🎯" : n.type === "FEEDBACK" ? "💬" : "📋"} {n.type.replace(/_/g, " ")}</span>
                      <span className="app-item-meta" style={{ marginLeft: 8 }}>{formatDate(n.createdAt)}</span>
                    </div>
                    <button className="app-item-delete" onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: "note", id: n.id, label: `note from ${formatShortDate(n.createdAt)}` }); }}>✕</button>
                  </div>
                  <div className="app-item-body" style={{ whiteSpace: "pre-wrap", marginTop: "var(--space-2)" }}>{n.content.length > 120 ? n.content.substring(0, 120) + "..." : n.content}</div>
                </div>
              ))}
              {(app.notes?.length || 0) === 0 && !showAddNote && <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>No notes yet.</p>}
            </div>
          </div>
        )}

        {/* ─── Contacts ──────── */}
        {tab === "contacts" && (
          <div>
            <div className="app-section-title">
              <span>Contacts</span>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddContact(!showAddContact)}>+ Add Contact</button>
            </div>
            {showAddContact && (
              <div className="app-add-form" style={{ marginBottom: "var(--space-4)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  <div>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Name *</label>
                    <input className="input" placeholder="Contact name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} style={{ marginTop: 4 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Role</label>
                    <input className="input" placeholder="e.g. Recruiter, Hiring Manager" value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })} style={{ marginTop: 4 }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  <div>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Email</label>
                    <input className="input" type="email" placeholder="email@example.com" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} style={{ marginTop: 4 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Phone</label>
                    <input className="input" placeholder="+1 (555) ..." value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} style={{ marginTop: 4 }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>LinkedIn URL</label>
                  <input className="input" placeholder="https://linkedin.com/in/..." value={contactForm.linkedinUrl} onChange={(e) => setContactForm({ ...contactForm, linkedinUrl: e.target.value })} style={{ marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Notes</label>
                  <textarea className="input" rows={2} placeholder="Additional notes..." value={contactForm.notes} onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })} style={{ marginTop: 4, resize: "vertical", fontFamily: "inherit" }} />
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowAddContact(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={handleAddContact} disabled={saving || !contactForm.name.trim()}>{saving ? "Saving..." : "Save Contact"}</button>
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {(app.contacts || []).map((c: any) => (
                <div key={c.id} className="app-item" style={{ cursor: "pointer" }} onClick={() => handleOpenContact(c)}>
                  <div className="app-item-header">
                    <div>
                      <span className="app-item-title">👤 {c.name}</span>
                      {c.role && <span className="app-item-meta" style={{ marginLeft: 8 }}>• {c.role}</span>}
                    </div>
                    <button className="app-item-delete" onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: "contact", id: c.id, label: c.name }); }}>✕</button>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap", marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                    {c.email && <span>✉️ {c.email}</span>}
                    {c.phone && <span>📞 {c.phone}</span>}
                    {c.linkedinUrl && <span style={{ color: "var(--accent-primary)" }}>🔗 LinkedIn</span>}
                  </div>
                  {c.notes && <div className="app-item-body" style={{ marginTop: "var(--space-2)" }}>{c.notes.length > 80 ? c.notes.substring(0, 80) + "..." : c.notes}</div>}
                </div>
              ))}
              {(app.contacts?.length || 0) === 0 && !showAddContact && <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>No contacts yet.</p>}
            </div>
          </div>
        )}

        {/* ─── Attachments ──────── */}
        {tab === "attachments" && (
          <div>
            <div className="app-section-title">
              <span>Attachments</span>
              <button className="btn btn-primary btn-sm" onClick={() => attachRef.current?.click()}>+ Upload File</button>
              <input ref={attachRef} type="file" hidden onChange={(e) => { if (e.target.files?.[0]) handleUploadAttachment(e.target.files[0]); e.target.value = ""; }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {(app.attachments || []).map((a: any) => (
                <div key={a.id} className="app-item">
                  <div className="app-item-header">
                    <div>
                      <span className="app-item-title">📎 {a.fileName}</span>
                      <span className="app-item-meta" style={{ marginLeft: 8 }}>{(a.fileSize / 1024).toFixed(1)} KB • {formatShortDate(a.createdAt)}</span>
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-2)" }}>
                      <button className="btn btn-secondary btn-sm" style={{ fontSize: "var(--text-xs)", padding: "2px 8px" }} onClick={() => handleDownloadAttachment(a.id, a.fileName)}>⬇</button>
                      <button className="app-item-delete" style={{ opacity: 1 }} onClick={() => setDeleteConfirm({ type: "attachment", id: a.id, label: a.fileName })}>✕</button>
                    </div>
                  </div>
                </div>
              ))}
              {(app.attachments?.length || 0) === 0 && <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>No attachments yet. Upload files like offer letters, contracts, etc.</p>}
            </div>
          </div>
        )}

        {/* ─── Tags ──────── */}
        {tab === "tags" && (
          <div>
            <div className="app-section-title">Tags</div>
            <div className="app-tags">
              {(app.tags || []).map((at: any) => (
                <span key={at.tagId} className="app-tag" style={{ background: `${at.tag?.color || "#6366f1"}22`, color: at.tag?.color || "var(--accent-primary)" }}>
                  {at.tag?.name || at.tagId}
                  <button className="app-tag-remove" onClick={() => handleRemoveTag(at.tagId)}>✕</button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)", maxWidth: 400 }}>
              <input className="input" placeholder="Add a tag..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddTag()} style={{ flex: 1 }} />
              <button className="btn btn-primary btn-sm" onClick={handleAddTag} disabled={!tagInput.trim()}>Add</button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="app-edit-overlay" onClick={() => setEditing(false)}>
          <div className="card app-edit-card" onClick={(e) => e.stopPropagation()} style={{ padding: "var(--space-6)" }}>
            <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: "var(--space-4)" }}>Edit Application</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Company *</label>
                  <input className="input" value={editForm.companyName} onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })} style={{ marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Role *</label>
                  <input className="input" value={editForm.roleTitle} onChange={(e) => setEditForm({ ...editForm, roleTitle: e.target.value })} style={{ marginTop: 4 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Job URL</label>
                <input className="input" value={editForm.jobUrl} onChange={(e) => setEditForm({ ...editForm, jobUrl: e.target.value })} style={{ marginTop: 4 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Location</label>
                  <input className="input" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} style={{ marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Work Type</label>
                  <select className="input" value={editForm.workType} onChange={(e) => setEditForm({ ...editForm, workType: e.target.value })} style={{ marginTop: 4 }}>
                    <option value="REMOTE">Remote</option><option value="HYBRID">Hybrid</option><option value="ONSITE">Onsite</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Source</label>
                  <select className="input" value={editForm.source} onChange={(e) => setEditForm({ ...editForm, source: e.target.value })} style={{ marginTop: 4 }}>
                    <option value="LINKEDIN">LinkedIn</option><option value="INDEED">Indeed</option><option value="GLASSDOOR">Glassdoor</option><option value="ANGELLIST">AngelList</option><option value="COMPANY_SITE">Company Site</option><option value="REFERRAL">Referral</option><option value="RECRUITER">Recruiter</option><option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Priority</label>
                  <select className="input" value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} style={{ marginTop: 4 }}>
                    <option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Currency</label>
                  <select className="input" value={editForm.currency} onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })} style={{ marginTop: 4 }}>
                    <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="CAD">CAD</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Salary Min</label>
                  <input className="input" type="number" value={editForm.salaryMin} onChange={(e) => setEditForm({ ...editForm, salaryMin: e.target.value ? Number(e.target.value) : "" })} style={{ marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Salary Max</label>
                  <input className="input" type="number" value={editForm.salaryMax} onChange={(e) => setEditForm({ ...editForm, salaryMax: e.target.value ? Number(e.target.value) : "" })} style={{ marginTop: 4 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Resume</label>
                <select className="input" value={editForm.resumeVersionId} onChange={(e) => setEditForm({ ...editForm, resumeVersionId: e.target.value || null })} style={{ marginTop: 4 }}>
                  <option value="">No resume linked</option>
                  {resumes.map((r: any) => <option key={r.id} value={r.id}>{r.label} ({r.fileName})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Job Description</label>
                <textarea className="input" rows={4} value={editForm.jobDescription} onChange={(e) => setEditForm({ ...editForm, jobDescription: e.target.value })} style={{ marginTop: 4, resize: "vertical", fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Cover Letter</label>
                <textarea className="input" rows={4} value={editForm.coverLetter} onChange={(e) => setEditForm({ ...editForm, coverLetter: e.target.value })} style={{ marginTop: 4, resize: "vertical", fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveEdit} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={!!deleteConfirm}
        title={`Delete ${deleteConfirm?.type || "Item"}`}
        message={`Are you sure you want to delete "${deleteConfirm?.label}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDeleteItem}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* View/Edit Note Modal */}
      {viewNote && (
        <div className="app-edit-overlay" onClick={() => { setViewNote(null); setEditingItem(false); }}>
          <div className="card app-edit-card" onClick={(e) => e.stopPropagation()} style={{ padding: "var(--space-6)", maxWidth: 520 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700 }}>
                {viewNote.type === "GENERAL" ? "📝" : viewNote.type === "INTERVIEW_PREP" ? "🎯" : viewNote.type === "FEEDBACK" ? "💬" : "📋"} Note Details
              </h3>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                {!editingItem && <button className="btn btn-secondary btn-sm" onClick={() => setEditingItem(true)}>✏️ Edit</button>}
                <button style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "var(--text-lg)", cursor: "pointer" }} onClick={() => { setViewNote(null); setEditingItem(false); }}>✕</button>
              </div>
            </div>
            {!editingItem ? (
              <div>
                <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  <span style={{ padding: "2px 8px", borderRadius: "var(--radius-full)", background: "var(--bg-tertiary)" }}>{viewNote.type.replace(/_/g, " ")}</span>
                  <span>{formatDate(viewNote.createdAt)}</span>
                </div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: "var(--leading-relaxed)", whiteSpace: "pre-wrap" }}>{viewNote.content}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Type</label>
                  <select className="input" value={editNoteForm.type} onChange={(e) => setEditNoteForm({ ...editNoteForm, type: e.target.value })} style={{ marginTop: 4 }}>
                    <option value="GENERAL">General</option><option value="INTERVIEW_PREP">Interview Prep</option><option value="FEEDBACK">Feedback</option><option value="POST_INTERVIEW">Post-Interview</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Content</label>
                  <textarea className="input" rows={6} value={editNoteForm.content} onChange={(e) => setEditNoteForm({ ...editNoteForm, content: e.target.value })} style={{ marginTop: 4, resize: "vertical", fontFamily: "inherit" }} />
                </div>
                <div style={{ display: "flex", gap: "var(--space-3)" }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingItem(false)}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleUpdateNote} disabled={saving || !editNoteForm.content.trim()}>{saving ? "Saving..." : "Save Changes"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View/Edit Contact Modal */}
      {viewContact && (
        <div className="app-edit-overlay" onClick={() => { setViewContact(null); setEditingItem(false); }}>
          <div className="card app-edit-card" onClick={(e) => e.stopPropagation()} style={{ padding: "var(--space-6)", maxWidth: 520 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700 }}>👤 Contact Details</h3>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                {!editingItem && <button className="btn btn-secondary btn-sm" onClick={() => setEditingItem(true)}>✏️ Edit</button>}
                <button style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "var(--text-lg)", cursor: "pointer" }} onClick={() => { setViewContact(null); setEditingItem(false); }}>✕</button>
              </div>
            </div>
            {!editingItem ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  <div><div className="app-meta-label">Name</div><div className="app-meta-value">{viewContact.name}</div></div>
                  {viewContact.role && <div><div className="app-meta-label">Role</div><div className="app-meta-value">{viewContact.role}</div></div>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  {viewContact.email && <div><div className="app-meta-label">Email</div><div className="app-meta-value"><a href={`mailto:${viewContact.email}`} style={{ color: "var(--accent-primary)" }}>{viewContact.email}</a></div></div>}
                  {viewContact.phone && <div><div className="app-meta-label">Phone</div><div className="app-meta-value">{viewContact.phone}</div></div>}
                </div>
                {viewContact.linkedinUrl && <div><div className="app-meta-label">LinkedIn</div><div className="app-meta-value"><a href={viewContact.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-primary)", wordBreak: "break-all" }}>{viewContact.linkedinUrl}</a></div></div>}
                {viewContact.notes && <div><div className="app-meta-label">Notes</div><div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{viewContact.notes}</div></div>}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  <div>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Name *</label>
                    <input className="input" value={editContactForm.name} onChange={(e) => setEditContactForm({ ...editContactForm, name: e.target.value })} style={{ marginTop: 4 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Role</label>
                    <input className="input" value={editContactForm.role} onChange={(e) => setEditContactForm({ ...editContactForm, role: e.target.value })} style={{ marginTop: 4 }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  <div>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Email</label>
                    <input className="input" type="email" value={editContactForm.email} onChange={(e) => setEditContactForm({ ...editContactForm, email: e.target.value })} style={{ marginTop: 4 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Phone</label>
                    <input className="input" value={editContactForm.phone} onChange={(e) => setEditContactForm({ ...editContactForm, phone: e.target.value })} style={{ marginTop: 4 }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>LinkedIn URL</label>
                  <input className="input" value={editContactForm.linkedinUrl} onChange={(e) => setEditContactForm({ ...editContactForm, linkedinUrl: e.target.value })} style={{ marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Notes</label>
                  <textarea className="input" rows={3} value={editContactForm.notes} onChange={(e) => setEditContactForm({ ...editContactForm, notes: e.target.value })} style={{ marginTop: 4, resize: "vertical", fontFamily: "inherit" }} />
                </div>
                <div style={{ display: "flex", gap: "var(--space-3)" }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingItem(false)}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleUpdateContact} disabled={saving || !editContactForm.name.trim()}>{saving ? "Saving..." : "Save Changes"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom spacer for centralizing scroll */}
      <div style={{ height: "40vh", flexShrink: 0 }} />
    </div>
  );
}
