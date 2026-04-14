"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import "../login/login.css";

function VerifyForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const name = searchParams.get("name") || "";
  const mode = searchParams.get("mode") || "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) return;

    setLoading(true);
    setError("");

    try {
      // Step 1: Verify the code
      await api.verifyCode(email, fullCode);

      if (mode === "signup") {
        // Step 2: Register with password from sessionStorage
        const password = sessionStorage.getItem("ht_signup_pw") || "";
        if (!password) {
          setError("Session expired. Please start the sign-up process again.");
          setLoading(false);
          return;
        }

        const result = await api.register(email, password, name);
        sessionStorage.removeItem("ht_signup_pw");

        // Step 3: Sign in with NextAuth
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
          setError("Account created but sign-in failed. Please log in manually.");
          setLoading(false);
        }
      } else {
        // For password reset flow, redirect back
        router.push(callbackUrl);
      }
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await api.sendCode(email);
      setCooldown(60);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    }
  };

  // Auto-submit when all 6 digits filled
  useEffect(() => {
    if (code.every((d) => d !== "")) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="login-page">
      <div className="login-bg-glow" />
      <div className="login-bg-glow-2" />

      <div className="login-card">
        <a href="/login?mode=signup" className="login-back">
          ← Back to sign up
        </a>

        <div className="login-logo">
          <div className="login-logo-icon">H</div>
          <span className="login-logo-text">HireTrack</span>
        </div>

        <p className="login-subtitle">
          We sent a 6-digit code to <strong>{email}</strong>. Enter it below to verify your email.
        </p>

        {error && <div className="login-error">⚠️ {error}</div>}

        {/* OTP Input */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            justifyContent: "center",
            margin: "var(--space-6) 0",
          }}
          onPaste={handlePaste}
        >
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="input"
              style={{
                width: 48,
                height: 56,
                textAlign: "center",
                fontSize: "var(--text-xl)",
                fontWeight: 700,
                letterSpacing: "0.1em",
                padding: 0,
              }}
            />
          ))}
        </div>

        <button
          className="login-demo-btn"
          onClick={handleVerify}
          disabled={loading || code.some((d) => d === "")}
          style={{ marginBottom: "var(--space-4)" }}
        >
          {loading ? (
            <>
              <span className="login-spinner" /> Verifying...
            </>
          ) : (
            "Verify & Create Account →"
          )}
        </button>

        <div style={{ textAlign: "center" }}>
          <button
            onClick={handleResend}
            disabled={cooldown > 0}
            style={{
              background: "none",
              border: "none",
              color: cooldown > 0 ? "var(--text-muted)" : "var(--accent-primary)",
              cursor: cooldown > 0 ? "default" : "pointer",
              fontSize: "var(--text-sm)",
            }}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="login-page">
          <div className="login-bg-glow" />
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
