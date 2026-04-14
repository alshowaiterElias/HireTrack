"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import "../login/login.css";

function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");

    try {
      await api.forgotPassword(email);
      setStep("code");
      setSuccess("If this email is registered, a reset code has been sent. Check your console/email.");
    } catch (err: any) {
      setError(err.message || "Failed to send reset code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !newPassword) return;

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.resetPassword(email, code, newPassword);
      setStep("done");
      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-glow" />
      <div className="login-bg-glow-2" />

      <div className="login-card">
        <a href="/login" className="login-back">
          ← Back to login
        </a>

        <div className="login-logo">
          <div className="login-logo-icon">H</div>
          <span className="login-logo-text">HireTrack</span>
        </div>

        <p className="login-subtitle">
          {step === "email"
            ? "Enter your email and we'll send you a code to reset your password."
            : step === "code"
            ? "Enter the 6-digit code and your new password."
            : "Your password has been reset!"}
        </p>

        {error && <div className="login-error">⚠️ {error}</div>}
        {success && (
          <div style={{
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-md)",
            background: "hsla(142, 70%, 45%, 0.1)",
            border: "1px solid hsla(142, 70%, 45%, 0.2)",
            color: "var(--success)",
            fontSize: "var(--text-sm)",
            marginBottom: "var(--space-4)",
          }}>
            ✅ {success}
          </div>
        )}

        {step === "email" && (
          <form className="login-demo-form" onSubmit={handleSendCode}>
            <div className="login-input-group">
              <label htmlFor="reset-email">Email Address</label>
              <input
                id="reset-email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="login-demo-btn" disabled={loading || !email}>
              {loading ? (
                <><span className="login-spinner" /> Sending...</>
              ) : (
                "Send Reset Code →"
              )}
            </button>
          </form>
        )}

        {step === "code" && (
          <form className="login-demo-form" onSubmit={handleResetPassword}>
            <div className="login-input-group">
              <label htmlFor="reset-code">Reset Code</label>
              <input
                id="reset-code"
                type="text"
                className="input"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                maxLength={6}
                style={{ letterSpacing: "0.3em", textAlign: "center", fontWeight: 700 }}
              />
            </div>
            <div className="login-input-group">
              <label htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                className="input"
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="login-input-group">
              <label htmlFor="confirm-password">Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                className="input"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="login-demo-btn" disabled={loading || !code || !newPassword}>
              {loading ? (
                <><span className="login-spinner" /> Resetting...</>
              ) : (
                "Reset Password →"
              )}
            </button>
          </form>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: "var(--space-6)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "var(--space-3)" }}>🎉</div>
            <p style={{ color: "var(--text-secondary)" }}>Redirecting to login...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="login-page"><div className="login-bg-glow" /></div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
