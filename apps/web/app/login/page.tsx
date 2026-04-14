"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import "./login.css";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");
  const isSignUp = searchParams.get("mode") === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState(
    error ? "Authentication failed. Please try again." : ""
  );

  const handleOAuth = async (provider: string) => {
    setLoading(provider);
    setErrorMsg("");
    await signIn(provider, { callbackUrl });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading("email");
    setErrorMsg("");

    try {
      if (isSignUp) {
        // Step 1: Send verification code
        await api.sendCode(email);
        // Step 2: Navigate to verify page with password in state
        const params = new URLSearchParams({
          email,
          callbackUrl,
          ...(name ? { name } : {}),
          mode: "signup",
        });
        // Store password temporarily in sessionStorage for the verify page
        sessionStorage.setItem("ht_signup_pw", password);
        router.push(`/verify?${params.toString()}`);
      } else {
        // Direct login with email+password
        const result = await api.emailLogin(email, password);
        // Sign in with NextAuth credentials provider
        const res = await signIn("credentials", {
          redirect: false,
          email: result.user.email,
          name: result.user.name,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          userId: result.user.id,
        });
        if (res?.ok) {
          router.push(callbackUrl);
        } else {
          setErrorMsg("Sign in failed. Please try again.");
          setLoading(null);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
      setLoading(null);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-glow" />
      <div className="login-bg-glow-2" />

      <div className="login-card">
        <a href="/" className="login-back">
          ← Back to home
        </a>

        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">H</div>
          <span className="login-logo-text">HireTrack</span>
        </div>
        <p className="login-subtitle">
          {isSignUp
            ? "Create your account and start tracking your job search."
            : "Sign in to your account to continue."}
        </p>

        {/* Error */}
        {errorMsg && <div className="login-error">⚠️ {errorMsg}</div>}

        {/* OAuth Providers */}
        <div className="login-providers">
          <button
            className={`login-provider-btn ${loading === "google" ? "loading" : ""}`}
            onClick={() => handleOAuth("google")}
            disabled={loading !== null}
            id="login-google-btn"
          >
            {loading === "google" ? (
              <span className="login-spinner" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </button>

          <button
            className={`login-provider-btn ${loading === "github" ? "loading" : ""}`}
            onClick={() => handleOAuth("github")}
            disabled={loading !== null}
            id="login-github-btn"
          >
            {loading === "github" ? (
              <span className="login-spinner" />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            )}
            Continue with GitHub
          </button>
        </div>

        {/* Divider */}
        <div className="login-divider">
          <span>or continue with email</span>
        </div>

        {/* Email+Password Form */}
        <form className="login-demo-form" onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="login-input-group">
              <label htmlFor="signup-name">Full Name</label>
              <input
                id="signup-name"
                type="text"
                className="input"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="login-input-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="login-input-group">
            <label htmlFor="auth-password" style={{ display: "flex", justifyContent: "space-between" }}>
              Password
              {!isSignUp && (
                <a href="/forgot-password" style={{ fontSize: "var(--text-xs)", color: "var(--accent-primary)", fontWeight: 500 }}>
                  Forgot password?
                </a>
              )}
            </label>
            <input
              id="auth-password"
              type="password"
              className="input"
              placeholder={isSignUp ? "Min. 8 characters" : "Enter your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isSignUp ? 8 : undefined}
            />
          </div>
          <button
            type="submit"
            className="login-demo-btn"
            disabled={loading !== null || !email || !password}
            id="login-email-btn"
          >
            {loading === "email" ? (
              <>
                <span className="login-spinner" /> {isSignUp ? "Creating account..." : "Signing in..."}
              </>
            ) : (
              <>{isSignUp ? "Create Account →" : "Sign In →"}</>
            )}
          </button>
        </form>

        {/* Toggle Login / Sign Up */}
        <div className="login-footer">
          {isSignUp ? (
            <p>
              Already have an account?{" "}
              <a href="/login">Sign in</a>
            </p>
          ) : (
            <p>
              Don&apos;t have an account?{" "}
              <a href="/login?mode=signup">Sign up</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-page">
          <div className="login-bg-glow" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
