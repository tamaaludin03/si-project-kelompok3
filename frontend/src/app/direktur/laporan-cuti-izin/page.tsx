"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

function extractItems(payload: any): any[] {
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export default function DirekturLaporanPage() {
  const router = useRouter();
  const [cuti, setCuti] = useState<any[]>([]);
  const [izin, setIzin] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      setLoading(true);

      const [cutiRes, izinRes] = await Promise.all([
        fetch(`${API_BASE_URL}/cuti/sdm/monitoring`, { headers, cache: "no-store" }),
        fetch(`${API_BASE_URL}/izin/sdm/monitoring`, { headers, cache: "no-store" }),
      ]);

      const cutiAll = cutiRes.ok ? extractItems(await cutiRes.json().catch(() => null)) : [];
      const izinAll = izinRes.ok ? extractItems(await izinRes.json().catch(() => null)) : [];

      setCuti(cutiAll.filter((i: any) => i.status_direktur));
      setIzin(izinAll.filter((i: any) => i.status_direktur));
      setLoading(false);
    }
    loadData();
  }, []);

  const stats = useMemo(() => {
    const all = [...cuti, ...izin];
    const approved = all.filter((i) => String(i.status).includes("final") || String(i.status).includes("setuju")).length;
    const rejected = all.filter((i) => String(i.status).includes("tolak")).length;
    return { total: all.length, cuti: cuti.length, izin: izin.length, approved, rejected, pending: all.length - approved - rejected };
  }, [cuti, izin]);

  function exportCsv() {
    const rows = [
      ["Kategori", "Nama", "NIP", "Unit", "Jenis", "Status"],
      ...cuti.map((i) => ["Cuti", i.pegawai?.nama || "-", i.pegawai?.nip || "-", i.pegawai?.unit || "-", i.jenis_cuti || "-", i.status || "-"]),
      ...izin.map((i) => ["Izin", i.pegawai?.nama || "-", i.pegawai?.nip || "-", i.pegawai?.unit || "-", i.jenis_izin || "-", i.status || "-"]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "laporan-direktur-cuti-izin.csv"; link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-transparent px-3 py-4 sm:px-6 sm:py-6 text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-8 shadow-sm">
          <button onClick={() => router.back()} className="mb-4 text-sm font-semibold text-slate-500 hover:text-slate-900">← Kembali</button>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-500">Direktur</p>
          <h1 className="mt-1.5 text-3xl font-extrabold text-slate-900">Laporan Cuti & Izin</h1>
          <p className="mt-1.5 text-sm text-slate-400">Rekapitulasi pengajuan yang telah diproses melalui jalur Direktur.</p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {[["Total Pengajuan", stats.total], ["Cuti", stats.cuti], ["Izin", stats.izin],
            ["Disetujui", stats.approved], ["Menunggu", stats.pending], ["Ditolak", stats.rejected]].map(([label, value]) => (
            <div key={label as string} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-2 text-4xl font-extrabold text-slate-900">{value}</p>
            </div>
          ))}
        </div>

        <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Export Laporan</h2>
              <p className="text-sm text-slate-400 mt-1">Download rekap dalam format CSV.</p>
            </div>
            <button onClick={exportCsv} disabled={loading}
              className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-800 transition disabled:opacity-50">
              Download Laporan
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
