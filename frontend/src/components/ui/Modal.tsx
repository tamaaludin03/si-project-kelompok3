"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Modal reusable — rata ATAS (bukan center), selalu bisa scroll & tidak terpotong.
 *
 * Pola overlay flexbox:
 * - overlay: `flex items-start justify-center overflow-y-auto` + padding atas → modal
 *   menempel ke atas (di bawah navbar) dan konten panjang tetap bisa di-scroll.
 * - panel: `max-h-[calc(100vh-6rem)] overflow-y-auto` → isi panjang scroll di dalam.
 * - backdrop dim solid (tanpa frosted glass), klik luar / Escape untuk menutup,
 *   body scroll dikunci saat terbuka. Dirender via portal ke <body>.
 */
export default function Modal({
  open,
  onClose,
  children,
  className,
  closeOnBackdrop = true,
  closeOnEsc = true,
  ariaLabel,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** override lebar/penampilan panel, mis. "max-w-2xl" */
  className?: string;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  ariaLabel?: string;
}) {
  // Tutup dengan Escape
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeOnEsc, onClose]);

  // Kunci scroll body selama modal terbuka
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      // z-[600] agar di atas navbar (z-40) & sidebar (z-500)
      className="fixed inset-0 z-[600] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16 sm:pt-20"
      onMouseDown={closeOnBackdrop ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div
        className={cn(
          "relative w-full max-w-lg max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-2xl shadow-slate-300/40",
          className,
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
