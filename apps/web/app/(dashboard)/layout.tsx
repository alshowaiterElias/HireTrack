"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import ConfirmModal from "@/components/ConfirmModal";
import { useI18n } from "@/lib/i18n/context";
import "./dashboard.css";

const NAV_KEYS = [
  { href: "/dashboard", icon: "🏠", key: "home" },
  { href: "/dashboard/analytics", icon: "📊", key: "analytics" },
  { href: "/dashboard/resumes", icon: "📄", key: "resumes" },
  { href: "/dashboard/reminders", icon: "⏰", key: "reminders" },
  { href: "/dashboard/templates", icon: "✉️", key: "templates" },
  { href: "/dashboard/vault", icon: "📚", key: "vault" },
  { href: "/dashboard/settings", icon: "⚙️", key: "settings" },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang, theme, toggleTheme } = useI18n();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [creating, setCreating] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: "", goal: "", targetRole: "", salaryMin: "", salaryMax: "",
    currency: "USD", targetEndDate: "", weeklyGoal: "10",
  });

  // Route Protection
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      const data = await api.getCampaigns(session.accessToken as string);
      setCampaigns(data);
    } catch {
      // Silently fail — campaigns will show empty
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchCampaigns();
    }
  }, [status, fetchCampaigns]);

  const handleCreateCampaign = async () => {
    if (!campaignForm.name.trim() || !session?.accessToken) return;
    setCreating(true);
    try {
      const body: any = { name: campaignForm.name.trim() };
      if (campaignForm.goal) body.goal = campaignForm.goal;
      if (campaignForm.targetRole) body.targetRole = campaignForm.targetRole;
      if (campaignForm.salaryMin) body.salaryMin = Number(campaignForm.salaryMin);
      if (campaignForm.salaryMax) body.salaryMax = Number(campaignForm.salaryMax);
      if (campaignForm.currency) body.currency = campaignForm.currency;
      if (campaignForm.targetEndDate) body.targetEndDate = campaignForm.targetEndDate;
      if (campaignForm.weeklyGoal) body.weeklyGoal = Number(campaignForm.weeklyGoal);

      const campaign = await api.createCampaign(body, session.accessToken as string);
      setCampaigns((prev) => [campaign, ...prev]);
      setCampaignForm({ name: "", goal: "", targetRole: "", salaryMin: "", salaryMax: "", currency: "USD", targetEndDate: "", weeklyGoal: "10" });
      setShowNewCampaign(false);
      router.push(`/dashboard/board/${campaign.id}`);
    } catch {
    } finally {
      setCreating(false);
    }
  };

  const [deleteCampaignConfirm, setDeleteCampaignConfirm] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteCampaign = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteCampaignConfirm({ id, name });
  };

  const confirmDeleteCampaign = async () => {
    if (!deleteCampaignConfirm || !session?.accessToken) return;
    const id = deleteCampaignConfirm.id;
    setDeleteCampaignConfirm(null);
    try {
      await api.deleteCampaign(id, session.accessToken as string);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      if (pathname === `/dashboard/board/${id}`) {
        router.push("/dashboard");
      }
    } catch {}
  };

  if (status === "loading") {
    return (
      <div className="dashboard-layout" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="sidebar-logo" style={{ width: 48, height: 48, fontSize: "var(--text-lg)", margin: "0 auto var(--space-4)" }}>H</div>
          <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  const user = session?.user;
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.includes("/board/")) {
      const campaignId = pathname.split("/board/")[1];
      const campaign = campaigns.find((c) => c.id === campaignId);
      return campaign?.name || "Board";
    }
    const segment = pathname.split("/").pop();
    return segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : "Dashboard";
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""} ${lang === 'ar' ? 'rtl-sidebar' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">H</div>
          <span className="sidebar-title">HireTrack</span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">{lang === 'ar' ? 'القائمة' : 'Menu'}</div>
          {NAV_KEYS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {t.nav[item.key]}
            </Link>
          ))}

          <div className="sidebar-section-label" style={{ marginTop: "var(--space-4)" }}>
            {t.nav.campaigns}
          </div>

          {campaigns.map((c) => (
            <div key={c.id} className="sidebar-campaign-row">
              <Link
                href={`/dashboard/board/${c.id}`}
                className={`sidebar-campaign ${pathname === `/dashboard/board/${c.id}` ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
                style={{ flex: 1 }}
              >
                <span
                  className="sidebar-campaign-dot"
                  style={{ background: c.status === "ACTIVE" ? "var(--accent-primary)" : "var(--text-muted)" }}
                />
                <span className="sidebar-campaign-name">{c.name}</span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginLeft: "auto", marginRight: 4 }}>
                  {c.totalApplications || 0}
                </span>
              </Link>
              <button
                className="sidebar-campaign-delete"
                onClick={(e) => handleDeleteCampaign(e, c.id, c.name)}
                title="Delete campaign"
              >
                ✕
              </button>
            </div>
          ))}

          {campaigns.length === 0 && (
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", padding: "var(--space-2) var(--space-3)" }}>
              {t.nav.noCampaigns}
            </div>
          )}

          {/* New Campaign */}
          <button className="sidebar-new-campaign" onClick={() => setShowNewCampaign(true)}>
            <span>+</span>
            {t.nav.newCampaign}
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {user?.image ? <img src={user.image} alt={user.name || "User"} /> : initials}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || "User"}</div>
              <div className="sidebar-user-email">{user?.email || ""}</div>
            </div>
            <button
              className="sidebar-logout"
              onClick={() => signOut({ callbackUrl: "/" })}
              title="Sign out"
            >
              ↗
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-header-left">
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </button>
            <h1 className="dashboard-header-title">{getPageTitle()}</h1>
          </div>
          <div className="dashboard-header-right">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              style={{
                width: 32, height: 32, borderRadius: "var(--radius-full)",
                fontSize: 16, cursor: "pointer", background: "var(--bg-tertiary)",
                border: "1px solid var(--border-primary)", display: "flex",
                alignItems: "center", justifyContent: "center",
                transition: "all var(--duration-fast)",
              }}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              style={{
                padding: "4px 10px", borderRadius: "var(--radius-full)",
                fontSize: "var(--text-xs)", fontWeight: 700, cursor: "pointer",
                background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)",
                color: "var(--text-secondary)", transition: "all var(--duration-fast)",
                letterSpacing: "0.05em",
              }}
              title={lang === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
            >
              {lang === 'en' ? 'عربي' : 'EN'}
            </button>
            <button className="header-icon-btn" title="Notifications">
              🔔
              <span className="header-notification-dot" />
            </button>
          </div>
        </header>

        <div className="dashboard-content">{children}</div>
      </main>
      <ConfirmModal
        open={!!deleteCampaignConfirm}
        title="Delete Campaign"
        message={`Delete "${deleteCampaignConfirm?.name}"? All applications in this campaign will be permanently deleted.`}
        confirmLabel="Delete Campaign"
        onConfirm={confirmDeleteCampaign}
        onCancel={() => setDeleteCampaignConfirm(null)}
      />

      {/* Create Campaign Modal */}
      {showNewCampaign && (
        <div
          onClick={() => setShowNewCampaign(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480, width: "90%", maxHeight: "85vh", overflowY: "auto", padding: "var(--space-6)", animation: "scaleIn 200ms var(--ease-spring)" }}
          >
            <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: "var(--space-4)" }}>Create Campaign</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Campaign Name *</label>
                <input className="input" placeholder="e.g. Q2 Job Search" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} autoFocus style={{ marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Goal</label>
                <input className="input" placeholder="e.g. Land a senior engineering role" value={campaignForm.goal} onChange={(e) => setCampaignForm({ ...campaignForm, goal: e.target.value })} style={{ marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Target Role</label>
                <input className="input" placeholder="e.g. Senior Frontend Engineer" value={campaignForm.targetRole} onChange={(e) => setCampaignForm({ ...campaignForm, targetRole: e.target.value })} style={{ marginTop: 4 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Salary Min</label>
                  <input className="input" type="number" placeholder="80000" value={campaignForm.salaryMin} onChange={(e) => setCampaignForm({ ...campaignForm, salaryMin: e.target.value })} style={{ marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Salary Max</label>
                  <input className="input" type="number" placeholder="150000" value={campaignForm.salaryMax} onChange={(e) => setCampaignForm({ ...campaignForm, salaryMax: e.target.value })} style={{ marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Currency</label>
                  <select className="input" value={campaignForm.currency} onChange={(e) => setCampaignForm({ ...campaignForm, currency: e.target.value })} style={{ marginTop: 4 }}>
                    <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="CAD">CAD</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Target End Date</label>
                  <input className="input" type="date" value={campaignForm.targetEndDate} onChange={(e) => setCampaignForm({ ...campaignForm, targetEndDate: e.target.value })} style={{ marginTop: 4, colorScheme: "dark" }} />
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Weekly Goal</label>
                  <input className="input" type="number" min="1" max="100" value={campaignForm.weeklyGoal} onChange={(e) => setCampaignForm({ ...campaignForm, weeklyGoal: e.target.value })} style={{ marginTop: 4 }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowNewCampaign(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreateCampaign} disabled={creating || !campaignForm.name.trim()}>
                  {creating ? "Creating..." : "Create Campaign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
