"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/Skeleton";
import KaurDashboard from "@/components/dashboard/kaur/KaurDashboard";
import KabagDashboard from "@/components/dashboard/kabag/KabagDashboard";
import SdmDashboard from "@/components/dashboard/sdm/SdmDashboard";
import AdminDashboard from "@/components/dashboard/admin/AdminDashboard";
import DireksiDashboard from "@/components/dashboard/direksi/DireksiDashboard";
import DirekturAdministrasiDashboard from "@/components/dashboard/direktur-administrasi/DirekturAdministrasiDashboard";
import { API_BASE_URL } from "@/lib/api";

/* ─────────────────────────── TYPES ─────────────────────────── */
type User = {
  id?: number; username?: string; nama?: string; nip?: string;
  jabatan?: string; unit?: string; role?: string; internal_role?: string | null;
  jenis_kelamin?: string | null;
};
type DashboardSummary = {
  jatahCuti?: number; jatahCutiTahunan?: number; cutiDiambil?: number;
  totalHariCutiDisetujui?: number; sisaCuti?: number; totalIzin?: number;
};
type SisaCutiPerJenis = {
  tahunan?:    { jatah: number; diambil: number; sisa: number };
  besar?:      { jatah: number; diambil: number; sisa: number };
  haid?:       { jatah: number; diambil: number; sisa: number };
  menikah?:    { jatah: number; diambil: number; sisa: number };
  melahirkan?: { jatah: number; diambil: number; sisa: number };
};
type CutiItem = {
  id: number; jenis_cuti?: string; tanggal_mulai?: string; tanggal_selesai?: string;
  status?: string; surat_cuti_diterbitkan?: boolean;
  nomor_surat?: string | null; tanggal_surat?: string | null;
  created_at?: string;
};
type IzinItem = { id: number; jenis_izin?: string; tanggal?: string; status?: string; created_at?: string; };
type ActivityItem = {
  id: string; rawId: number; kategori: "Cuti" | "Izin"; jenis: string;
  tanggal: string; status: string; created_at: string;
  surat_cuti_diterbitkan: boolean; nomor_surat: string | null;
};

