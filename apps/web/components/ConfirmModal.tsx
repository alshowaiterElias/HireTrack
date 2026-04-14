"use client";

import { useEffect, useRef } from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      // Focus confirm button when opening
      setTimeout(() => confirmRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
        animation: "fadeIn 150ms ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-secondary)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-6)",
          maxWidth: 400,
          width: "90%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          animation: "scaleIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--radius-full)",
            background: danger ? "hsla(0, 70%, 50%, 0.12)" : "var(--accent-primary-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--text-xl)",
            marginBottom: "var(--space-4)",
          }}
        >
          {danger ? "⚠️" : "❓"}
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: "var(--text-md)",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "var(--space-2)",
          }}
        >
          {title}
        </h3>

        {/* Message */}
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-secondary)",
            lineHeight: "var(--leading-relaxed)",
            marginBottom: "var(--space-6)",
          }}
        >
          {message}
        </p>

        {/* Actions */}
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            className="btn"
            style={{
              flex: 1,
              background: danger ? "var(--danger)" : "var(--accent-primary)",
              color: "white",
              border: "none",
            }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
