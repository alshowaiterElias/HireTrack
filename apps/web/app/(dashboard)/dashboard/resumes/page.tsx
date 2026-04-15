"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import ConfirmModal from "@/components/ConfirmModal";
import { useI18n } from "@/lib/i18n/context";

export default function ResumesPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [resumes, setResumes] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; label: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const token = session?.accessToken as string;

  useEffect(() => {
    if (!token) return;
    api.getResumes(token).then(setResumes).catch(() => {}).finally(() => setFetching(false));
  }, [token]);

  const handleFileSelect = (f: File) => {
    const allowed = ["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(f.type)) {
      setError("Only PDF and DOCX files are allowed.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("File must be under 5MB.");
      return;
    }
    setFile(f);
    setError("");
    if (!label) setLabel(f.name.replace(/\.[^/.]+$/, ""));
  };

  const handleUpload = async () => {
    if (!file || !label.trim() || !token) return;
    setLoading(true);
    setError("");
    try {
      const resume = await api.uploadResume(file, label.trim(), token);
      setResumes((prev) => [resume, ...prev]);
      setShowUpload(false);
      setFile(null);
      setLabel("");
    } catch (err: any) {
      setError(err.message || "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!token) return;
    const resume = resumes.find((r) => r.id === id);
    setDeleteConfirm({ id, label: resume?.label || "this resume" });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || !token) return;
    const id = deleteConfirm.id;
    setDeleteConfirm(null);
    try {
      await api.deleteResume(id, token);
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      setError(err.message || "Delete failed.");
    }
  };

  const handleDownload = async (id: string, fileName: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}/resumes/${id}/download`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Download failed");
      const data = await response.json();
      if (data.url) {
        // R2 presigned URL — open directly in a new tab (self-authenticating)
        const a = document.createElement("a");
        a.href = data.url;
        a.download = fileName;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        // Local disk fallback: response is a blob stream
        const blob = await response.clone().blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch {
      setError("Download failed. Please try again.");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div style={{ maxWidth: 800, animation: "fadeInUp var(--duration-normal) var(--ease-smooth)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
        <div>
          <h2 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, marginBottom: "var(--space-2)" }}>
            {t.resumes.title} 📄
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
            {t.resumes.subtitle}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(!showUpload)}>
          + {t.resumes.upload}
        </button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
          <h3 style={{ fontSize: "var(--text-md)", fontWeight: 700, marginBottom: "var(--space-4)" }}>Upload New Resume</h3>
          {error && (
            <div style={{ padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)", background: "hsla(0, 70%, 50%, 0.1)", border: "1px solid hsla(0, 70%, 50%, 0.2)", color: "var(--danger)", fontSize: "var(--text-sm)", marginBottom: "var(--space-3)" }}>
              ⚠️ {error}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div>
              <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Label *</label>
              <input className="input" placeholder="e.g. Frontend Resume v3" value={label} onChange={(e) => setLabel(e.target.value)} style={{ marginTop: 4 }} />
            </div>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
              style={{
                border: `2px dashed ${dragOver ? "var(--accent-primary)" : "var(--border-primary)"}`,
                borderRadius: "var(--radius-lg)", padding: "var(--space-8)", textAlign: "center",
                cursor: "pointer", transition: "all var(--duration-fast)",
                background: dragOver ? "var(--accent-primary-subtle)" : "transparent",
              }}
            >
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
              {file ? (
                <div>
                  <div style={{ fontSize: "var(--text-3xl)", marginBottom: "var(--space-2)" }}>✅</div>
                  <p style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{file.name}</p>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{formatSize(file.size)}</p>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: "var(--text-3xl)", marginBottom: "var(--space-2)" }}>📎</div>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Drop your resume here or click to browse</p>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>PDF, DOCX up to 5MB</p>
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowUpload(false); setFile(null); setLabel(""); setError(""); }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleUpload} disabled={loading || !file || !label.trim()}>
                {loading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resumes List */}
      {fetching ? (
        <div className="card" style={{ padding: "var(--space-8)", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)" }}>Loading resumes...</p>
        </div>
      ) : resumes.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {resumes.map((r) => (
            <div key={r.id} className="card" style={{ padding: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <div style={{
                width: 48, height: 48, borderRadius: "var(--radius-md)",
                background: r.fileName?.endsWith(".pdf") ? "hsla(0, 70%, 60%, 0.1)" : "hsla(217, 70%, 60%, 0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "var(--text-lg)", flexShrink: 0,
              }}>
                {r.fileName?.endsWith(".pdf") ? "📕" : "📘"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: 2 }}>{r.label}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", display: "flex", gap: "var(--space-3)" }}>
                  <span>{r.fileName}</span>
                  <span>{formatSize(r.fileSize)}</span>
                  <span>{formatDate(r.createdAt)}</span>
                </div>
                {r._count?.applications > 0 && (
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--accent-primary)", marginTop: 2 }}>
                    Linked to {r._count.applications} application{r._count.applications > 1 ? "s" : ""}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleDownload(r.id, r.fileName)}
                >
                  ⬇ Download
                </button>
                <button className="btn btn-sm" style={{ background: "transparent", border: "1px solid var(--danger)", color: "var(--danger)" }} onClick={() => handleDelete(r.id)}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: "var(--space-12)", textAlign: "center" }}>
          <div style={{ fontSize: "var(--text-4xl)", marginBottom: "var(--space-3)" }}>📁</div>
          <h3 style={{ fontSize: "var(--text-md)", fontWeight: 700, marginBottom: "var(--space-2)" }}>No resumes yet</h3>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", maxWidth: 320, margin: "0 auto", lineHeight: "var(--leading-relaxed)" }}>
            Upload different resume versions to track which one gets the best response rate.
          </p>
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Resume"
        message={`Delete "${deleteConfirm?.label}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
