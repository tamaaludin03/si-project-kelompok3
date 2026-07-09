"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { API_BASE_URL } from "@/lib/api";
const APPROVAL_STATUS_COLORS: Record<string, string> = {
  "Menunggu": "#fbbf24",
  "Disetujui KAUR": "#38bdf8",
  "Disetujui KABAG": "#818cf8",
  "Final": "#10b981",
  "Ditolak": "#fb7185",
};

type ProfileType = {
  nip?: string; nama?: string; jabatan?: string; role?: string; unit?: string;
};
type RecentPengajuan = {
  id: number; kategori: "Cuti" | "Izin"; jenis: string; nama: string;
  nip?: string | null; jabatan?: string | null; unit?: string | null;
  status: string; tanggal: string; created_at: string;
};
type WarningNakes = {
  id: number; nama?: string | null; nip?: string | null; jabatan?: string | null;
  status_str: string; status_sip: string;
  str_seumur_hidup?: boolean; expired_sip?: string | null;
};
type RekapPerUnit = {
  unit: string; totalCuti: number; totalIzin: number; totalPengajuan: number;
  pending: number; proses: number; approvedFinal: number; ditolak: number;
};
type RekapApproval = {
  pending: number; approvedKaur: number; approvedKabag: number;
  approvedFinal: number; ditolak: number; suratDiterbitkan: number;
};
type DireksiSummary = {
  totalPegawai: number; totalNakes: number; totalCuti: number; totalIzin: number;
  totalPengajuan: number; pending: number; proses: number; approvedFinal: number;
  ditolak: number; approvedKaur?: number; approvedKabag?: number; suratDiterbitkan?: number;
  strExpired: number; sipExpired: number; belumIsiStrSip: number; hampirExpiredStrSip: number;
  rekapApproval?: RekapApproval; rekapPerUnit?: RekapPerUnit[];
  recentPengajuan: RecentPengajuan[]; warningNakes: WarningNakes[];
};

