"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "@/lib/api";

export default function DataPegawaiPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/cuti/sdm/sisa-cuti-semua`)
      .then((r) => r.json())
      .then((j) => setData(j?.data?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const kw = search.toLowerCase().trim();
    if (!kw) return data;
    return data.filter((p: any) =>
      [p.nama, p.nip, p.unit, p.jabatan].some((v) =>
        String(v || "").toLowerCase().includes(kw)
      )
    );
  }, [data, search]);

  function exportExcel() {
    const rows = filtered.map((p: any, i: number) => ({
      No: i + 1,
      Nama: p.nama || "-",
      NIP: p.nip || "-",
      Jabatan: p.jabatan || "-",
      Unit: p.unit || "-",
      "Sisa Cuti Tahunan": p.kuota?.tahunan?.sisa ?? "-",
      "Jatah Tahunan": p.kuota?.tahunan?.jatah ?? "-",
      "Sisa Cuti Besar/Ibadah": p.kuota?.besar?.sisa ?? "-",
      "Sisa Cuti Haid": p.kuota?.haid?.sisa ?? "-",
      "Sisa Cuti Menikah": p.kuota?.menikah?.sisa ?? "-",
      "Sisa Cuti Melahirkan": p.kuota?.melahirkan?.sisa ?? "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Sisa Cuti");
    XLSX.writeFile(wb, `Data-Pegawai-Sisa-Cuti-${Date.now()}.xlsx`);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .sdm-wrap, .sdm-wrap * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
      `}</style>

      <main className="sdm-wrap min-h-screen bg-transparent p-3 sm:p-6 space-y-4">
        <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">SDM</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight">Data Pegawai</h1>
          <p className="mt-1 text-sm text-slate-400">
            Sisa kuota cuti per jenis untuk seluruh pegawai RSGM. Total: {data.length} pegawai.
          </p>
        </section>

        <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍  Cari nama, NIP, unit, jabatan..."
              className="min-w-[240px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            <button
              onClick={exportExcel}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-700 active:scale-95"
            >
              ⬇ Download Excel
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Pegawai", "Unit", "Tahunan", "Besar/Ibadah", "Haid", "Menikah", "Melahirkan"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                      Memuat data…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                      Tidak ada data.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p: any) => {
                    const isFemale = (p.jenis_kelamin ?? "P") === "P";
                    function SisaCell({ jenis }: { jenis: string }) {
                      const isPerempuanOnly = jenis === "haid" || jenis === "melahirkan";
                      if (isPerempuanOnly && !isFemale) {
                        return <td className="px-4 py-3 text-slate-300 text-xs">—</td>;
                      }
                      const q = p.kuota?.[jenis];
                      if (!q) return <td className="px-4 py-3 text-slate-300">—</td>;
                      return (
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              q.sisa === 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {q.sisa}/{q.jatah}
                          </span>
                        </td>
                      );
                    }
                    return (
                      <tr key={p.id} className="transition-colors hover:bg-violet-50/30">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{p.nama || "-"}</p>
                          <p className="text-xs text-slate-400">
                            {p.nip || "—"} · {p.jabatan || "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{p.unit || "-"}</td>
                        <SisaCell jenis="tahunan" />
                        <SisaCell jenis="besar" />
                        <SisaCell jenis="haid" />
                        <SisaCell jenis="menikah" />
                        <SisaCell jenis="melahirkan" />
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && (
            <p className="text-xs text-slate-400 text-right">
              Menampilkan {filtered.length} dari {data.length} pegawai
            </p>
          )}
        </section>
      </main>
    </>
  );
}
