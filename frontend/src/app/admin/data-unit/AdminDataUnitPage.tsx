"use client";

import React, { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

type Pegawai = {
  id: number;
  username: string;
  nip?: string | null;
  nama?: string | null;
  jabatan?: string | null;
  unit?: string | null;
  role: string;
  internal_role?: string | null;
  portal_pegawai_access: boolean;
  must_change_password: boolean;
  is_nakes: boolean;
  jenis_kelamin?: string | null;
};

type UnitRow = {
  unit: string;
  total: number;
  nakes: number;
  nonNakes: number;
  kaur: number;
  kabag: number;
  pegawai: Pegawai[];
};

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-violet-800">
      <p className="text-xs font-bold uppercase tracking-[0.12em]">{title}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

export default function AdminDataUnitPage() {
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE_URL}/pegawai/admin/list`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal memuat data unit");
      setPegawai(data?.data?.items || []);
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function toggleUnit(unit: string) {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unit)) next.delete(unit); else next.add(unit);
      return next;
    });
  }

  const units = useMemo<UnitRow[]>(() => {
    const map = new Map<string, UnitRow>();
    pegawai.forEach((p) => {
      const unit = p.unit?.trim() || "Tanpa Unit";
      const row = map.get(unit) ?? { unit, total: 0, nakes: 0, nonNakes: 0, kaur: 0, kabag: 0, pegawai: [] };
      row.total += 1;
      row.pegawai.push(p);
      if (p.is_nakes) row.nakes += 1; else row.nonNakes += 1;
      if (p.internal_role === "kaur")  row.kaur  += 1;
      if (p.internal_role === "kabag") row.kabag += 1;
      map.set(unit, row);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [pegawai]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return units.filter((u) => u.unit.toLowerCase().includes(q));
  }, [units, search]);

  if (loading) {
    return (
      <main className="min-h-screen bg-transparent p-3 sm:p-6">
        <div className="rounded-3xl bg-white p-8">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
            <span className="text-sm font-semibold text-slate-500">Memuat data unit…</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent p-3 sm:p-6 space-y-4">

      {/* Header */}
      <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-700">Admin</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Data Unit</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Rekap distribusi pegawai berdasarkan unit organisasi RSGM.
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            Refresh
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
        )}
      </section>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card title="Total Unit"    value={units.length} />
        <Card title="Total Pegawai" value={pegawai.length} />
        <Card title="Total Nakes"   value={pegawai.filter((p) => p.is_nakes).length} />
        <Card title="Unit Terbesar" value={units[0]?.total || 0} />
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari unit..."
          className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Table */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Unit</th>
                <th className="px-4 py-3.5 text-center">Total</th>
                <th className="px-4 py-3.5 text-center">Nakes</th>
                <th className="px-4 py-3.5 text-center">Non Nakes</th>
                <th className="px-4 py-3.5 text-center">Ka. Unit</th>
                <th className="px-4 py-3.5 text-center">Ka. Bagian</th>
                <th className="px-5 py-3.5 text-center">Pegawai</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const isExpanded = expandedUnits.has(row.unit);
                return (
                  <React.Fragment key={row.unit}>
                    {/* Unit row */}
                    <tr
                      className="border-t border-slate-100 cursor-pointer select-none hover:bg-slate-50"
                      onClick={() => toggleUnit(row.unit)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <svg
                            className={`h-3.5 w-3.5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
                          >
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                          <span className="font-bold text-slate-900">{row.unit}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-violet-700">{row.total}</td>
                      <td className="px-4 py-4 text-center text-emerald-700">{row.nakes}</td>
                      <td className="px-4 py-4 text-center text-slate-600">{row.nonNakes}</td>
                      <td className="px-4 py-4 text-center">
                        {row.kaur > 0
                          ? <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">{row.kaur}</span>
                          : <span className="text-slate-300">–</span>}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {row.kabag > 0
                          ? <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">{row.kabag}</span>
                          : <span className="text-slate-300">–</span>}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {row.total} Pegawai
                        </span>
                      </td>
                    </tr>

                    {/* Expandable sub-table row */}
                    <tr>
                      <td colSpan={7} className="p-0">
                        <div
                          style={{
                            display: "grid",
                            gridTemplateRows: isExpanded ? "1fr" : "0fr",
                            transition: "grid-template-rows 250ms ease",
                          }}
                        >
                          <div className="overflow-hidden">
                            <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-4">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-slate-200">
                                    <th className="pb-2.5 pr-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">No</th>
                                    <th className="pb-2.5 pr-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Nama Lengkap</th>
                                    <th className="pb-2.5 pr-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">NIP</th>
                                    <th className="pb-2.5 pr-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Jabatan</th>
                                    <th className="pb-2.5 pr-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">Nakes / Non-Nakes</th>
                                    <th className="pb-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">Jenis Kelamin</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {row.pegawai.map((p, idx) => (
                                    <tr key={p.id} className="hover:bg-white/60">
                                      <td className="py-2.5 pr-4 text-slate-400">{idx + 1}</td>
                                      <td className="py-2.5 pr-4 font-semibold text-slate-800">{p.nama || "-"}</td>
                                      <td className="py-2.5 pr-4 font-mono text-slate-500">{p.nip || "-"}</td>
                                      <td className="py-2.5 pr-4">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-slate-500">{p.jabatan || "-"}</span>
                                          {p.internal_role === "kaur" && (
                                            <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-700">KAUR</span>
                                          )}
                                          {p.internal_role === "kabag" && (
                                            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-700">KABAG</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-2.5 pr-4 text-center">
                                        {p.is_nakes
                                          ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Nakes</span>
                                          : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Non-Nakes</span>}
                                      </td>
                                      <td className="py-2.5 text-center">
                                        {p.jenis_kelamin === "L"
                                          ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">Laki-laki</span>
                                          : p.jenis_kelamin === "P"
                                          ? <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-600">Perempuan</span>
                                          : <span className="text-slate-300">–</span>}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-400">Unit tidak ditemukan.</div>
          )}
        </div>
      </section>
    </main>
  );
}
