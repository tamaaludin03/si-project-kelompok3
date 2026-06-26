"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

type Pengajuan = {
  id: number; kategori: "Cuti" | "Izin"; jenis: string;
  nama: string; nip?: string | null; jabatan?: string | null; unit?: string | null;
  status: string; tanggal: string; created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu", disetujui_kaur: "Disetujui KAUR", disetujui_kabag: "Disetujui KABAG",
  disetujui_final: "Disetujui Final", ditolak_kaur: "Ditolak KAUR", ditolak_kabag: "Ditolak KABAG",
  ditolak_direktur: "Ditolak Direktur", pending_direktur: "Menunggu Direktur",
  disetujui_direktur: "Disetujui Direktur", selesai: "Selesai",
};
function statusLabel(s: string) { return STATUS_LABEL[s] || s; }
function statusBadge(s: string) {
  const l = s.toLowerCase();
  if (l.includes("final") || l === "selesai") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (l.includes("tolak")) return "border-rose-200 bg-rose-50 text-rose-700";
  if (l.includes("kaur") || l.includes("kabag")) return "border-sky-200 bg-sky-50 text-sky-700";
  if (l.includes("direktur")) return "border-indigo-200 bg-indigo-50 text-indigo-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}
function formatDate(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function formatDateTime(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_FILTERS = [
  { key: "semua",    label: "Semua" },
  { key: "pending",  label: "Menunggu" },
  { key: "proses",   label: "Diproses" },
  { key: "final",    label: "Final" },
  { key: "ditolak",  label: "Ditolak" },
];

export default function DireksiMonitoringPage() {
  const [list, setList]           = useState<Pengajuan[]>([]);
  const [loading, setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [kategori, setKategori]   = useState<"Semua" | "Cuti" | "Izin">("Semua");
  const [statusFilter, setStatusFilter] = useState("semua");

  async function load(silent = false) {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res  = await fetch(`${API_BASE_URL}/dashboard/direksi/summary`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Gagal memuat data.");
      setList(data?.data?.recentPengajuan || []);
      setLastUpdated(new Date().toISOString());
    } catch (e: any) { setError(e.message || "Gagal memuat data."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const t = window.setInterval(() => { if (document.visibilityState === "visible") load(true); }, 300_000);
    return () => window.clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    let r = list;
    if (kategori !== "Semua") r = r.filter(i => i.kategori === kategori);
    if (statusFilter !== "semua") {
      r = r.filter(i => {
        const s = i.status.toLowerCase();
        if (statusFilter === "pending") return s === "pending" || s === "pending_direktur";
        if (statusFilter === "proses") return s.includes("kaur") || s.includes("kabag");
        if (statusFilter === "final") return s.includes("final") || s === "selesai";
        if (statusFilter === "ditolak") return s.includes("tolak");
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(i =>
        i.nama.toLowerCase().includes(q) ||
        (i.nip || "").toLowerCase().includes(q) ||
        (i.unit || "").toLowerCase().includes(q) ||
        i.jenis.toLowerCase().includes(q)
      );
    }
    return r;
  }, [list, kategori, statusFilter, search]);

  const counts = useMemo(() => ({
    menunggu: list.filter(i => { const s = i.status.toLowerCase(); return s === "pending" || s === "pending_direktur"; }).length,
    proses:   list.filter(i => { const s = i.status.toLowerCase(); return s.includes("kaur") || s.includes("kabag"); }).length,
    final:    list.filter(i => { const s = i.status.toLowerCase(); return s.includes("final") || s === "selesai"; }).length,
    ditolak:  list.filter(i => i.status.toLowerCase().includes("tolak")).length,
  }), [list]);

  return (
    <main className="min-h-screen space-y-5 bg-transparent p-3 sm:p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Direktur Utama</p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">Monitoring Pengajuan</h1>
            <p className="mt-1 text-sm text-slate-400">
              Pantau seluruh pengajuan cuti dan izin secara real-time. Diperbarui setiap 30 detik.
            </p>
            {lastUpdated && <p className="mt-1.5 text-[11px] text-slate-400">Terakhir diperbarui: {formatDateTime(lastUpdated)}</p>}
          </div>
          <button
            onClick={() => load(true)}
            className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-600 transition hover:bg-violet-100 active:scale-95"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Muat Ulang
          </button>
        </div>
        {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}
      </section>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Menunggu",        val: counts.menunggu, border: "border-amber-100",   bg: "bg-amber-50/60",   num: "text-amber-700"   },
          { label: "Sedang Diproses", val: counts.proses,   border: "border-sky-100",     bg: "bg-sky-50/60",     num: "text-sky-700"     },
          { label: "Disetujui Final", val: counts.final,    border: "border-emerald-100", bg: "bg-emerald-50/60", num: "text-emerald-700" },
          { label: "Ditolak",         val: counts.ditolak,  border: "border-rose-100",    bg: "bg-rose-50/60",    num: "text-rose-700"    },
        ].map(({ label, val, border, bg, num }) => (
          <div key={label} className={`rounded-3xl border ${border} ${bg} p-5 shadow-sm`}>
            <p className={`text-[2rem] font-black leading-none tracking-tight ${num}`}>{String(val).padStart(2, "0")}</p>
            <p className={`mt-2 text-[11.5px] font-semibold ${num} opacity-80`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filter & List */}
      <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              type="text"
              placeholder="Cari nama, NIP, unit..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-400/10"
            />
          </div>

          {/* Kategori */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            {(["Semua","Cuti","Izin"] as const).map(k => (
              <button
                key={k}
                onClick={() => setKategori(k)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  kategori === k ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          {/* Status */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  statusFilter === f.key
                    ? "border-violet-300 bg-violet-100 text-violet-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="ml-auto shrink-0 text-xs text-slate-400">{filtered.length} pengajuan</span>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 py-12 text-center text-sm text-slate-400">
              Tidak ada pengajuan yang sesuai filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map(item => (
                <div
                  key={`${item.kategori}-${item.id}`}
                  className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-colors hover:bg-violet-50/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          item.kategori === "Cuti" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"
                        }`}>{item.kategori}</span>
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
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