/* ─────────────────────────── HELPERS ───────────────────────── */
function formatTanggal(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_LABEL: Record<string, string> = {
  pending:           "Menunggu KAUR",
  disetujui_kaur:    "Disetujui KAUR",
  pending_direktur:  "Menunggu Direktur",
  disetujui_final:   "Disetujui Final",
  selesai:           "Selesai",
  ditolak_kaur:      "Ditolak KAUR",
  ditolak_kabag:     "Ditolak KABAG",
  ditolak_direktur:  "Ditolak Direktur",
};

const STATUS_LABEL_DOKTER: Record<string, string> = {
  pending:           "Menunggu KABAG",
  disetujui_kaur:    "Menunggu KABAG",
  pending_direktur:  "Menunggu Direktur",
  disetujui_final:   "Disetujui Final",
  selesai:           "Selesai",
  ditolak_kaur:      "Ditolak",
  ditolak_kabag:     "Ditolak KABAG",
  ditolak_direktur:  "Ditolak Direktur",
};

function getStatusLabel(status?: string, isDokter?: boolean) {
  const map = isDokter ? STATUS_LABEL_DOKTER : STATUS_LABEL;
  return map[String(status || "").toLowerCase()] || status || "Menunggu";
}

function getStatusConfig(status?: string) {
  const s = String(status || "").toLowerCase();
  if (s === "disetujui_final" || s === "selesai")
    return { pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-400" };
  if (s === "disetujui_kaur")
    return { pill: "bg-peg-surface-soft text-peg-brand-hover border-peg-surface-tint", dot: "bg-peg-brand-mid" };
  if (s === "pending_direktur")
    return { pill: "bg-peg-surface-soft text-peg-brand-hover border-peg-surface-tint", dot: "bg-peg-brand-mid" };
  if (s.includes("tolak"))
    return { pill: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-400" };
  return { pill: "bg-peg-surface-soft text-peg-brand-hover border-peg-surface-tint", dot: "bg-peg-brand-mid" };
}

function clearSession() {
  ["token","user","simciUser","username","nip","nama","role","jabatan","internal_role"]
    .forEach((k) => localStorage.removeItem(k));
}

/* ─────────────────────────── ICONS ─────────────────────────── */
const Ic = {
  Bell: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  Lock: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Logout: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Calendar: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Check: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  Clock: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  File: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  AlertCircle: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  Download: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  ChevronRight: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  X: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Eye: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  EyeOff: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ),
  Stethoscope: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
      <circle cx="20" cy="10" r="2"/>
    </svg>
  ),
};

/* ─────────────────────────── STAT CARD ─────────────────────── */
function StatCard({ title, value, sub, icon, color }: {
  title: string; value: string | number; sub: string;
  icon: React.ReactNode; color: "violet" | "emerald" | "amber" | "slate";
}) {
  const cls = {
    violet:  { border: "border-peg-surface-tint",  icon: "bg-peg-surface-soft text-peg-brand",  num: "text-peg-brand"  },
    emerald: { border: "border-emerald-100", icon: "bg-emerald-50 text-emerald-600", num: "text-emerald-700" },
    amber:   { border: "border-amber-100",   icon: "bg-amber-50 text-amber-500",    num: "text-amber-600"   },
    slate:   { border: "border-slate-200",   icon: "bg-slate-100 text-slate-500",   num: "text-slate-800"   },
  }[color];
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[var(--peg-shadow-card)]">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${cls.icon}`}>
        {icon}
      </div>
      <p className={`text-3xl font-black leading-none tracking-tight ${cls.num}`}>{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{title}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}

/* ─────────────────────────── KUOTA ROW ─────────────────────── */
function KuotaRow({ label, jatah, sisa, barColor }: {
  label: string; jatah: number; sisa: number; barColor: string;
}) {
  const pct = jatah > 0 ? Math.min(Math.round(((jatah - sisa) / jatah) * 100), 100) : 0;
  return (
    <div className="flex items-center gap-3 py-3">
      <p className="w-28 flex-shrink-0 text-sm font-medium text-slate-700">{label}</p>
      <div className="flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <p className={`w-20 flex-shrink-0 text-right text-sm font-bold ${sisa === 0 ? "text-rose-600" : "text-slate-700"}`}>
        {sisa} <span className="font-normal text-slate-400">/ {jatah} hr</span>
      </p>
    </div>
  );
}

function HaidStatusRow({ label, sudahDigunakan }: { label: string; sudahDigunakan: boolean | null }) {
  const pct = sudahDigunakan ? 100 : 0;
  const barColor = sudahDigunakan ? "bg-rose-400" : "bg-pink-400";
  return (
    <div className="flex items-center gap-3 py-3">
      <p className="w-28 flex-shrink-0 text-sm font-medium text-slate-700">{label}</p>
      <div className="flex-1">
        {sudahDigunakan === null ? (
          <div className="h-1.5 animate-pulse rounded-full bg-slate-100" />
        ) : (
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <p className={`w-20 flex-shrink-0 text-right text-sm font-bold ${sudahDigunakan ? "text-rose-600" : "text-slate-700"}`}>
        {sudahDigunakan ? 0 : 1} <span className="font-normal text-slate-400">/ bulan</span>
      </p>
    </div>
  );
}

/* ─────────────────────────── ACTIVITY ROW ──────────────────── */
function ActivityRow({ item, isDokter }: { item: ActivityItem; isDokter?: boolean }) {
  const cfg = getStatusConfig(item.status);
  const isCuti = item.kategori === "Cuti";
  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
        isCuti ? "bg-peg-surface-tint text-peg-brand-hover" : "bg-sky-100 text-sky-700"
      }`}>
        {isCuti ? "C" : "I"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold capitalize text-slate-800">
            {(item.jenis || "").replace(/_/g, " ")}
          </p>
          <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${cfg.pill}`}>
            {getStatusLabel(item.status, isDokter)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-400">{item.tanggal}</p>
        {item.surat_cuti_diterbitkan && (
          <button type="button"
            onClick={() => window.open(`${API_BASE_URL}/cuti/${item.rawId}/pdf`, "_blank")}
            className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline">
            <Ic.Download width={10} height={10} /> Unduh Surat
          </button>
        )}
        {!item.surat_cuti_diterbitkan && item.status === "disetujui_final" && isCuti && (
          <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
            <span className="h-1 w-1 animate-pulse rounded-full bg-amber-400" />
            Menunggu surat dari SDM
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── NOTIF PANEL ───────────────────── */
type ActiveItem = {
  id: string; rawId: number; _type: "cuti" | "izin";
  jenis: string; tanggal: string; status: string;
  category: "pending" | "approved" | "rejected";
};

const PENDING_STATUSES  = new Set(["pending","disetujui_kaur","pending_direktur","pending_direksi"]);
const APPROVED_STATUSES = new Set(["disetujui_final","selesai"]);
const REJECTED_STATUSES = new Set(["ditolak_kaur","ditolak_kabag","ditolak_direktur","ditolak_direksi"]);

function getItemCategory(status: string): ActiveItem["category"] {
  if (PENDING_STATUSES.has(status) || status === "disetujui_final") return "pending";
  if (APPROVED_STATUSES.has(status)) return "approved";
  if (REJECTED_STATUSES.has(status)) return "rejected";
  return "pending";
}

function getNotifTitle(items: ActiveItem[]): string {
  const hasPending  = items.some(i => i.category === "pending");
  const hasApproved = items.some(i => i.category === "approved");
  const hasRejected = items.some(i => i.category === "rejected");
  const mix = [hasPending, hasApproved, hasRejected].filter(Boolean).length;
  if (mix > 1) return "Notifikasi Pengajuan";
  if (hasRejected) return "Pengajuan Ditolak";
  if (hasApproved) return "Pengajuan Disetujui";
  return "Pengajuan Berjalan";
}

function NotifPanel({ notifItems, onClose, onDismiss, dismissedIds, isDokter }: {
  notifItems: ActiveItem[]; onClose: () => void;
  onDismiss: (id: string) => void; dismissedIds: Set<string>; isDokter?: boolean;
}) {
  const visibleItems = notifItems.filter(i => !dismissedIds.has(i.id));
  const visiblePendingCount = visibleItems.filter(i => i.category === "pending").length;
  const title = getNotifTitle(visibleItems.length > 0 ? visibleItems : notifItems);
  const titleColor =
    title === "Pengajuan Ditolak"  ? "text-rose-700" :
    title === "Pengajuan Disetujui"? "text-emerald-700" :
    title === "Notifikasi Pengajuan"? "text-peg-brand-hover" :
    "text-slate-800";

  return (
    <div className="rsgm-dropdown absolute right-0 top-full z-[9999] mt-2 w-[420px] rounded-2xl border-2 border-slate-300 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between border-b-2 border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold ${titleColor}`}>{title}</p>
          {visiblePendingCount > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
              {visiblePendingCount}
            </span>
          )}
        </div>
        <button type="button" onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
          <Ic.X width={11} height={11} />
        </button>
      </div>
      <div className="max-h-[500px] overflow-y-auto">
        {visibleItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-300">
              <Ic.Bell width={18} height={18} />
            </div>
            <p className="text-xs text-slate-400">Tidak ada pengajuan yang perlu diperhatikan</p>
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {visibleItems.map((item) => {
              const isCuti = item._type === "cuti";
              const statusLbl = getStatusLabel(item.status, isDokter);
              const badgeCls =
                item.category === "rejected"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : item.category === "approved"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-peg-surface-tint bg-peg-surface-soft text-peg-brand-hover";
              const dotCls =
                item.category === "rejected"
                  ? "bg-rose-400"
                  : item.category === "approved"
                  ? "bg-emerald-400"
                  : "bg-peg-brand-mid animate-pulse";
              return (
                <div key={item.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:bg-slate-50/70">
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
                    isCuti ? "bg-peg-surface-tint text-peg-brand-hover" : "bg-sky-100 text-sky-700"
                  }`}>
                    {isCuti ? "C" : "I"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold capitalize text-slate-800">{item.jenis}</p>
                    <p className="text-xs text-slate-400">{item.tanggal}</p>
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeCls}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
                      {statusLbl}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDismiss(item.id)}
                    className="ml-1 flex h-6 w-6 shrink-0 self-center items-center justify-center rounded-md border border-slate-200 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    title="Tutup notifikasi ini"
                  >
                    <Ic.X width={12} height={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="border-t-2 border-slate-200 px-4 py-3">
        <a href="/dashboard/status-pengajuan" onClick={onClose} className="flex items-center justify-center gap-1 text-xs font-semibold text-peg-brand transition hover:text-peg-brand-hover">
          Lihat semua status pengajuan <Ic.ChevronRight width={9} height={9} />
        </a>
      </div>
    </div>
  );
}

/* ─────────────────────────── MAIN VIEW ─────────────────────── */
function DashboardPegawaiView() {
  const router = useRouter();
  const isDokter = typeof window !== "undefined"
    ? (localStorage.getItem("jabatan") || "").toLowerCase().includes("dokter")
    : false;
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [cutiItems, setCutiItems] = useState<CutiItem[]>([]);
  const [izinItems, setIzinItems] = useState<IzinItem[]>([]);
  const [sisaCutiPerJenis, setSisaCutiPerJenis] = useState<SisaCutiPerJenis | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [haidSudahDigunakan, setHaidSudahDigunakan] = useState<boolean | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const seenStatusesRef = useRef<Map<string, string>>(new Map());

  /* ── Ganti Password ── */
  const [showPwModal, setShowPwModal]   = useState(false);
  const [oldPw, setOldPw]               = useState("");
  const [newPw, setNewPw]               = useState("");
  const [confirmPw, setConfirmPw]       = useState("");
  const [pwLoading, setPwLoading]       = useState(false);
  const [pwMsg, setPwMsg]               = useState("");
  const [pwError, setPwError]           = useState("");
  const [showOld, setShowOld]           = useState(false);
  const [showNew, setShowNew]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  const ALL_NOTIF_STATUSES = new Set([
    "pending","disetujui_kaur","pending_direktur","pending_direksi","disetujui_final",
    "selesai",
    "ditolak_kaur","ditolak_kabag","ditolak_direktur","ditolak_direksi",
  ]);

  // semua item relevan untuk popup, max 10 terbaru
  const notifItems = useMemo<ActiveItem[]>(() => {
    const toItem = (i: CutiItem, type: "cuti"): ActiveItem => {
      const s = String(i.status || "").toLowerCase();
      return {
        id: `cuti-${i.id}`, rawId: i.id, _type: "cuti",
        jenis: (i.jenis_cuti || "cuti").replace(/_/g, " "),
        tanggal: `${formatTanggal(i.tanggal_mulai)} – ${formatTanggal(i.tanggal_selesai)}`,
        status: s, category: getItemCategory(s),
      };
    };
    const toIzin = (i: IzinItem): ActiveItem => {
      const s = String(i.status || "").toLowerCase();
      return {
        id: `izin-${i.id}`, rawId: i.id, _type: "izin",
        jenis: (i.jenis_izin || "izin").replace(/_/g, " "),
        tanggal: formatTanggal(i.tanggal),
        status: s, category: getItemCategory(s),
      };
    };
    const all = [
      ...cutiItems.filter(i => ALL_NOTIF_STATUSES.has(String(i.status || "").toLowerCase())).map(i => toItem(i, "cuti")),
      ...izinItems.filter(i => ALL_NOTIF_STATUSES.has(String(i.status || "").toLowerCase())).map(toIzin),
    ].sort((a, b) => b.rawId - a.rawId);
    return all.slice(0, 10);
  }, [cutiItems, izinItems]);

  // hanya item yang masih menunggu (untuk badge lonceng non-admin)
  const pendingItems = useMemo(
    () => notifItems.filter(i => i.category === "pending"),
    [notifItems]
  );

  /* auth */
  useEffect(() => {
    const tok = localStorage.getItem("token");
    const usr = localStorage.getItem("user") || localStorage.getItem("simciUser");
    if (!tok || !usr) { router.replace("/login"); return; }
    try { setUser(JSON.parse(usr)); }
    catch { clearSession(); router.replace("/login"); }
  }, [router]);

  /* data */
  useEffect(() => {
    const identifier = user?.nip || user?.username;
    if (!identifier) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setPageError("");
        const tok = localStorage.getItem("token");
        const h: HeadersInit = { "Content-Type": "application/json" };
        if (tok) h.Authorization = `Bearer ${tok}`;
        const [sr, cr, ir, scr] = await Promise.all([
          fetch(`${API_BASE_URL}/dashboard/summary/${identifier}`, { headers: h }),
          fetch(`${API_BASE_URL}/cuti/mine/${identifier}`, { headers: h }),
          fetch(`${API_BASE_URL}/izin/mine/${identifier}`, { headers: h }),
          fetch(`${API_BASE_URL}/cuti/sisa-cuti/${identifier}`, { headers: h }),
        ]);
        const sd = await sr.json().catch(() => null);
        const cd = await cr.json().catch(() => null);
        const id2 = await ir.json().catch(() => null);
        const scd = await scr.json().catch(() => null);
        if (cancelled) return;
        if (sr.ok) setSummary(sd?.data?.summary || sd?.summary || sd?.data || sd || null);
        if (cr.ok) { const it = cd?.data?.items || cd?.items || cd?.data || cd || []; setCutiItems(Array.isArray(it) ? it : []); }
        if (ir.ok) { const it = id2?.data?.items || id2?.items || id2?.data || id2 || []; setIzinItems(Array.isArray(it) ? it : []); }
        if (scr.ok) setSisaCutiPerJenis(scd?.data?.kuota || null);

        // Fetch status cuti haid bulan ini (hanya jika perempuan)
        const isPerempuan = user?.jenis_kelamin === "P";
        if (isPerempuan) {
          try {
            const hr = await fetch(`${API_BASE_URL}/cuti/haid-status/${identifier}`, { headers: h });
            if (hr.ok) {
              const hd = await hr.json().catch(() => null);
              if (!cancelled) setHaidSudahDigunakan(hd?.data?.sudahDigunakan ?? false);
            }
          } catch {}
        } else {
          if (!cancelled) setHaidSudahDigunakan(false);
        }
      } catch { setPageError("Gagal memuat data dashboard pegawai."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user?.nip]);

  /* WebSocket — join room untuk real-time updates; data di-refresh via polling */
  useEffect(() => {
    const nip = user?.nip;
    if (!nip) return;

    let socket: ReturnType<typeof import("socket.io-client").io> | null = null;

    import("socket.io-client").then(({ io }) => {
      socket = io(API_BASE_URL, { transports: ["websocket", "polling"] });
      socket.on("connect", () => { socket!.emit("join", { nip }); });
    });

    return () => {
      socket?.emit("leave", { nip });
      socket?.disconnect();
    };
  }, [user?.nip]);

  /* polling 30 detik — refresh data cuti/izin agar notifItems selalu terkini */
  useEffect(() => {
    const nip = user?.nip;
    if (!nip) return;

    async function pollData() {
      const tok = localStorage.getItem("token");
      const h: HeadersInit = tok ? { Authorization: `Bearer ${tok}` } : {};
      try {
        const [cr, ir] = await Promise.all([
          fetch(`${API_BASE_URL}/cuti/mine/${nip}`, { headers: h, cache: "no-store" }),
          fetch(`${API_BASE_URL}/izin/mine/${nip}`, { headers: h, cache: "no-store" }),
        ]);
        const cd  = await cr.json().catch(() => null);
        const id2 = await ir.json().catch(() => null);
        const cutiList: any[] = cr.ok ? (cd?.data?.items || cd?.items || cd?.data || []) : [];
        const izinList: any[] = ir.ok ? (id2?.data?.items || id2?.items || id2?.data || []) : [];
        if (cr.ok) setCutiItems(Array.isArray(cutiList) ? cutiList : []);
        if (ir.ok) setIzinItems(Array.isArray(izinList) ? izinList : []);

        // update seenStatuses for change-detection (future use)
        [...cutiList.map((i: any) => ({ ...i, _type: "cuti" })),
         ...izinList.map((i: any) => ({ ...i, _type: "izin" }))]
          .forEach(item => seenStatusesRef.current.set(`${item._type}-${item.id}`, String(item.status || "").toLowerCase()));
      } catch {}
    }

    const t = setInterval(pollData, 30_000);
    return () => clearInterval(t);
  }, [user?.nip]);

  /* aktivitas terbaru — gabungan cuti + izin, sort by created_at desc, max 6 */
  const recentActivity = useMemo<ActivityItem[]>(() => {
    const cuti: ActivityItem[] = cutiItems.filter((item) => item.status !== "direset_admin").map((item) => ({
      id: `cuti-${item.id}`, rawId: item.id, kategori: "Cuti",
      jenis: item.jenis_cuti || "cuti",
      tanggal: `${formatTanggal(item.tanggal_mulai)} – ${formatTanggal(item.tanggal_selesai)}`,
      status: item.status || "pending",
      created_at: item.created_at || "",
      surat_cuti_diterbitkan: Boolean(item.surat_cuti_diterbitkan),
      nomor_surat: item.nomor_surat || null,
    }));
    const izin: ActivityItem[] = izinItems.map((item) => ({
      id: `izin-${item.id}`, rawId: item.id, kategori: "Izin",
      jenis: item.jenis_izin || "izin",
      tanggal: formatTanggal(item.tanggal),
      status: item.status || "selesai",
      created_at: item.created_at || "",
      surat_cuti_diterbitkan: false, nomor_surat: null,
    }));
    return [...cuti, ...izin]
      .sort((a, b) => {
        if (a.created_at && b.created_at) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return b.rawId - a.rawId;
      })
      .slice(0, 6);
  }, [cutiItems, izinItems]);

  /* ── loading skeleton ── */
  if (loading || !user) {
    return (
      <div className="rsgm-root min-h-screen space-y-4 p-3 sm:p-6">
        <Skeleton className="h-52" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28" style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  /* ── error ── */
  if (pageError) return (
    <div className="rsgm-root p-3 sm:p-6">
      <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-5 py-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-500">
          <Ic.AlertCircle width={15} height={15} />
        </div>
        <div>
          <p className="text-sm font-semibold text-red-700">Gagal memuat data</p>
          <p className="text-xs text-red-500">{pageError}</p>
        </div>
      </div>
    </div>
  );

  /* derived values */
  const userRole = String(user?.internal_role || user?.role || "").toLowerCase().trim();
  const isKaurOrKabag = userRole === "kaur" || userRole === "kabag";
  const jatahCuti = summary?.jatahCutiTahunan ?? summary?.jatahCuti ?? 12;
  const cutiDiambil = summary?.cutiDiambil ?? summary?.totalHariCutiDisetujui ?? 0;
  const sisaCutiTahunan = sisaCutiPerJenis?.tahunan?.sisa ?? summary?.sisaCuti ?? Math.max(jatahCuti - cutiDiambil, 0);
  const totalCuti = cutiItems.length;
  const totalIzin = izinItems.length;
  const totalPending = [...cutiItems, ...izinItems].filter((i) =>
    ["pending", "disetujui_kaur", "pending_direktur"].includes(String(i.status || "").toLowerCase())
  ).length;
  const totalSelesai = [...cutiItems, ...izinItems].filter((i) =>
    ["disetujui_final", "selesai"].includes(String(i.status || "").toLowerCase())
  ).length;
  async function handleChangePw() {
    if (!oldPw || !newPw || !confirmPw) { setPwError("Semua kolom wajib diisi."); return; }
    if (newPw !== confirmPw) { setPwError("Konfirmasi password tidak cocok."); return; }
    setPwLoading(true); setPwMsg(""); setPwError("");
    try {
      const token = localStorage.getItem("token");
      const username = localStorage.getItem("username");
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username, oldPassword: oldPw, newPassword: newPw, confirmPassword: confirmPw }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Gagal mengubah password.");
      setPwMsg("Password berhasil diubah.");
      setOldPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => { setShowPwModal(false); setPwMsg(""); }, 2000);
    } catch (e: any) { setPwError(e.message || "Terjadi kesalahan."); }
    finally { setPwLoading(false); }
  }

  function closePwModal() {
    setShowPwModal(false);
    setOldPw(""); setNewPw(""); setConfirmPw("");
    setPwMsg(""); setPwError("");
    setShowOld(false); setShowNew(false); setShowConfirm(false);
  }

  const suratDiterbitkan = cutiItems.filter((i) => i.surat_cuti_diterbitkan).length;
  const cutiPct = jatahCuti > 0 ? Math.min(Math.round((cutiDiambil / jatahCuti) * 100), 100) : 0;

  /* stat card data — 4 kartu */
  const stats: { title: string; value: string | number; sub: string; icon: React.ReactNode; color: "violet" | "emerald" | "amber" | "slate" }[] = [
    {
      title: "Sisa Cuti Tahunan", value: sisaCutiTahunan, sub: `dari ${jatahCuti} hari jatah`,
      icon: <Ic.Calendar width={15} height={15} />, color: "violet",
    },
    {
      title: "Total Pengajuan", value: totalCuti + totalIzin, sub: `${totalCuti} cuti · ${totalIzin} izin`,
      icon: <Ic.File width={15} height={15} />, color: "violet",
    },
    {
      title: "Menunggu Approval", value: totalPending, sub: "perlu tindakan",
      icon: <Ic.AlertCircle width={15} height={15} />, color: "amber",
    },
    {
      title: "Selesai / Disetujui", value: totalSelesai, sub: "cuti & izin",
      icon: <Ic.Check width={15} height={15} />, color: "violet",
    },
  ];

  /* initials */
  const initials = (user.nama || "P").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      {/* ── Modal Ganti Password ── */}
      {showPwModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && closePwModal()}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_32px_80px_rgba(0,0,0,0.18)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-peg-brand">Keamanan</p>
                <h2 className="mt-0.5 text-base font-extrabold text-slate-900">Ganti Password</h2>
              </div>
              <button type="button" onClick={closePwModal} className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <Ic.X width={14} height={14} />
              </button>
            </div>
            {/* Body */}
            <div className="space-y-3 px-6 py-5">
              {[
                { label: "Password Lama",            val: oldPw,     setVal: setOldPw,     show: showOld,    setShow: setShowOld    },
                { label: "Password Baru",             val: newPw,     setVal: setNewPw,     show: showNew,    setShow: setShowNew    },
                { label: "Konfirmasi Password Baru",  val: confirmPw, setVal: setConfirmPw, show: showConfirm,setShow: setShowConfirm },
              ].map(({ label, val, setVal, show, setShow }) => (
                <div key={label}>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
                  <div className="relative">
                    <input
                      type={show ? "text" : "password"}
                      value={val}
                      onChange={(e) => setVal(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-10 text-sm text-slate-800 outline-none transition focus:border-peg-brand focus:bg-white focus:ring-2 focus:ring-peg-brand/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    >
                      {show ? <Ic.EyeOff width={14} height={14} /> : <Ic.Eye width={14} height={14} />}
                    </button>
                  </div>
                </div>
              ))}
              {pwError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600">{pwError}</div>
              )}
              {pwMsg && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700">{pwMsg}</div>
              )}
            </div>
            {/* Footer */}
            <div className="flex gap-2 border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={closePwModal}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 active:scale-[0.98]">
                Batal
              </button>
              <button type="button" onClick={handleChangePw} disabled={pwLoading}
                className="flex-1 rounded-xl bg-peg-brand py-2.5 text-sm font-bold text-white transition hover:bg-peg-brand-hover disabled:opacity-50 active:scale-[0.98]">
                {pwLoading ? "Menyimpan…" : "Simpan Password"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Global styles ─────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

        .rsgm-root {
          font-family: 'IBM Plex Sans', sans-serif;
        }

        @keyframes rsgm-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rsgm-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .rsgm-header  { animation: rsgm-fade-up 0.4s ease both 0ms; }
        .rsgm-stats   { animation: rsgm-fade-up 0.4s ease both 80ms; }
        .rsgm-activity{ animation: rsgm-fade-up 0.4s ease both 160ms; }

        .rsgm-stat-card { animation: rsgm-fade-up 0.35s ease both; }

        .rsgm-slide-up { animation: rsgm-fade-up 0.35s ease both; }

        .rsgm-dropdown { animation: rsgm-fade-up 0.2s ease both; }
        .rsgm-modal    { animation: rsgm-fade-up 0.25s ease both; }

        .rsgm-progress {
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .rsgm-btn {
          transition: all 0.15s ease;
        }
        .rsgm-btn:hover { opacity: 0.88; }
        .rsgm-btn:active { transform: scale(0.97); }
      `}</style>

      <div className="rsgm-root min-h-screen space-y-4 px-4 py-6 sm:px-6 sm:py-8">

          {/* ══════════════════ HEADER CARD ════════════════════════════ */}
          <div className="rsgm-header relative z-10 rounded-2xl bg-white shadow-[var(--peg-shadow-card)]">
            {/* Top accent stripe */}
            <div className="h-[3px] w-full rounded-tl-2xl rounded-tr-2xl bg-gradient-to-r from-peg-brand-hover via-peg-brand to-peg-brand-mid" />

            <div className="p-5">
              <div className="flex items-start justify-between gap-4">

                {/* ── Left: identity ── */}
                <div className="flex flex-1 items-start gap-4">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-peg-brand text-[15px] font-bold text-white shadow-[0_4px_12px_var(--peg-brand-shadow)]">
                      {initials}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {/* Badge */}
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-peg-surface-soft px-3 py-0.5 border border-peg-surface-tint">
                      <Ic.Stethoscope width={9} height={9} className="text-peg-brand-mid" />
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-peg-brand">
                        Dashboard Pegawai
                      </span>
                    </div>

                    <h1 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
                      {user.nama || "Pegawai"}
                    </h1>
                    <p className="mt-0.5 text-sm text-slate-400">
                      Pantau status pengajuan cuti dan izin Anda kapan saja.
                    </p>

                    {/* Info pills */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        { label: "NIP",     value: user.nip           || "-" },
                        { label: "Jabatan", value: user.jabatan       || "-" },
                        { label: "Unit",    value: user.unit          || "-" },
                        { label: "Peran",   value: user.internal_role || user.role || "pegawai" },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
                          <div className="h-2.5 w-px bg-slate-200" />
                          <span className="text-xs font-semibold text-slate-700">{value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => { clearSession(); router.replace("/login"); }}
                        className="rsgm-btn flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600"
                      >
                        <Ic.Logout width={11} height={11} />
                        Logout
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPwModal(true)}
                        className="rsgm-btn flex items-center gap-1.5 rounded-lg border border-peg-brand bg-transparent px-3 py-1.5 text-sm font-semibold text-peg-brand hover:bg-peg-surface-soft"
                      >
                        <Ic.Lock width={11} height={11} />
                        Ganti Password
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Right: bell ── */}
                {(() => {
                  const isAdmin = userRole === "admin" || userRole === "it";
                  const visiblePending = pendingItems.filter(i => !dismissedIds.has(i.id));
                  const visibleNotif   = notifItems.filter(i => !dismissedIds.has(i.id));
                  const bellRed = isAdmin || visiblePending.length > 0;
                  const badgeVal = visiblePending.length > 0
                    ? visiblePending.length
                    : isAdmin
                    ? (visibleNotif.length > 0 ? visibleNotif.length : "!")
                    : 0;
                  const showBadge = visiblePending.length > 0 || isAdmin;
                  return (
                    <div className="relative flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setNotifOpen((p) => !p)}
                        className={`rsgm-btn relative flex h-9 w-9 items-center justify-center rounded-xl border bg-white transition-colors duration-150 ${
                          bellRed ? "border-rose-300 text-rose-500 hover:bg-rose-50" : "border-slate-200 text-slate-500 hover:bg-peg-surface-soft"
                        }`}
                      >
                        <Ic.Bell width={16} height={16} />
                        {showBadge && (
                          <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white">
                            {typeof badgeVal === "number" && badgeVal > 9 ? "9+" : badgeVal}
                          </span>
                        )}
                      </button>
                      {notifOpen && (
                        <NotifPanel
                          notifItems={notifItems}
                          isDokter={isDokter}
                          onClose={() => setNotifOpen(false)}
                          dismissedIds={dismissedIds}
                          onDismiss={(id) => setDismissedIds(prev => new Set([...prev, id]))}
                        />
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* ── Cuti Progress Bar ── */}
              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-5 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Kuota Cuti Tahunan
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-slate-800">{cutiDiambil}</span>
                    <span className="text-xs text-slate-400">/ {jatahCuti} hari</span>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="rsgm-progress h-full rounded-full bg-gradient-to-r from-peg-brand to-emerald-500"
                    style={{ width: `${cutiPct}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-emerald-600">{sisaCutiTahunan} hari tersisa</span>
                  <span className="text-[10px] text-slate-400">{cutiPct}% terpakai</span>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════ STAT CARDS ════════════════════════════ */}
          <div className="rsgm-stats grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => <StatCard key={s.title} {...s} />)}
          </div>

          {/* ══════════════════ QUICK ACTIONS ═════════════════════════ */}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => router.push("/cuti/ajukan")}
              className="rsgm-btn flex items-center gap-2 rounded-xl bg-peg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-peg-brand-hover">
              <Ic.Calendar width={14} height={14} /> Ajukan Cuti
            </button>
            {!isKaurOrKabag && (
              <button type="button" onClick={() => router.push("/izin/ajukan")}
                className="rsgm-btn flex items-center gap-2 rounded-xl border border-peg-brand bg-transparent px-5 py-2 text-sm font-semibold text-peg-brand hover:bg-peg-surface-soft">
                <Ic.File width={14} height={14} /> Ajukan Izin
              </button>
            )}
          </div>

          {/* ══════════════════ BODY: 2 KOLOM ═════════════════════════ */}
          <div className="rsgm-activity grid gap-4 lg:grid-cols-2">

            {/* Kuota Cuti per Jenis */}
            <div className="rounded-2xl bg-white p-5 shadow-[var(--peg-shadow-card)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-peg-brand-mid">Jatah Cuti</p>
              <h3 className="mt-0.5 text-base font-bold text-slate-900">Kuota Cuti per Jenis</h3>
              <div className="mt-4 divide-y divide-slate-50">
                {([
                  { label: "Tahunan",      jatah: 12, key: "tahunan"    as keyof SisaCutiPerJenis, barColor: "bg-peg-brand-mid", khususPerempuan: false },
                  { label: "Besar/Ibadah", jatah: 10, key: "besar"      as keyof SisaCutiPerJenis, barColor: "bg-indigo-400", khususPerempuan: false },
                  { label: "Haid",         jatah:  1, key: "haid"       as keyof SisaCutiPerJenis, barColor: "bg-pink-400",   khususPerempuan: true  },
                  { label: "Menikah",      jatah:  3, key: "menikah"    as keyof SisaCutiPerJenis, barColor: "bg-sky-500",    khususPerempuan: false },
                  { label: "Melahirkan",   jatah: 90, key: "melahirkan" as keyof SisaCutiPerJenis, barColor: "bg-teal-500",   khususPerempuan: true  },
                ]).filter(({ khususPerempuan }) => !(user.jenis_kelamin === "L" && khususPerempuan))
                  .map(({ label, jatah, key, barColor }) => {
                  if (key === "haid") {
                    return <HaidStatusRow key={key} label={label} sudahDigunakan={haidSudahDigunakan} />;
                  }
                  const sisa = sisaCutiPerJenis?.[key]?.sisa ?? jatah;
                  return <KuotaRow key={key} label={label} jatah={jatah} sisa={sisa} barColor={barColor} />;
                })}
              </div>
            </div>

            {/* Aktivitas Terbaru */}
            <div className="flex flex-col rounded-2xl bg-white p-5 shadow-[var(--peg-shadow-card)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-peg-brand-mid">Terbaru</p>
                  <h3 className="mt-0.5 text-base font-bold text-slate-900">Aktivitas Pengajuan</h3>
                </div>
                <button type="button" onClick={() => router.push("/riwayat")}
                  className="rsgm-btn flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                  Semua <Ic.ChevronRight width={10} height={10} />
                </button>
              </div>
              <div className="mt-3 flex-1 divide-y divide-slate-50">
                {recentActivity.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-300">
                      <Ic.Calendar width={18} height={18} />
                    </div>
                    <p className="text-xs text-slate-400">Belum ada pengajuan</p>
                  </div>
                ) : (
                  recentActivity.map((item) => <ActivityRow key={item.id} item={item} isDokter={isDokter} />)
                )}
              </div>
              {recentActivity.length > 0 && (
                <div className="mt-2 border-t border-slate-50 pt-2 text-center">
                  <p className="text-[10px] text-slate-400">
                    {cutiItems.length} cuti · {izinItems.length} izin · {cutiItems.length + izinItems.length} total
                  </p>
                </div>
              )}
            </div>
          </div>

      </div>

    </>
  );
}

/* ─────────────────────────── ROOT PAGE ─────────────────────── */
export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const tok = localStorage.getItem("token");
    const usr = localStorage.getItem("user") || localStorage.getItem("simciUser");
    if (!tok || !usr) { router.replace("/login"); return; }

    // Explicit "pegawai view" request from sidebar — skip role switch
    const params = new URLSearchParams(window.location.search);
    if (params.get("as") === "pegawai") { setRole("pegawai"); return; }

    try {
      const parsed = JSON.parse(usr);
      const r = String(parsed?.internal_role || localStorage.getItem("internal_role") || "").toLowerCase().trim();
      setRole(r || "pegawai");
    } catch {
      setRole("pegawai");
    }
  }, [router]);

  if (role === null) return (
    <div className="min-h-screen space-y-4 p-3 sm:p-6">
      <Skeleton className="h-52" />
      <div className="grid grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    </div>
  );

  switch (role) {
    case "kaur":    return <KaurDashboard />;
    case "kabag":   return <KabagDashboard />;
    case "sdm":     return <SdmDashboard />;
    case "admin":
    case "it":      return <AdminDashboard />;
    case "direksi": return <DireksiDashboard />;
    case "direktur":
    case "direktur-administrasi":
    case "direktur_administrasi":
    case "kepala-administrasi":
    case "kepala_administrasi": return <DirekturAdministrasiDashboard />;
    default:        return <DashboardPegawaiView />;
  }
}
