"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Modal reusable — pendek otomatis ke TENGAH, panjang menempel ATAS & ikut scroll.
 *
 * Pola: overlay `flex flex-col items-center overflow-y-auto` + panel `my-auto`.
 * - panel pendek → `my-auto` membagi ruang kosong → ke tengah vertikal.
 * - panel panjang (lebih tinggi dari layar) → `my-auto` jadi 0 → menempel atas,
 *   overlay men-scroll sehingga konten tidak terpotong.
 * - backdrop dim solid (tanpa frosted glass), klik luar / Escape untuk menutup,
 *   body scroll dikunci saat terbuka. Portal ke <body>, z-[600] (di atas navbar & sidebar).
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
      className="fixed inset-0 z-[600] flex flex-col items-center overflow-y-auto bg-slate-900/40 p-4"
      onMouseDown={closeOnBackdrop ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      {/* my-auto: modal pendek otomatis ke tengah; modal panjang menempel atas & ikut scroll */}
      <div
        className={cn(
          "relative my-auto w-full max-w-lg rounded-2xl border border-slate-100 bg-white shadow-2xl shadow-slate-300/40",
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
