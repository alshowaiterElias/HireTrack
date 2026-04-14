"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import ConfirmModal from "@/components/ConfirmModal";
import { useI18n } from "@/lib/i18n/context";

export default function TemplatesPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "", category: "follow_up" });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tplSubmitted, setTplSubmitted] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const token = session?.accessToken as string;

  useEffect(() => {
    if (!token) return;
    api.getTemplates(token)
      .then((data) => {
        if (data.length === 0) {
          // Seed defaults
          api.seedDefaultTemplates(token).then(() => api.getTemplates(token).then(setTemplates));
        } else {
          setTemplates(data);
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [token]);

  const selectedTemplate = templates.find((t) => t.id === selected);

  const handleCreateValidated = () => {
    setTplSubmitted(true);
    if (!form.name || !form.subject || !form.body) return;
    handleCreate();
  };

  const handleCreate = async () => {
    if (!form.name || !form.subject || !form.body || !token) return;
    setSaving(true);
    try {
      const created = await api.createTemplate(form, token);
      setTemplates((prev) => [...prev, created]);
      setShowAdd(false);
      setForm({ name: "", subject: "", body: "", category: "follow_up" });
      setSelected(created.id);
      setTplSubmitted(false);
    } catch {} finally { setSaving(false); }
  };

  const handleEditValidated = () => {
    setTplSubmitted(true);
    if (!form.name || !form.subject || !form.body) return;
    handleEdit();
  };

  const handleEdit = async () => {
    if (!editing || !token || !form.name || !form.subject || !form.body) return;
    setSaving(true);
    try {
      const updated = await api.updateTemplate(editing, form, token);
      setTemplates((prev) => prev.map((t) => t.id === editing ? updated : t));
      setEditing(null);
      setTplSubmitted(false);
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = (id: string) => {
    if (!token) return;
    const tpl = templates.find((t) => t.id === id);
    setDeleteConfirm({ id, name: tpl?.name || "this template" });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || !token) return;
    const id = deleteConfirm.id;
    setDeleteConfirm(null);
    try {
      await api.deleteTemplate(id, token);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (selected === id) setSelected(null);
    } catch {}
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startEdit = (tpl: any) => {
    setEditing(tpl.id);
    setForm({ name: tpl.name, subject: tpl.subject, body: tpl.body, category: tpl.category });
  };

  const categoryIcon = (cat: string) => {
    switch (cat) {
      case "follow_up": return "📬";
      case "thank_you": return "🙏";
      case "networking": return "🤝";
      case "negotiation": return "💰";
      default: return "✉️";
    }
  };

  return (
    <div style={{ maxWidth: 900, animation: "fadeInUp var(--duration-normal) var(--ease-smooth)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
        <div>
          <h2 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, marginBottom: "var(--space-2)" }}>{t.templates.title} ✉️</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
            {t.templates.subtitle}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowAdd(true); setEditing(null); setForm({ name: "", subject: "", body: "", category: "follow_up" }); }}>
          + {t.templates.newTemplate}
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAdd || editing) && (
        <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-4)" }}>
          <h3 style={{ fontSize: "var(--text-md)", fontWeight: 700, marginBottom: "var(--space-4)" }}>
            {editing ? t.common.edit + ' ' + t.templates.title.slice(0, -1) : t.templates.newTemplate}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Name *</label>
                <input className="input" placeholder="Template name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ marginTop: 4, borderColor: tplSubmitted && !form.name ? "var(--danger)" : undefined }} />
                {tplSubmitted && !form.name && <span style={{ fontSize: "var(--text-xs)", color: "var(--danger)", marginTop: 2 }}>Name is required</span>}
              </div>
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Category</label>
                <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ marginTop: 4 }}>
                  <option value="follow_up">Follow-up</option>
                  <option value="thank_you">Thank You</option>
                  <option value="networking">Networking</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Subject *</label>
              <input className="input" placeholder="Email subject line" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} style={{ marginTop: 4, borderColor: tplSubmitted && !form.subject ? "var(--danger)" : undefined }} />
              {tplSubmitted && !form.subject && <span style={{ fontSize: "var(--text-xs)", color: "var(--danger)", marginTop: 2 }}>Subject is required</span>}
            </div>
            <div>
              <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Body *</label>
              <textarea
                className="input"
                placeholder="Use {company}, {role}, {contact}, {name} as variables..."
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={6}
                style={{ marginTop: 4, resize: "vertical", minHeight: 120, fontFamily: "inherit", borderColor: tplSubmitted && !form.body ? "var(--danger)" : undefined }}
              />
              {tplSubmitted && !form.body && <span style={{ fontSize: "var(--text-xs)", color: "var(--danger)", marginTop: 2 }}>Body is required</span>}
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowAdd(false); setEditing(null); setTplSubmitted(false); }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={editing ? handleEditValidated : handleCreateValidated} disabled={saving}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template List + Preview */}
      {fetching ? (
        <div className="card" style={{ padding: "var(--space-8)", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)" }}>Loading templates...</p>
        </div>
      ) : templates.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1.5fr" : "1fr", gap: "var(--space-4)" }}>
          {/* List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="card"
                onClick={() => setSelected(tpl.id === selected ? null : tpl.id)}
                style={{
                  padding: "var(--space-4)", cursor: "pointer",
                  borderColor: tpl.id === selected ? "var(--accent-primary)" : undefined,
                  transition: "all var(--duration-fast)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-md)" }}>
                    {categoryIcon(tpl.category)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{tpl.name}</div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{tpl.category?.replace(/_/g, " ")}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Preview */}
          {selectedTemplate && (
            <div className="card" style={{ padding: "var(--space-6)" }}>
              <div style={{ marginBottom: "var(--space-4)" }}>
                <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "var(--space-1)" }}>Subject</div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-primary)" }}>{selectedTemplate.subject}</div>
              </div>
              <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "var(--space-2)" }}>Body</div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: "var(--leading-relaxed)", whiteSpace: "pre-wrap", background: "var(--bg-tertiary)", padding: "var(--space-4)", borderRadius: "var(--radius-md)" }}>
                {selectedTemplate.body}
              </div>
              <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
                <button className="btn btn-secondary btn-sm" onClick={() => startEdit(selectedTemplate)}>✏️ Edit</button>
                <button className="btn btn-primary btn-sm" onClick={() => handleCopy(`Subject: ${selectedTemplate.subject}\n\n${selectedTemplate.body}`)}>
                  {copied ? "✅ Copied!" : "📋 Copy to Clipboard"}
                </button>
                <button className="btn btn-sm" style={{ background: "transparent", border: "1px solid var(--danger)", color: "var(--danger)", marginLeft: "auto" }} onClick={() => handleDelete(selectedTemplate.id)}>
                  🗑 Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: "var(--space-10)", textAlign: "center" }}>
          <div style={{ fontSize: "var(--text-4xl)", marginBottom: "var(--space-3)" }}>✉️</div>
          <h3 style={{ fontSize: "var(--text-md)", fontWeight: 700, marginBottom: "var(--space-2)" }}>No templates yet</h3>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Create your first email template to save time.</p>
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Template"
        message={`Delete "${deleteConfirm?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
