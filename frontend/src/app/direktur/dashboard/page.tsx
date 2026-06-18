"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

type PendingItem = {
  id: number;
  jenis_cuti?: string;
  jenis_izin?: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  tanggal?: string;
  status: string;
  catatan_kabag?: string | null;
  created_at: string;
  is_urgent?: boolean;
  pegawai?: { nama?: string; nip?: string; jabatan?: string; unit?: string };
  _kategori?: "Cuti" | "Izin";
};

type RiwayatItem = {
  id: number;
  jenis_cuti?: string;
  jenis_izin?: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  tanggal?: string;
  status: string;
  approved_at_direktur?: string | null;
  pegawai?: { nama?: string; nip?: string; jabatan?: string; unit?: string };
  _kategori?: "Cuti" | "Izin";
};

type DirekturStats = {
  totalPegawai: number;
  pendingBulanIni: number;
  disetujuiBulanIni: number;
  ditolakBulanIni: number;
  riwayatCuti: RiwayatItem[];
  riwayatIzin: RiwayatItem[];
};

function extractItems(payload: any): any[] {
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function fmt(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDT(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(v?: string | null) {
  if (!v) return "";
  const m = Math.floor((Date.now() - new Date(v).getTime()) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

function statusBadge(status: string) {
  if (status === "disetujui_final" || status === "selesai")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "ditolak_direktur")
    return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function statusLabel(status: string) {
  if (status === "disetujui_final" || status === "selesai") return "Disetujui";
  if (status === "ditolak_direktur") return "Ditolak";
  return status;
}

function todayText() {
  return new Date().toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

const STAT_CONFIG = {
  violet:  { bg: "bg-white",      label: "text-violet-600",  num: "text-violet-700",  blob: "bg-violet-100"  },
  emerald: { bg: "bg-emerald-50", label: "text-emerald-700", num: "text-emerald-700", blob: "bg-emerald-200" },
  sky:     { bg: "bg-sky-50",     label: "text-sky-700",     num: "text-sky-700",     blob: "bg-sky-200"     },
  amber:   { bg: "bg-amber-50",   label: "text-amber-700",   num: "text-amber-700",   blob: "bg-amber-200"   },
  rose:    { bg: "bg-rose-50",    label: "text-rose-700",    num: "text-rose-700",    blob: "bg-rose-200"    },
} as const;
type StatColor = keyof typeof STAT_CONFIG;

function StatCard({ title, value, color, loading }: { title: string; value: number; color: StatColor; loading?: boolean }) {
  const c = STAT_CONFIG[color];
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-100 ${c.bg} p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md`}>
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full ${c.blob} opacity-40`} />
      <p className={`relative z-10 text-xs font-bold uppercase tracking-wide ${c.label}`}>{title}</p>
      {loading ? (
        <div className="relative z-10 mt-2 h-10 w-16 animate-pulse rounded-lg bg-slate-200" />
      ) : (
        <p className={`relative z-10 mt-2 text-4xl font-extrabold ${c.num}`}>
          {String(value).padStart(2, "0")}
        </p>
      )}
    </div>
  );
}

const Ic = {
  refresh: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  chevron: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>,
  bell:    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path strokeLinecap="round" strokeLinejoin="round" d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  check:   <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  calendar:<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  file:    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>,
  clock:   <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  users:   <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
};

export default function DirekturDashboardPage() {
  const router = useRouter();

  const [cutiPending, setCutiPending] = useState<PendingItem[]>([]);
  const [izinPending, setIzinPending] = useState<PendingItem[]>([]);
  const [stats, setStats]             = useState<DirekturStats | null>(null);
  const [loading, setLoading]         = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [nama, setNama]               = useState("");
  const [nip,  setNip]                = useState("");
  const [jabatan, setJabatan]         = useState("");
  const [unit, setUnit]               = useState("");

  async function loadData(silent = false) {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const nipVal  = localStorage.getItem("nip") || "";
      const token   = localStorage.getItem("token");
      const h: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const q = nipVal ? `?nip=${encodeURIComponent(nipVal)}` : "";

      const [cr, ir] = await Promise.all([
        fetch(`${API_BASE_URL}/cuti/direktur/pending${q}`,  { headers: h, cache: "no-store" }),
        fetch(`${API_BASE_URL}/izin/direktur/pending${q}`,  { headers: h, cache: "no-store" }),
      ]);
      setCutiPending(cr.ok ? extractItems(await cr.json().catch(() => null)) : []);
      setIzinPending(ir.ok ? extractItems(await ir.json().catch(() => null)) : []);
      setLastUpdated(new Date().toISOString());
    } finally {
      if (silent) setRefreshing(false); else setLoading(false);
    }
  }

  async function loadStats() {
    setStatsLoading(true);
    try {
      const nipVal = localStorage.getItem("nip") || "";
      const token  = localStorage.getItem("token");
      const h: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const q = nipVal ? `?nip=${encodeURIComponent(nipVal)}` : "";

      const sr = await fetch(`${API_BASE_URL}/cuti/direktur/stats${q}`, { headers: h, cache: "no-store" });
      if (sr.ok) {
        const sd = await sr.json().catch(() => null);
        setStats(sd?.data ?? null);
      }
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    const raw = localStorage.getItem("simciUser") || localStorage.getItem("user");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setNama(u?.nama       || localStorage.getItem("nama")    || "Direktur");
        setNip(u?.nip         || localStorage.getItem("nip")     || "");
        setJabatan(u?.jabatan || localStorage.getItem("jabatan") || "-");
        setUnit(u?.unit       || localStorage.getItem("unit")    || "-");
      } catch {
        setNama(localStorage.getItem("nama")    || "Direktur");
        setNip(localStorage.getItem("nip")      || "");
        setJabatan(localStorage.getItem("jabatan") || "-");
        setUnit(localStorage.getItem("unit")    || "-");
      }
    } else {
      setNama(localStorage.getItem("nama")    || "Direktur");
      setNip(localStorage.getItem("nip")      || "");
      setJabatan(localStorage.getItem("jabatan") || "-");
      setUnit(localStorage.getItem("unit")    || "-");
    }

    loadData();
    loadStats();
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") { loadData(true); loadStats(); }
    }, 30_000);
    return () => window.clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPending = cutiPending.length + izinPending.length;

  const recentPending = useMemo<PendingItem[]>(() => {
    const merged = [
      ...cutiPending.map(i => ({ ...i, _kategori: "Cuti" as const })),
      ...izinPending.map(i => ({ ...i, _kategori: "Izin" as const })),
    ];
    return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);
  }, [cutiPending, izinPending]);

  const riwayatRows = useMemo<RiwayatItem[]>(() => {
    if (!stats) return [];
    const cuti = (stats.riwayatCuti || []).map(i => ({ ...i, _kategori: "Cuti" as const }));
    const izin = (stats.riwayatIzin || []).map(i => ({ ...i, _kategori: "Izin" as const }));
    return [...cuti, ...izin]
      .sort((a, b) => new Date(b.approved_at_direktur || 0).getTime() - new Date(a.approved_at_direktur || 0).getTime())
      .slice(0, 5);
  }, [stats]);

  const initials = nama.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "DI";

  const bulanIni = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .dir-wrap, .dir-wrap * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .dir-wrap { -webkit-font-smoothing: antialiased; }
        @keyframes dirFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dir-a0 { animation: dirFadeUp 0.35s cubic-bezier(0.22,1,0.36,1) both; }
        .dir-a1 { animation: dirFadeUp 0.35s 0.06s cubic-bezier(0.22,1,0.36,1) both; }
        .dir-a2 { animation: dirFadeUp 0.35s 0.12s cubic-bezier(0.22,1,0.36,1) both; }
        .dir-a3 { animation: dirFadeUp 0.35s 0.18s cubic-bezier(0.22,1,0.36,1) both; }
        .dir-a4 { animation: dirFadeUp 0.35s 0.24s cubic-bezier(0.22,1,0.36,1) both; }
        .dir-row:hover { background: rgba(245,243,255,0.6); }
      `}</style>

      <main className="dir-wrap min-h-screen bg-transparent p-3 sm:p-6 space-y-5">

        {/* ══ HEADER ══════════════════════════════════════════════════ */}
        <section className="dir-a0 rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-xl font-extrabold text-violet-700">
                {initials}
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Dashboard Direktur</p>
                <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900">{nama || "Direktur"}</h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { label: "NIP",     value: nip     || "-" },
                    { label: "Jabatan", value: jabatan || "-" },
                    { label: "Unit",    value: unit    || "-" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</span>
                      <div className="h-2.5 w-px bg-slate-200" />
                      <span className="text-[11px] font-semibold text-slate-700">{value}</span>
                    </div>
                  ))}
                </div>
                {lastUpdated && (
                  <p className="mt-2 text-[11px] text-slate-400">Diperbarui: {fmtDT(lastUpdated)}</p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-3">
              <button
                onClick={() => { loadData(true); loadStats(); }}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-600 transition hover:bg-violet-100 disabled:opacity-60 active:scale-95"
              >
                {Ic.refresh} {refreshing ? "Memuat…" : "Muat Ulang"}
              </button>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Hari ini</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{todayText()}</p>
                <p className="mt-0.5 text-xs font-medium text-slate-400">
                  {loading ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                      Memuat data...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Data Terbaru
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Stat cards dalam header */}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard title="Total Pegawai (Unit)"     value={stats?.totalPegawai     ?? 0} color="violet"  loading={statsLoading} />
            <StatCard title={`Pending · ${bulanIni}`}  value={stats?.pendingBulanIni   ?? 0} color="amber"   loading={statsLoading} />
            <StatCard title={`Disetujui · ${bulanIni}`}value={stats?.disetujuiBulanIni ?? 0} color="emerald" loading={statsLoading} />
            <StatCard title={`Ditolak · ${bulanIni}`}  value={stats?.ditolakBulanIni   ?? 0} color="rose"    loading={statsLoading} />
          </div>
        </section>

        {/* ══ URGENT BANNER ══ */}
        {!loading && totalPending > 0 && (
          <div className="dir-a1 flex items-center justify-between gap-4 rounded-3xl border border-violet-200 bg-violet-50 px-6 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                {Ic.bell}
              </div>
              <p className="text-sm font-bold text-violet-800">
                Ada <span className="text-violet-600">{totalPending} pengajuan</span> dari Kepala Bagian menunggu persetujuan Anda.
              </p>
            </div>
            <button
              onClick={() => router.push("/direktur/approval")}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-700 px-5 py-2 text-sm font-bold text-white transition hover:bg-violet-800 active:scale-95"
            >
              Review Sekarang {Ic.chevron}
            </button>
          </div>
        )}

        {/* ══ AKSES CEPAT ══ */}
        <section className="dir-a1 rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
          <p className="text-sm font-bold text-slate-800">Akses Cepat</p>
          <p className="mt-0.5 text-xs text-slate-400">Navigasi ke fungsi utama Anda.</p>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { title: "Persetujuan Cuti",  desc: "Tinjau & setujui cuti",   href: "/direktur/approval",          color: "from-violet-50 to-white",  border: "border-violet-100",  arrow: "text-violet-500"  },
              { title: "Persetujuan Izin",  desc: "Tinjau & setujui izin",   href: "/direktur/approval",          color: "from-emerald-50 to-white", border: "border-emerald-100", arrow: "text-emerald-500" },
              { title: "Riwayat Approval",  desc: "Keputusan yang lalu",     href: "/direktur/riwayat-approval",  color: "from-sky-50 to-white",     border: "border-sky-100",     arrow: "text-sky-500"     },
              { title: "Lihat Laporan",     desc: "Rekap cuti & izin",       href: "/direktur/laporan-cuti-izin", color: "from-amber-50 to-white",   border: "border-amber-100",   arrow: "text-amber-500"   },
            ].map(({ title, desc, href, color, border, arrow }) => (
              <button
                key={title}
                type="button"
                onClick={() => router.push(href)}
                className={`group relative overflow-hidden rounded-2xl border ${border} bg-gradient-to-br ${color} p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]`}
              >
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</p>
                  </div>
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/80 text-sm shadow-sm transition-transform group-hover:translate-x-1 ${arrow}`}>
                    →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ══ GRID UTAMA ══ */}
        <div className="dir-a2 grid grid-cols-1 gap-5 xl:grid-cols-2">

          {/* Pengajuan Masuk */}
          <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Perlu Tindakan</p>
                <h2 className="mt-1 text-lg font-extrabold text-slate-900">Pengajuan Masuk</h2>
                <p className="mt-0.5 text-sm text-slate-400">Dari Kepala Bagian, menunggu keputusan Anda.</p>
              </div>
              <button
                onClick={() => router.push("/direktur/approval")}
                className="flex items-center gap-1 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-xs font-bold text-violet-700 transition hover:bg-violet-100"
              >
                Semua {Ic.chevron}
              </button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : recentPending.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                <p className="text-sm font-semibold text-slate-500">Tidak ada pengajuan yang menunggu.</p>
                <p className="mt-1 text-xs text-slate-400">Data akan muncul setelah disetujui oleh Kepala Bagian.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPending.map(item => (
                  <div
                    key={`${item._kategori}-${item.id}`}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-violet-50/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-1.5">
                          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            item._kategori === "Cuti" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"
                          }`}>{item._kategori}</span>
                          {item.is_urgent && (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">⚡ Mendesak</span>
                          )}
                          <p className="truncate text-sm font-bold text-slate-900">
                            {item.jenis_cuti || item.jenis_izin || "-"}
                          </p>
                        </div>
                        <p className="text-xs font-semibold text-slate-700">{item.pegawai?.nama || "-"}</p>
                        <p className="text-xs text-slate-400">
                          NIP {item.pegawai?.nip || "-"} · {item.pegawai?.unit || "-"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {item._kategori === "Cuti"
                            ? `${fmt(item.tanggal_mulai)}${item.tanggal_selesai ? ` – ${fmt(item.tanggal_selesai)}` : ""}`
                            : fmt(item.tanggal)}
                        </p>
                        {item.catatan_kabag && (
                          <p className="mt-1.5 rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-1 text-[11px] text-violet-700">
                            Catatan KABAG: {item.catatan_kabag}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <button
                          onClick={() => router.push("/direktur/approval")}
                          className="rounded-lg bg-violet-700 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-violet-800"
                        >
                          Review
                        </button>
                        <p className="text-[10px] text-slate-400">{timeAgo(item.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Riwayat Approval */}
          <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Riwayat</p>
                <h2 className="mt-1 text-lg font-extrabold text-slate-900">Keputusan Terakhir</h2>
                <p className="mt-0.5 text-sm text-slate-400">Pengajuan yang sudah Anda proses.</p>
              </div>
              <button
                onClick={() => router.push("/direktur/riwayat-approval")}
                className="flex items-center gap-1 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-xs font-bold text-violet-700 transition hover:bg-violet-100"
              >
                Semua {Ic.chevron}
              </button>
            </div>

            {statsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : riwayatRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                <p className="text-sm font-semibold text-slate-500">Belum ada riwayat keputusan.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Pegawai", "Jenis", "Periode", "Status", "Diproses"].map(h => (
                        <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 bg-white">
                    {riwayatRows.map(item => (
                      <tr key={`${item._kategori}-${item.id}`} className="dir-row transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800 whitespace-nowrap">{item.pegawai?.nama || "-"}</p>
                          <p className="text-xs text-slate-400">{item.pegawai?.unit || "-"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            item._kategori === "Cuti" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"
                          }`}>{item._kategori}</span>
                          <p className="mt-1 text-[11px] capitalize text-slate-500">
                            {(item.jenis_cuti || item.jenis_izin || "-").replace(/_/g, " ")}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {item._kategori === "Cuti"
                            ? `${fmt(item.tanggal_mulai)} – ${fmt(item.tanggal_selesai)}`
                            : fmt(item.tanggal)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusBadge(item.status)}`}>
                            {statusLabel(item.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                          {fmt(item.approved_at_direktur)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>


      </main>
    </>
  );
}