/* ── helpers ── */
function formatDate(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatDateTime(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABEL: Record<string, string> = {
  pending:             "Menunggu",
  disetujui_kaur:      "Disetujui KAUR",
  disetujui_kabag:     "Disetujui KABAG",
  disetujui_final:     "Disetujui Final",
  ditolak_kaur:        "Ditolak KAUR",
  ditolak_kabag:       "Ditolak KABAG",
  ditolak_direktur:    "Ditolak Direktur",
  pending_direktur:    "Menunggu Direktur",
  disetujui_direktur:  "Disetujui Direktur",
  selesai:             "Selesai",
  direset_admin:       "Direset Admin",
};
function statusLabel(s: string) {
  return STATUS_LABEL[s.toLowerCase()] || s;
}
function statusBadge(s: string) {
  const l = s.toLowerCase();
  if (l === "selesai" || l.includes("final")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (l.includes("tolak")) return "bg-rose-50 text-rose-700 border-rose-200";
  if (l.includes("kaur") || l.includes("kabag")) return "bg-sky-50 text-sky-700 border-sky-200";
  if (l.includes("direktur")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function strSipLabel(s?: string) {
  const map: Record<string, string> = {
    expired: "Expired", kurang_1_bulan: "< 1 Bulan", kurang_3_bulan: "< 3 Bulan",
    kurang_6_bulan: "< 6 Bulan", kurang_1_tahun: "< 1 Tahun", aman: "Aman",
  };
  return map[s || ""] || "Belum Diisi";
}
function strSipBadge(s?: string) {
  if (s === "expired") return "bg-rose-50 text-rose-700 border-rose-200";
  if (s === "kurang_1_bulan") return "bg-orange-50 text-orange-700 border-orange-200";
  if (s === "kurang_3_bulan" || s === "kurang_6_bulan" || s === "kurang_1_tahun")
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "aman") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-50 text-slate-500 border-slate-200";
}

function escapeHtml(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* ── stat card ── */
const STAT_CFG = {
  violet:  { border: "border-violet-100",  bg: "bg-violet-50/60",  num: "text-violet-700",  label: "text-violet-600"  },
  sky:     { border: "border-sky-100",     bg: "bg-sky-50/60",     num: "text-sky-700",     label: "text-sky-600"     },
  emerald: { border: "border-emerald-100", bg: "bg-emerald-50/60", num: "text-emerald-700", label: "text-emerald-600" },
  amber:   { border: "border-amber-100",   bg: "bg-amber-50/60",   num: "text-amber-700",   label: "text-amber-600"   },
  rose:    { border: "border-rose-100",    bg: "bg-rose-50/60",    num: "text-rose-700",    label: "text-rose-600"    },
  slate:   { border: "border-slate-200",   bg: "bg-slate-50/60",   num: "text-slate-800",   label: "text-slate-500"   },
};
function StatCard({ title, value, color, icon, badge }: {
  title: string; value: number; color: keyof typeof STAT_CFG; icon: ReactNode; badge?: string;
}) {
  const c = STAT_CFG[color];
  return (
    <div className={`rounded-3xl border ${c.border} ${c.bg} p-5 shadow-sm`}>
      <div className={`mb-3 flex items-center justify-between ${c.label}`}>
        {icon}
        {badge && (
          <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-bold text-white">
            {badge}
          </span>
        )}
      </div>
      <p className={`${badge ? "text-[2.6rem]" : "text-[2.1rem]"} font-black leading-none tracking-tight ${c.num}`}>
        {String(value).padStart(2, "0")}
      </p>
      <p className={`mt-2 text-[11.5px] font-semibold ${c.label}`}>{title}</p>
    </div>
  );
}

/* ── chart card ── */
function ChartCard({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-[13px] font-extrabold text-slate-900">{title}</p>
      <p className="mt-0.5 text-xs text-slate-400">{desc}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/* ── custom recharts tooltip ── */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-violet-100 bg-white px-3 py-2 shadow-lg text-xs font-semibold text-slate-700">
      <span className="text-violet-600">{payload[0].name || payload[0].dataKey}</span>
      {" · "}
      <span className="text-slate-900">{payload[0].value}</span>
    </div>
  );
}

/* ── insight card ── */
function InsightCard({ title, value, desc, color }: {
  title: string; value: string; desc: string;
  color: "violet" | "emerald" | "amber";
}) {
  const c = {
    violet:  { border: "border-violet-100",  bg: "bg-violet-50/60",  label: "text-violet-600",  val: "text-slate-900" },
    emerald: { border: "border-emerald-100", bg: "bg-emerald-50/60", label: "text-emerald-600", val: "text-slate-900" },
    amber:   { border: "border-amber-100",   bg: "bg-amber-50/60",   label: "text-amber-600",   val: "text-slate-900" },
  }[color];
  return (
    <div className={`rounded-3xl border ${c.border} ${c.bg} p-5 shadow-sm`}>
      <p className={`text-[10.5px] font-bold uppercase tracking-[0.15em] ${c.label}`}>{title}</p>
      <p className={`mt-2 text-lg font-extrabold leading-tight ${c.val}`}>{value}</p>
      <p className="mt-1.5 text-xs text-slate-400">{desc}</p>
    </div>
  );
}

/* ── icons ── */
const Ic = {
  users:    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  calendar: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  clock:    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  check:    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  pending:  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  process:  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
  xCircle:  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  doc:      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>,
  refresh:  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  download: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  logout:   <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  alert:    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
};

/* ════════════════════════════════ MAIN ═══════════════════════════════════ */
export default function DireksiDashboard() {
  const router = useRouter();
  const [profile, setProfile]     = useState<ProfileType | null>(null);
  const [summary, setSummary]     = useState<DireksiSummary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError]         = useState("");
  const [showAllUnits, setShowAllUnits] = useState(false);

  function handleLogout() {
    ["token","user","nip","nama","role","jabatan","unit","internal_role"].forEach(k => localStorage.removeItem(k));
    router.push("/login");
  }

  async function loadDashboard(opts?: { silent?: boolean }) {
    const silent = opts?.silent === true;
    try {
      silent ? setRefreshing(true) : setLoading(true);
      setError("");
      const nip     = localStorage.getItem("nip")     || "-";
      const nama    = localStorage.getItem("nama")    || "Direksi";
      const role    = localStorage.getItem("role")    || "direksi";
      const jabatan = localStorage.getItem("jabatan") || "Direksi";
      const unit    = localStorage.getItem("unit")    || "Pimpinan";
      setProfile({ nip, nama, role, jabatan, unit });
      const res  = await fetch(`${API_BASE_URL}/dashboard/direksi/summary`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Gagal memuat dashboard direksi.");
      setSummary(data?.data || null);
      setLastUpdated(new Date().toISOString());
    } catch (err: any) {
      setError(err.message || "Gagal memuat dashboard direksi.");
    } finally {
      silent ? setRefreshing(false) : setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") loadDashboard({ silent: true });
    }, 15000);
    const onFocus = () => loadDashboard({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, []);

  const approvalChartData = useMemo(() => {
    const r = summary?.rekapApproval;
    return [
      { name: "Menunggu",      value: r?.pending       ?? summary?.pending       ?? 0 },
      { name: "Disetujui KAUR", value: r?.approvedKaur  ?? summary?.approvedKaur  ?? 0 },
      { name: "Disetujui KABAG",value: r?.approvedKabag ?? summary?.approvedKabag ?? 0 },
      { name: "Final",          value: r?.approvedFinal ?? summary?.approvedFinal ?? 0 },
      { name: "Ditolak",        value: r?.ditolak       ?? summary?.ditolak       ?? 0 },
    ];
  }, [summary]);

  const pengajuanChartData = useMemo(() => [
    { name: "Cuti", total: summary?.totalCuti ?? 0 },
    { name: "Izin", total: summary?.totalIzin ?? 0 },
  ], [summary]);

  const rekapUnitChartData = useMemo(() =>
    (summary?.rekapPerUnit || []).slice(0, 8).map(u => ({
      unit: u.unit, total: u.totalPengajuan, cuti: u.totalCuti, izin: u.totalIzin,
    })),
  [summary]);

  function exportExcel() {
    if (!summary) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Metrik: "Total Pegawai",          Jumlah: summary.totalPegawai   ?? 0 },
      { Metrik: "Total Nakes",            Jumlah: summary.totalNakes     ?? 0 },
      { Metrik: "Total Cuti",             Jumlah: summary.totalCuti      ?? 0 },
      { Metrik: "Total Izin",             Jumlah: summary.totalIzin      ?? 0 },
      { Metrik: "Total Pengajuan",        Jumlah: summary.totalPengajuan ?? 0 },
      { Metrik: "Pending",                Jumlah: summary.pending        ?? 0 },
      { Metrik: "Proses Approval",        Jumlah: summary.proses         ?? 0 },
      { Metrik: "Disetujui Final",        Jumlah: summary.approvedFinal  ?? 0 },
      { Metrik: "Ditolak",                Jumlah: summary.ditolak        ?? 0 },
      { Metrik: "Surat Cuti Diterbitkan", Jumlah: summary.suratDiterbitkan ?? 0 },
    ]), "Ringkasan");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      (summary.rekapPerUnit || []).map(u => ({
        Unit: u.unit, Cuti: u.totalCuti, Izin: u.totalIzin, Total: u.totalPengajuan,
        Pending: u.pending, Proses: u.proses, Final: u.approvedFinal, Ditolak: u.ditolak,
      }))
    ), "Rekap Per Unit");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      (summary.recentPengajuan || []).map(p => ({
        Kategori: p.kategori, Jenis: p.jenis, Nama: p.nama,
        NIP: p.nip || "-", Jabatan: p.jabatan || "-", Unit: p.unit || "-",
        Status: statusLabel(p.status), Tanggal: formatDate(p.tanggal),
        Dibuat: formatDateTime(p.created_at),
      }))
    ), "Pengajuan Terbaru");
    XLSX.writeFile(wb, `Rekap_Direksi_SIMCI_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportPdf() {
    if (!summary) return;
    const rekapRows = (summary.rekapPerUnit || []).map(u => `
      <tr><td>${escapeHtml(u.unit)}</td><td>${u.totalCuti}</td><td>${u.totalIzin}</td>
      <td>${u.totalPengajuan}</td><td>${u.pending}</td><td>${u.proses}</td>
      <td>${u.approvedFinal}</td><td>${u.ditolak}</td></tr>`).join("");
    const approvalRows = approvalChartData.map(a =>
      `<tr><td>${escapeHtml(a.name)}</td><td>${a.value}</td></tr>`).join("");
    const pengajuanRows = (summary.recentPengajuan || []).map(p => `
      <tr><td>${escapeHtml(p.kategori)}</td><td>${escapeHtml(p.jenis)}</td>
      <td>${escapeHtml(p.nama)}</td><td>${escapeHtml(p.unit || "-")}</td>
      <td>${escapeHtml(statusLabel(p.status))}</td><td>${formatDate(p.tanggal)}</td></tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <style>
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        body { margin: 24px; color: #1e293b; }
        h1 { font-size: 20px; font-weight: 700; color: #4c1d95; }
        p { color: #475569; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; }
        .card { border: 1px solid #ddd6fe; border-radius: 12px; padding: 12px; background: #f5f3ff; }
        .label { font-size: 12px; color: #475569; } .value { font-size: 22px; font-weight: 700; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
        th { background: #ede9fe; }
        .footer { margin-top: 30px; font-size: 11px; color: #64748b; }
        @media print { button { display: none; } }
      </style></head><body>
      <h1>Laporan Rekap Direksi SIMCI RSGM</h1>
      <p>Dicetak pada ${formatDateTime(new Date().toISOString())}</p>
      <div class="grid">
        <div class="card"><div class="label">Total Cuti</div><div class="value">${summary.totalCuti ?? 0}</div></div>
        <div class="card"><div class="label">Total Izin</div><div class="value">${summary.totalIzin ?? 0}</div></div>
        <div class="card"><div class="label">Approval Final</div><div class="value">${summary.approvedFinal ?? 0}</div></div>
        <div class="card"><div class="label">Ditolak</div><div class="value">${summary.ditolak ?? 0}</div></div>
      </div>
      <h2>Rekap Approval</h2>
      <table><thead><tr><th>Status</th><th>Jumlah</th></tr></thead>
      <tbody>${approvalRows || "<tr><td colspan='2'>Tidak ada data</td></tr>"}</tbody></table>
      <h2>Rekap Pengajuan Per Unit</h2>
      <table><thead><tr><th>Unit</th><th>Cuti</th><th>Izin</th><th>Total</th><th>Pending</th><th>Proses</th><th>Final</th><th>Ditolak</th></tr></thead>
      <tbody>${rekapRows || "<tr><td colspan='8'>Tidak ada data</td></tr>"}</tbody></table>
      <h2>Pengajuan Terbaru</h2>
      <table><thead><tr><th>Kategori</th><th>Jenis</th><th>Nama</th><th>Unit</th><th>Status</th><th>Tanggal</th></tr></thead>
      <tbody>${pengajuanRows || "<tr><td colspan='6'>Tidak ada data</td></tr>"}</tbody></table>
      <div class="footer">SIMCI RSGM &mdash; Laporan Direksi</div>
      <script>window.print();</script></body></html>`;
    const w = window.open("", "_blank", "width=1000,height=800");
    if (!w) return;
    w.document.open(); w.document.write(html); w.document.close();
  }

  /* ── loading ── */
  if (loading) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'); .direksi-wrap,.direksi-wrap *{font-family:'Plus Jakarta Sans',sans-serif!important}`}</style>
        <main className="direksi-wrap min-h-screen space-y-5 p-3 sm:p-6">
          <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-100" style={{ animationDelay: `${i * 40}ms` }} />)}
          </div>
        </main>
      </>
    );
  }

  const allRecent  = summary?.recentPengajuan || [];
  const allWarning = summary?.warningNakes    || [];
  const topUnit    = (summary?.rekapPerUnit   || [])[0];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .direksi-wrap,.direksi-wrap *{font-family:'Plus Jakarta Sans',sans-serif!important;-webkit-font-smoothing:antialiased}
      `}</style>

      <main className="direksi-wrap min-h-screen space-y-8 bg-transparent p-3 sm:p-6">

        {/* ══ 1. HEADER ══════════════════════════════════════════════════════════ */}
        <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">
                Dashboard Direktur Utama
              </p>
              <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
                Halo, {profile?.nama || "Direksi"}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { label: `NIP: ${profile?.nip || "-"}`,      cls: "border-slate-200  bg-slate-50  text-slate-600"       },
                  { label: profile?.jabatan || "Direksi",       cls: "border-violet-100 bg-violet-50 text-violet-700"      },
                  { label: `Unit: ${profile?.unit || "-"}`,     cls: "border-slate-200  bg-slate-50  text-slate-600"       },
                ].map(({ label, cls }) => (
                  <span key={label} className={`rounded-full border px-3.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>
                ))}
              </div>
              {lastUpdated && (
                <p className="mt-2 text-[11px] text-slate-400">Diperbarui: {formatDateTime(lastUpdated)}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Bell notifikasi */}
              <a href="/direksi/notifikasi" className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-violet-300 hover:text-violet-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {(allWarning.length > 0) && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white">
                    {allWarning.length > 9 ? "9+" : allWarning.length}
                  </span>
                )}
              </a>
              <button
                onClick={() => loadDashboard({ silent: true })}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-600 transition hover:bg-violet-100 disabled:opacity-60 active:scale-95"
              >
                {Ic.refresh} {refreshing ? "Memuat…" : "Muat Ulang"}
              </button>
              <button
                onClick={exportPdf}
                className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 active:scale-95"
              >
                {Ic.download} PDF
              </button>
              <button
                onClick={exportExcel}
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100 active:scale-95"
              >
                {Ic.download} Excel
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 active:scale-95"
              >
                {Ic.logout} Keluar
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
              {Ic.alert} {error}
            </div>
          )}
        </section>

        {/* ══ 2. STAT CARDS ══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard title="Total Pegawai"    value={summary?.totalPegawai   ?? 0} color="violet"  icon={Ic.users}    />
          <StatCard title="Total Cuti"       value={summary?.totalCuti      ?? 0} color="sky"     icon={Ic.calendar} />
          <StatCard title="Total Izin"       value={summary?.totalIzin      ?? 0} color="amber"   icon={Ic.clock}    />
          <StatCard title="Total Nakes"      value={summary?.totalNakes     ?? 0} color="slate"   icon={Ic.users}    />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard title="Disetujui Final"  value={summary?.approvedFinal  ?? 0} color="emerald" icon={Ic.check}    />
          <StatCard title="Menunggu"         value={summary?.pending        ?? 0} color="amber"   icon={Ic.pending}  badge="Perlu Aksi" />
          <StatCard title="Sedang Diproses"  value={summary?.proses         ?? 0} color="sky"     icon={Ic.process}  />
          <StatCard title="Ditolak"          value={summary?.ditolak        ?? 0} color="rose"    icon={Ic.xCircle}  />
        </div>

        {/* ══ 3. INSIGHT CARD ════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <InsightCard
            color="violet"
            title="Unit Terbanyak"
            value={topUnit ? topUnit.unit : "Belum ada data"}
            desc={topUnit ? `${topUnit.totalPengajuan} total pengajuan` : "Belum ada rekap per unit."}
          />
        </div>

        {/* ══ 4. CHARTS ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <ChartCard title="Rekap Persetujuan" desc="Distribusi status persetujuan pengajuan.">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={approvalChartData} dataKey="value" nameKey="name"
                  innerRadius={50} outerRadius={80} paddingAngle={3}
                  label={(p: any) => `${((p.percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={{ stroke: "#c4b5fd", strokeWidth: 1 }}
                >
                  {approvalChartData.map((entry) => (
                    <Cell key={`ap-${entry.name}`} fill={APPROVAL_STATUS_COLORS[entry.name] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Cuti vs Izin" desc="Perbandingan total pengajuan berdasarkan kategori.">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={pengajuanChartData} barSize={52}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f0f8" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="Total" radius={[8, 8, 3, 3]}>
                  {pengajuanChartData.map((entry, i) => (
                    <Cell key={`jenis-${entry.name}`} fill={i === 0 ? "#7c3aed" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Pengajuan Per Unit" desc="Top unit berdasarkan total pengajuan.">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={rekapUnitChartData} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f0f8" />
                <XAxis dataKey="unit" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={0} angle={-12} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="Total" radius={[6, 6, 0, 0]} fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ══ 5. REKAP PER UNIT ══════════════════════════════════════════════════ */}
        <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Distribusi Unit</p>
              <h2 className="mt-1 text-lg font-extrabold text-slate-900">Rekap Pengajuan Per Unit</h2>
              <p className="mt-0.5 text-sm text-slate-400">
                {showAllUnits ? "Seluruh unit kerja." : "3 unit dengan pengajuan terbanyak."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportExcel}
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100 active:scale-95"
              >
                {Ic.download} Excel
              </button>
              <span className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-600">
                {summary?.rekapPerUnit?.length ?? 0} unit
              </span>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {(showAllUnits
                    ? ["Unit","Cuti","Izin","Total","Menunggu","Diproses","Final","Ditolak"]
                    : ["Unit","Total","Menunggu","Final"]
                  ).map(h => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {(summary?.rekapPerUnit || []).length === 0 ? (
                  <tr>
                    <td colSpan={showAllUnits ? 8 : 4} className="px-4 py-10 text-center text-sm text-slate-400">
                      Belum ada data per unit.
                    </td>
                  </tr>
                ) : showAllUnits ? (
                  summary?.rekapPerUnit?.map(u => (
                    <tr key={u.unit} className="transition-colors hover:bg-violet-50/30">
                      <td className="px-4 py-3 font-semibold text-slate-800">{u.unit}</td>
                      <td className="px-4 py-3 text-slate-600">{u.totalCuti}</td>
                      <td className="px-4 py-3 text-slate-600">{u.totalIzin}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{u.totalPengajuan}</td>
                      <td className="px-4 py-3 text-slate-600">{u.pending}</td>
                      <td className="px-4 py-3 text-slate-600">{u.proses}</td>
                      <td className="px-4 py-3 text-emerald-700 font-semibold">{u.approvedFinal}</td>
                      <td className="px-4 py-3 text-rose-600">{u.ditolak}</td>
                    </tr>
                  ))
                ) : (
                  [...(summary?.rekapPerUnit || [])]
                    .sort((a, b) => b.totalPengajuan - a.totalPengajuan)
                    .slice(0, 3)
                    .map(u => (
                      <tr key={u.unit} className="transition-colors hover:bg-violet-50/30">
                        <td className="px-4 py-3 font-semibold text-slate-800">{u.unit}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{u.totalPengajuan}</td>
                        <td className="px-4 py-3 text-slate-600">{u.pending}</td>
                        <td className="px-4 py-3 text-emerald-700 font-semibold">{u.approvedFinal}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => setShowAllUnits(v => !v)}
            className="mt-4 text-sm font-semibold text-violet-600 hover:underline active:opacity-70"
          >
            {showAllUnits
              ? "Sembunyikan"
              : `Lihat semua unit (${summary?.rekapPerUnit?.length ?? 0})`}
          </button>
        </section>

        {/* ══ 6. PENGAJUAN + STR/SIP ═════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">

          {/* Daftar Pengajuan */}
          <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm xl:col-span-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Monitoring</p>
                <h2 className="mt-1 text-lg font-extrabold text-slate-900">Daftar Pengajuan</h2>
                <p className="mt-0.5 text-sm text-slate-400">Seluruh pengajuan yang masuk ke dashboard Direktur Utama.</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500">
                {allRecent.length} / {summary?.totalPengajuan ?? 0} ditampilkan
              </span>
            </div>

            <div className="mt-5 grid max-h-[580px] grid-cols-1 gap-3 overflow-y-auto pr-1 lg:grid-cols-2">
              {allRecent.length === 0 ? (
                <div className="col-span-2 rounded-2xl border border-slate-100 bg-slate-50 py-10 text-center text-sm text-slate-400">
                  Belum ada pengajuan.
                </div>
              ) : (
                allRecent.map(item => (
                  <div
                    key={`${item.kategori}-${item.id}`}
                    className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-colors hover:bg-violet-50/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            item.kategori === "Cuti" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"
                          }`}>
                            {item.kategori}
                          </span>
                          <p className="truncate text-sm font-bold text-slate-900">{item.jenis}</p>
                        </div>
                        <p className="mt-1.5 text-xs font-semibold text-slate-700">{item.nama}</p>
                        <p className="text-xs text-slate-400">NIP {item.nip || "-"} · {item.unit || "-"}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{item.jabatan || "-"} · {formatDate(item.tanggal)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusBadge(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* STR/SIP Warning */}
          <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm xl:col-span-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600">Monitoring</p>
              <h2 className="mt-1 text-lg font-extrabold text-slate-900">STR / SIP</h2>
              <p className="mt-0.5 text-sm text-slate-400">Nakes yang belum isi, hampir, atau sudah expired.</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: "Belum Isi",  value: summary?.belumIsiStrSip     ?? 0, cls: "border-slate-200  bg-slate-50  text-slate-700"  },
                { label: "Hampir Exp", value: summary?.hampirExpiredStrSip ?? 0, cls: "border-amber-100  bg-amber-50  text-amber-700"  },
                { label: "STR Exp",    value: summary?.strExpired          ?? 0, cls: "border-rose-100   bg-rose-50   text-rose-700"   },
                { label: "SIP Exp",    value: summary?.sipExpired          ?? 0, cls: "border-orange-100 bg-orange-50 text-orange-700" },
              ].map(({ label, value, cls }) => (
                <div key={label} className={`rounded-2xl border ${cls} px-4 py-3`}>
                  <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">{label}</p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-900">{String(value).padStart(2, "0")}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 max-h-[440px] space-y-3 overflow-y-auto pr-1">
              {allWarning.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 py-8 text-center text-sm text-slate-400">
                  Tidak ada peringatan STR/SIP.
                </div>
              ) : (
                allWarning.map(item => (
                  <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-colors hover:bg-amber-50/30">
                    <p className="font-bold text-slate-900">{item.nama || "-"}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      NIP {item.nip || "-"} · {item.jabatan || "-"}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${strSipBadge(item.status_str)}`}>
                        STR: {strSipLabel(item.status_str)}
                      </span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${strSipBadge(item.status_sip)}`}>
                        SIP: {strSipLabel(item.status_sip)}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">
                      STR: {item.str_seumur_hidup ? "Seumur hidup" : "-"} · Exp SIP: {formatDate(item.expired_sip)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

      </main>
    </>
  );
}
