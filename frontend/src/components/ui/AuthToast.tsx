"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

type AuthToastProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  /** Durasi tampil sebelum auto-dismiss (ms). Default 3000. */
  duration?: number;
  onClose: () => void;
};

/**
 * Toast sukses untuk auth (login & logout).
 * Ikon + judul + subjudul, warna hijau (emerald), muncul di kanan atas.
 * Fitur: auto-dismiss ~3 detik, tombol close manual, slide-in dari kanan +
 * fade-out, progress bar tipis yang menyusut sesuai sisa durasi.
 * Menghormati prefers-reduced-motion (animasi gerak dimatikan).
 */
export function AuthToast({ open, title, subtitle, duration = 3000, onClose }: AuthToastProps) {
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-5 z-[300] flex justify-end px-4 sm:px-5">
      <AnimatePresence>
        {open && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 40 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 40 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl border border-emerald-200 bg-white px-4 py-3.5 shadow-lg shadow-emerald-900/5"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-emerald-800">{title}</p>
              {subtitle && <p className="mt-0.5 truncate text-xs font-medium text-emerald-600">{subtitle}</p>}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup notifikasi"
              className="-mr-1 -mt-1 shrink-0 rounded-lg p-1 text-emerald-400 transition hover:bg-emerald-50 hover:text-emerald-700"
            >
              <X size={15} />
            </button>

            {/* Progress bar menyusut sesuai sisa durasi */}
            <motion.span
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-[3px] rounded-full bg-emerald-500"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: reduceMotion ? 0 : duration / 1000, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
