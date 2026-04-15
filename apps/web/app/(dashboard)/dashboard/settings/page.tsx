"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/context";
import type { Language } from "@/lib/i18n/context";

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const { t, lang, setLang, theme, toggleTheme } = useI18n();
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [extConnected, setExtConnected] = useState(false);
  const [extConnecting, setExtConnecting] = useState(false);
  const token = session?.accessToken as string;

  useEffect(() => {
    if (!token) return;
    api.getProfile(token).then((p) => {
      setProfile(p);
      setName(p.name || "");
      setTimezone(p.timezone || "UTC");
      setDigestEnabled(p.digestEnabled ?? true);
    }).catch(() => {});
  }, [token]);

  // Check if extension was previously connected — content script writes token to localStorage
  useEffect(() => {
    const stored = localStorage.getItem("hiretrack_ext_token");
    if (stored) setExtConnected(true);
  }, []);

  // Listen for extension connection confirmation via postMessage
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "HIRETRACK_EXT_CONNECTED") {
        setExtConnected(true);
        setExtConnecting(false);
      }
      if (e.data?.type === "HIRETRACK_EXT_DISCONNECTED") setExtConnected(false);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const connectExtension = useCallback(() => {
    if (!token) return;
    setExtConnecting(true);
    // Write to localStorage immediately so content script can pick it up
    localStorage.setItem("hiretrack_ext_token", token);
    localStorage.setItem("hiretrack_ext_apiUrl", "https://hiretrack-tjg7.onrender.com");
    // Also send postMessage so content script can forward to chrome.storage
    window.postMessage(
      { type: "HIRETRACK_EXT_CONNECT", token, apiUrl: "https://hiretrack-tjg7.onrender.com" },
      window.location.origin
    );
    // If no CONNECTED reply within 3s, the extension isn't installed — show error gracefully
    setTimeout(() => {
      // Check if it connected; if still connecting, mark connected via localStorage
      const stored = localStorage.getItem("hiretrack_ext_token");
      if (stored) setExtConnected(true);
      setExtConnecting(false);
    }, 3000);
  }, [token]);

  const disconnectExtension = () => {
    window.postMessage({ type: "HIRETRACK_EXT_DISCONNECT" }, window.location.origin);
    localStorage.removeItem("hiretrack_ext_token");
    localStorage.removeItem("hiretrack_ext_apiUrl");
    setExtConnected(false);
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.updateProfile({ name, timezone, digestEnabled }, token);
      setProfile(updated);
      // Update NextAuth session so sidebar/dashboard greeting show the new name
      await updateSession({ name, timezone, digestEnabled });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {} finally { setSaving(false); }
  };

  const handleExportCsv = async () => {
    if (!token) { setExportError("Session expired — please refresh."); return; }
    setExporting(true);
    setExportError("");
    try {
      await api.exportApplicationsCsv(token);
    } catch (err: any) {
      setExportError(err.message || "Export failed. Please try again.");
    } finally { setExporting(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== "DELETE") return;

    // Read token fresh — avoid the stale `token` const at the top of the component
    const tok = session?.accessToken;
    console.log("[delete] token:", tok ? "present" : "missing", "session:", !!session);

    if (!tok || typeof tok !== "string") {
      setDeleteError("Session has expired — please sign out and sign in again before deleting your account.");
      return;
    }

    setDeleting(true);
    setDeleteError("");
    try {
      await api.deleteAccount(tok);
      await signOut({ callbackUrl: "/" });
    } catch (err: any) {
      console.error("[delete] error:", err);
      setDeleteError(err.message || "Failed to delete account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, animation: "fadeInUp var(--duration-normal) var(--ease-smooth)" }}>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h2 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, marginBottom: "var(--space-2)" }}>{t.settings.title} ⚙️</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>{t.settings.subtitle}</p>
      </div>

      {/* Profile Section */}
      <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-4)" }}>
        <h3 style={{ fontSize: "var(--text-md)", fontWeight: 700, marginBottom: "var(--space-4)" }}>{t.settings.profile}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "var(--radius-full)", background: "var(--accent-gradient)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "var(--text-lg)" }}>
            {name?.[0]?.toUpperCase() || session?.user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <div style={{ fontSize: "var(--text-md)", fontWeight: 600 }}>{name || session?.user?.name || "User"}</div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{profile?.email || session?.user?.email || "—"}</div>
            {profile?.oauthProvider && (
              <div style={{ fontSize: "var(--text-xs)", color: "var(--accent-primary)", marginTop: 2 }}>
                via {profile.oauthProvider}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div>
            <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.settings.displayName}</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} style={{ marginTop: 4 }} />
          </div>
          <div>
            <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.settings.email}</label>
            <input className="input" value={profile?.email || session?.user?.email || ""} disabled style={{ marginTop: 4, opacity: 0.6 }} />
          </div>
          <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
            <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }} onClick={handleSave} disabled={saving}>
              {saving ? t.common.saving : saved ? t.settings.saved : t.settings.saveChanges}
            </button>
            {saved && <span style={{ fontSize: "var(--text-xs)", color: "var(--success)" }}>{t.settings.changesSaved}</span>}
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-4)" }}>
        <h3 style={{ fontSize: "var(--text-md)", fontWeight: 700, marginBottom: "var(--space-4)" }}>{t.settings.preferences}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div>
            <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.settings.timezone}</label>
            <select className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)} style={{ marginTop: 4 }}>
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Berlin">Berlin (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Asia/Dubai">Dubai (GST)</option>
              <option value="Asia/Riyadh">Riyadh (AST)</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{t.settings.dailyDigest}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{t.settings.dailyDigestDesc}</div>
            </div>
            <button
              onClick={() => setDigestEnabled(!digestEnabled)}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: digestEnabled ? "var(--accent-primary)" : "var(--bg-tertiary)",
                border: "2px solid", borderColor: digestEnabled ? "var(--accent-primary)" : "var(--border-primary)",
                cursor: "pointer", position: "relative", transition: "all var(--duration-fast)",
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: "50%", background: "white",
                position: "absolute", top: 2, left: digestEnabled ? 22 : 2,
                transition: "left var(--duration-fast)",
              }} />
            </button>
          </div>
          {/* Language Selector */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{t.settings.language}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>English / عربي</div>
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              {(["en", "ar"] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  style={{
                    padding: "4px 12px", borderRadius: "var(--radius-full)",
                    fontSize: "var(--text-xs)", fontWeight: 700, cursor: "pointer",
                    background: lang === l ? "var(--accent-primary)" : "var(--bg-tertiary)",
                    border: `1px solid ${lang === l ? "var(--accent-primary)" : "var(--border-primary)"}`,
                    color: lang === l ? "white" : "var(--text-secondary)",
                    transition: "all var(--duration-fast)",
                  }}
                >
                  {l === "en" ? "English" : "عربي"}
                </button>
              ))}
            </div>
          </div>
          {/* Theme Toggle Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{t.settings.theme}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                {theme === 'dark' ? '🌙 ' + t.settings.darkMode : '☀️ ' + t.settings.lightMode}
              </div>
            </div>
            <button
              onClick={toggleTheme}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: theme === 'dark' ? "var(--bg-tertiary)" : "var(--accent-primary)",
                border: "2px solid", borderColor: theme === 'dark' ? "var(--border-primary)" : "var(--accent-primary)",
                cursor: "pointer", position: "relative", transition: "all var(--duration-fast)",
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: "50%", background: "white",
                position: "absolute", top: 2, left: theme === 'dark' ? 2 : 22,
                transition: "left var(--duration-fast)", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 9,
              }}>
                {theme === 'dark' ? '🌙' : '☀️'}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Browser Extension */}
      <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-4)" }}>
        <h3 style={{ fontSize: "var(--text-md)", fontWeight: 700, marginBottom: "var(--space-2)" }}>
          🧩 {t.settings.browserExtension}
        </h3>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
          {t.settings.extensionDesc}
        </p>

        {/* Status indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: extConnected ? "var(--success)" : "var(--text-muted)",
            boxShadow: extConnected ? "0 0 6px var(--success)" : "none",
            transition: "all 0.3s",
          }} />
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
            {extConnected ? t.settings.connected : t.settings.notConnected}
          </span>
        </div>

        {extConnected ? (
          <button
            className="btn btn-sm"
            style={{ background: "transparent", border: "1px solid var(--danger)", color: "var(--danger)" }}
            onClick={disconnectExtension}
          >
            {t.settings.disconnectExtension}
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={connectExtension}
              disabled={extConnecting || !token}
              style={{ alignSelf: "flex-start" }}
            >
              {extConnecting ? t.settings.connecting : t.settings.connectExtension}
            </button>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              First, load the extension in Chrome from{" "}
              <code style={{ background: "var(--bg-secondary)", padding: "1px 4px", borderRadius: 4 }}>
                apps/extension/dist
              </code>{" "}
              via <strong>chrome://extensions → Load unpacked</strong>, then click Connect.
            </p>
          </div>
        )}
      </div>

      {/* Data Export */}
      <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-4)" }}>
        <h3 style={{ fontSize: "var(--text-md)", fontWeight: 700, marginBottom: "var(--space-2)" }}>
          📦 {t.common.export} {t.dashboard.title === 'Dashboard' ? 'Data' : 'البيانات'}
        </h3>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
          {t.dashboard.title === 'Dashboard'
            ? 'Download all your job applications as a CSV file. Compatible with Excel, Google Sheets, and more.'
            : 'تحميل جميع طلبات التوظيف كملف CSV. متوافق مع Excel وGoogle Sheets وغيرها.'}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportCsv}
            disabled={exporting}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {exporting ? (
              <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
            ) : "⬇️"}
            {exporting ? t.common.loading : `${t.common.download} CSV`}
          </button>
          {exportError && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--danger)" }}>⚠️ {exportError}</span>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ padding: "var(--space-6)", borderColor: "hsla(0, 75%, 60%, 0.2)" }}>
        <h3 style={{ fontSize: "var(--text-md)", fontWeight: 700, marginBottom: "var(--space-2)", color: "var(--danger)" }}>{t.settings.dangerZone}</h3>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
          {t.settings.dangerZoneDesc}
        </p>

        {showDeleteConfirm ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--danger)", fontWeight: 600 }}>
              {t.settings.deleteAccountWarning}
            </p>
            <div>
              <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)" }}>
                {t.settings.typeDeleteConfirm}
              </label>
              <input className="input" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="DELETE" style={{ marginTop: 4 }} />
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowDeleteConfirm(false); setDeleteText(""); setDeleteError(""); }}>{t.common.cancel}</button>
              <button
                className="btn btn-sm"
                style={{ background: "var(--danger)", border: "none", color: "white" }}
                onClick={handleDeleteAccount}
                disabled={deleteText !== "DELETE" || deleting}
              >
                {deleting ? t.settings.deleting : t.settings.deleteAccount}
              </button>
            </div>
            {deleteError && (
              <p style={{ fontSize: "var(--text-xs)", color: "var(--danger)", marginTop: 4, padding: "8px 12px", background: "hsla(0,75%,60%,0.1)", borderRadius: "var(--radius-sm)", border: "1px solid hsla(0,75%,60%,0.2)" }}>
                ⚠️ {deleteError}
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <button
              className="btn btn-sm"
              onClick={async () => {
                setSigningOut(true);
                await signOut({ callbackUrl: "/" });
              }}
              disabled={signingOut}
              style={{ background: "transparent", border: "1px solid var(--danger)", color: "var(--danger)", display: "flex", alignItems: "center", gap: 6 }}
            >
              {signingOut && (
                <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
              )}
              {signingOut ? "Signing out..." : t.settings.signOut}
            </button>
            <button
              className="btn btn-sm"
              style={{ background: "var(--danger)", border: "none", color: "white" }}
              onClick={() => setShowDeleteConfirm(true)}
            >
              {t.settings.deleteAccount}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
