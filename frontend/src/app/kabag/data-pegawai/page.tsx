"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

type Pegawai = {
  id: number;
  nip?: string | null;
  nama?: string | null;
  jabatan?: string | null;
  unit?: string | null;
  kuota?: {
    tahunan?:    { jatah: number; terpakai: number; sisa: number };
    besar?:      { jatah: number; terpakai: number; sisa: number };
    haid?:       { jatah: number; terpakai: number; sisa: number };
    menikah?:    { jatah: number; terpakai: number; sisa: number };
    melahirkan?: { jatah: number; terpakai: number; sisa: number };
  };
};

export default function KabagDataPegawaiPage() {
  const [allData,    setAllData]    = useState<Pegawai[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [search,     setSearch]     = useState("");
  const [unitKabag,  setUnitKabag]  = useState("");
  const [refreshing, setRefreshing] = useState(false);

  function getUnit() {
    try {
      const raw = localStorage.getItem("user") || localStorage.getItem("simciUser");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.unit) return String(parsed.unit);
      }
    } catch {}
    return localStorage.getItem("unit") || "";
  }

  async function loadData(silent = false) {
    if (silent) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const h: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res  = await fetch(`${API_BASE_URL}/cuti/sdm/sisa-cuti-semua`, { headers: h, cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Gagal memuat data pegawai.");
      setAllData(json?.data?.items || []);
    } catch (e: any) {
      setError(e.message || "Gagal memuat data.");
    } finally {
      if (silent) setRefreshing(false); else setLoading(false);
    }
  }

  useEffect(() => {
    const unit = getUnit();
    setUnitKabag(unit);
    loadData();
  }, []);

  const unitData = useMemo(() => {
    if (!unitKabag) return allData;
    return allData.filter((p) =>
      (p.unit || "").toLowerCase().trim() === unitKabag.toLowerCase().trim()
    );
  }, [allData, unitKabag]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return unitData;
    return unitData.filter((p) =>
      [p.nama, p.nip, p.jabatan].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [unitData, search]);

  if (loading) {
    return (
      <main className="min-h-screen space-y-5 p-3 sm:p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="h-36 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-96 animate-pulse rounded-3xl bg-slate-100" />
      </main>
    );
  }

  return (
    <main className="min-h-screen space-y-5 bg-transparent p-3 sm:p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Data Pegawai Unit</p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
              {unitKabag || "Unit Kerja"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {unitData.length} pegawai terdaftar di unit ini &middot; Kuota cuti tahun {new Date().getFullYear()}
            </p>
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60 active:scale-95"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            {refreshing ? "Memuat…" : "Muat Ulang"}
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Pegawai",      val: unitData.length,                                                                                                                     b: "border-violet-100",  bg: "bg-violet-50/60",  n: "text-violet-700"  },
          { label: "Cuti Tahunan Aktif", val: unitData.filter(p => (p.kuota?.tahunan?.sisa ?? 12) > 0).length,                                                                    b: "border-amber-100",   bg: "bg-amber-50/60",   n: "text-amber-700"   },
          { label: "Kuota Habis",        val: unitData.filter(p => (p.kuota?.tahunan?.sisa ?? 12) === 0).length,                                                                   b: "border-rose-100",    bg: "bg-rose-50/60",    n: "text-rose-700"    },
          { label: "Rata-rata Sisa",     val: unitData.length ? Math.round(unitData.reduce((s, p) => s + (p.kuota?.tahunan?.sisa ?? 12), 0) / unitData.length) + " hari" : "-",   b: "border-emerald-100", bg: "bg-emerald-50/60", n: "text-emerald-700" },
        ].map(({ label, val, b, bg, n }) => (
          <div key={label} className={`rounded-3xl border ${b} ${bg} p-5 shadow-sm`}>
            <p className={`text-[2rem] font-black leading-none tracking-tight ${n}`}>{val}</p>
            <p className={`mt-2 text-[11.5px] font-semibold ${n} opacity-80`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Tabel + Search */}
      <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau NIP..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-400/10"
            />
          </div>
          <span className="text-xs text-slate-400">{filtered.length} pegawai</span>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 py-12 text-center text-sm text-slate-400">
            {unitData.length === 0
              ? `Tidak ada pegawai di unit "${unitKabag}".`
              : "Tidak ada pegawai yang cocok dengan pencarian."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 pr-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">No</th>
                  <th className="pb-3 pr-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Nama</th>
                  <th className="pb-3 pr-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">NIP</th>
                  <th className="pb-3 pr-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Jabatan</th>
                  <th className="pb-3 pr-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">Sisa Cuti</th>
                  <th className="pb-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">Terpakai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((p, idx) => {
                  const sisa     = p.kuota?.tahunan?.sisa     ?? 12;
                  const terpakai = p.kuota?.tahunan?.terpakai ?? 0;
                  const jatah    = p.kuota?.tahunan?.jatah    ?? 12;
                  const pct      = jatah > 0 ? Math.min(Math.round((terpakai / jatah) * 100), 100) : 0;
                  return (
                    <tr key={p.id} className="group transition-colors hover:bg-violet-50/30">
                      <td className="py-3.5 pr-4 text-xs text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 pr-4">
                        <p className="font-bold text-slate-900">{p.nama || "-"}</p>
                      </td>
                      <td className="py-3.5 pr-4 text-xs text-slate-500 tabular-nums">{p.nip || "-"}</td>
                      <td className="py-3.5 pr-4 text-xs text-slate-500">{p.jabatan || "-"}</td>
                      <td className="py-3.5 pr-4">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-base font-extrabold tabular-nums ${sisa === 0 ? "text-rose-600" : "text-violet-700"}`}>
                            {sisa}
                          </span>
                          <span className="text-[10px] text-slate-400">dari {jatah} hari</span>
                          <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${pct >= 80 ? "bg-rose-400" : pct >= 50 ? "bg-amber-400" : "bg-violet-400"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 text-center text-xs font-semibold text-slate-500 tabular-nums">
                        {terpakai} hari
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </main>
  );
}
