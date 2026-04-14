"use client";

import { useEffect, useState } from "react";
import "./landing.css";

const PREVIEW_COLUMNS = [
  {
    name: "Saved",
    count: 3,
    cards: [
      {
        company: "Stripe",
        logo: "S",
        logoBg: "hsl(250, 70%, 55%)",
        role: "Senior Frontend Engineer",
        tags: [
          { label: "Remote", bg: "var(--accent-primary-subtle)", color: "var(--accent-primary)" },
          { label: "React", bg: "var(--info-subtle)", color: "var(--info)" },
        ],
      },
      {
        company: "Vercel",
        logo: "V",
        logoBg: "hsl(0, 0%, 15%)",
        role: "Full Stack Developer",
        tags: [
          { label: "Hybrid", bg: "var(--warning-subtle)", color: "var(--warning)" },
          { label: "Next.js", bg: "var(--info-subtle)", color: "var(--info)" },
        ],
      },
      {
        company: "Linear",
        logo: "L",
        logoBg: "hsl(250, 85%, 60%)",
        role: "Product Engineer",
        tags: [
          { label: "Remote", bg: "var(--accent-primary-subtle)", color: "var(--accent-primary)" },
        ],
      },
    ],
  },
  {
    name: "Applied",
    count: 5,
    cards: [
      {
        company: "Notion",
        logo: "N",
        logoBg: "hsl(0, 0%, 20%)",
        role: "Software Engineer, Web",
        tags: [
          { label: "SF", bg: "var(--success-subtle)", color: "var(--success)" },
          { label: "TypeScript", bg: "var(--info-subtle)", color: "var(--info)" },
        ],
      },
      {
        company: "Figma",
        logo: "F",
        logoBg: "hsl(15, 90%, 55%)",
        role: "Frontend Developer",
        tags: [
          { label: "Onsite", bg: "var(--warning-subtle)", color: "var(--warning)" },
        ],
      },
    ],
  },
  {
    name: "Interview",
    count: 2,
    cards: [
      {
        company: "Shopify",
        logo: "S",
        logoBg: "hsl(130, 60%, 40%)",
        role: "Senior Developer",
        tags: [
          { label: "Remote", bg: "var(--accent-primary-subtle)", color: "var(--accent-primary)" },
          { label: "Round 2", bg: "var(--success-subtle)", color: "var(--success)" },
        ],
      },
    ],
  },
  {
    name: "Offer",
    count: 1,
    cards: [
      {
        company: "GitHub",
        logo: "G",
        logoBg: "hsl(260, 60%, 50%)",
        role: "Software Engineer II",
        tags: [
          { label: "$145k", bg: "var(--success-subtle)", color: "var(--success)" },
          { label: "Remote", bg: "var(--accent-primary-subtle)", color: "var(--accent-primary)" },
        ],
      },
    ],
  },
];

