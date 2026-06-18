"use client";

import { useEffect } from "react";

type ToastType = "success" | "error";

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onDismiss: () => void;
  position?: "top-center" | "top-right";
}

export function Toast({ message, type, duration = 2500, onDismiss, position = "top-center" }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  const cls =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-rose-200 bg-rose-50 text-rose-800";

  const icon = type === "success" ? "✓" : "✕";

  return (
    <div
      className={`fixed top-6 z-[200] flex w-full max-w-sm items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-lg ${
        position === "top-right" ? "right-5" : "inset-x-0 mx-auto"
      } ${cls}`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-current/10 text-sm font-black">
        {icon}
      </span>
      <p className="flex-1 text-sm font-semibold">{message}</p>
      <button onClick={onDismiss} className="ml-1 text-xs opacity-50 hover:opacity-100">
        ✕
      </button>
    </div>
  );
}