const FEATURES = [
  {
    icon: "🎯",
    iconBg: "var(--accent-primary-subtle)",
    title: "Campaign-Based Tracking",
    desc: "Organize job searches as strategic campaigns with goals, deadlines, and weekly targets. Never lose focus.",
  },
  {
    icon: "📋",
    iconBg: "var(--info-subtle)",
    title: "Visual Kanban Pipeline",
    desc: "Drag-and-drop your applications through custom stages. See your entire pipeline at a glance.",
  },
  {
    icon: "📄",
    iconBg: "var(--warning-subtle)",
    title: "AI-Powered JD Vault",
    desc: "Auto-archive every job posting with AI keyword extraction. Export professional PDFs, search across all descriptions, and never lose a listing.",
  },
  {
    icon: "⏰",
    iconBg: "var(--success-subtle)",
    title: "Smart Follow-Up Engine",
    desc: "Context-aware reminders with pre-built email templates. Follow up at exactly the right time.",
  },
  {
    icon: "📊",
    iconBg: "var(--danger-subtle)",
    title: "Momentum Score & Analytics",
    desc: "A daily health score for your job search. Track response rates, conversion funnels, and source performance.",
  },
  {
    icon: "🔌",
    iconBg: "var(--accent-primary-subtle)",
    title: "One-Click Browser Extension",
    desc: "Capture jobs from LinkedIn and Indeed with a single click. No more copy-pasting between tabs.",
  },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="landing">
      {/* -------- Navigation -------- */}
      <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-inner">
          <a href="/" className="nav-logo">
            <div className="nav-logo-icon">H</div>
            HireTrack
          </a>
          <div className="nav-links">
            <a href="#features" className="nav-link">
              Features
            </a>
            <a href="#analytics" className="nav-link">
              Analytics
            </a>
            <a href="#extension" className="nav-link">
              Extension
            </a>
          </div>
          <div className="nav-actions">
            <a href="/login" className="btn btn-ghost btn-sm">Sign In</a>
            <a href="/login?mode=signup" className="btn btn-primary btn-sm">
              Get Started — Free
            </a>
          </div>
        </div>
      </nav>

      {/* -------- Hero Section -------- */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Free & Open Source — No Credit Card Required
          </div>
          <h1>
            Your Job Search
            <br />
            <span className="hero-gradient-text">Command Center</span>
          </h1>
          <p>
            Stop drowning in spreadsheets. Track every application, analyze what
            works, and land your dream role with data-driven precision.
          </p>
          <div className="hero-cta">
            <a href="/login?mode=signup" className="btn btn-primary">Start Tracking — It's Free</a>
            <a href="#features" className="btn btn-secondary">See How It Works</a>
          </div>
        </div>

        {/* -------- Board Preview -------- */}
        <div className="hero-preview">
          <div className="preview-window">
            <div className="preview-titlebar">
              <div className="preview-dot red" />
              <div className="preview-dot yellow" />
              <div className="preview-dot green" />
              <span className="preview-titlebar-text">
                Q2 2026 Frontend Search — Campaign Board
              </span>
            </div>
            <div className="preview-board">
              {PREVIEW_COLUMNS.map((col) => (
                <div key={col.name} className="preview-column">
                  <div className="preview-col-header">
                    {col.name}
                    <span className="preview-col-count">{col.count}</span>
                  </div>
                  {col.cards.map((card) => (
                    <div
                      key={`${card.company}-${card.role}`}
                      className="preview-card"
                    >
                      <div className="preview-card-company">
                        <div
                          className="preview-card-logo"
                          style={{ background: card.logoBg }}
                        >
                          {card.logo}
                        </div>
                        <span className="preview-card-name">
                          {card.company}
                        </span>
                      </div>
                      <div className="preview-card-role">{card.role}</div>
                      <div className="preview-card-tags">
                        {card.tags.map((tag) => (
                          <span
                            key={tag.label}
                            className="preview-card-tag"
                            style={{
                              background: tag.bg,
                              color: tag.color,
                            }}
                          >
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* -------- Stats -------- */}
      <section className="stats">
        <div className="stats-inner">
          <div>
            <div
              className="stat-value"
              style={{
                background: "var(--accent-gradient)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              100%
            </div>
            <div className="stat-label">Free Forever</div>
          </div>
          <div>
            <div
              className="stat-value"
              style={{
                background: "var(--accent-gradient)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              2x
            </div>
            <div className="stat-label">Faster Follow-ups</div>
          </div>
          <div>
            <div
              className="stat-value"
              style={{
                background: "var(--accent-gradient)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              0
            </div>
            <div className="stat-label">Lost Applications</div>
          </div>
          <div>
            <div
              className="stat-value"
              style={{
                background: "var(--accent-gradient)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              ∞
            </div>
            <div className="stat-label">Campaigns & Cards</div>
          </div>
        </div>
      </section>

      {/* -------- Features -------- */}
      <section id="features" className="features">
        <div className="section-label">✦ Features</div>
        <h2 className="section-title">
          Everything you need to
          <br />
          <span className="hero-gradient-text">land the role</span>
        </h2>
        <p className="section-desc">
          Built by a job seeker, for job seekers. Every feature solves a real
          pain point in the modern job search.
        </p>
        <div className="features-grid">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="feature-card">
              <div
                className="feature-icon"
                style={{ background: feature.iconBg }}
              >
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* -------- CTA -------- */}
      <section className="cta">
        <div className="cta-box">
          <div className="cta-glow" />
          <h2>
            Ready to take control of your{" "}
            <span className="hero-gradient-text">job search?</span>
          </h2>
          <p>
            Join HireTrack today. Free forever. No credit card. No catch.
          </p>
          <a href="/login?mode=signup" className="btn btn-primary btn-lg">
            Get Started — Free
          </a>
        </div>
      </section>

      {/* -------- Footer -------- */}
      <footer className="footer">
        <p>
          © {new Date().getFullYear()} HireTrack. Built with precision. Open
          source.
        </p>
      </footer>
    </div>
  );
}
