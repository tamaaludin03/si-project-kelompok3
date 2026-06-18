"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

function extractItems(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
}

export default function LaporanCutiIzinPage() {
  const router = useRouter();

  const [cuti, setCuti] = useState<any[]>([]);
  const [izin, setIzin] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function safeFetch(urls: string[]) {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    for (const url of urls) {
      try {
        const res = await fetch(url, { headers, cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (res.ok) return extractItems(json);
      } catch {}
    }

    return [];
  }

  async function loadData() {
    setLoading(true);

    const [cutiData, izinData] = await Promise.all([
      safeFetch([
        `${API_BASE_URL}/cuti/kepala-administrasi/riwayat`,
        `${API_BASE_URL}/cuti/kepala-administrasi/pending`,
        `${API_BASE_URL}/cuti`,
      ]),
      safeFetch([
        `${API_BASE_URL}/izin/kepala-administrasi/riwayat`,
        `${API_BASE_URL}/izin/kepala-administrasi/pending`,
        `${API_BASE_URL}/izin`,
      ]),
    ]);

    setCuti(cutiData);
    setIzin(izinData);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const all = [...cuti, ...izin];

    const approved = all.filter((item) => {
      const value = String(item.status || "").toLowerCase();
      return value.includes("approve") || value.includes("setuju");
    }).length;

    const rejected = all.filter((item) => {
      const value = String(item.status || "").toLowerCase();
      return value.includes("reject") || value.includes("tolak");
    }).length;

    const pending = all.length - approved - rejected;

    return {
      total: all.length,
      cuti: cuti.length,
      izin: izin.length,
      approved,
      rejected,
      pending,
    };
  }, [cuti, izin]);

  function exportCsv() {
    const rows = [
      ["Kategori", "Nama", "NIP", "Unit", "Jenis", "Status"],
      ...cuti.map((item) => [
        "Cuti",
        item.pegawai?.nama || "-",
        item.pegawai?.nip || "-",
        item.pegawai?.unit || "-",
        item.jenis_cuti || "-",
        item.status || "-",
      ]),
      ...izin.map((item) => [
        "Izin",
        item.pegawai?.nama || "-",
        item.pegawai?.nip || "-",
        item.pegawai?.unit || "-",
        item.jenis_izin || "-",
        item.status || "-",
      ]),
    ];

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "laporan-cuti-izin.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main
      className="min-h-screen bg-transparent px-3 py-4 sm:px-6 sm:py-6 text-slate-900"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            ← Kembali
          </button>

          <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-700">
            Kepala Administrasi
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            Laporan Cuti dan Izin
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600">
            Rekapitulasi pengajuan cuti dan izin untuk kebutuhan monitoring dan
            pelaporan.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["Total Pengajuan", stats.total],
            ["Cuti", stats.cuti],
            ["Izin", stats.izin],
            ["Disetujui", stats.approved],
            ["Menunggu", stats.pending],
            ["Ditolak", stats.rejected],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                {label}
              </p>
              <h2 className="mt-3 text-5xl font-black text-slate-950">
                {value}
              </h2>
            </div>
          ))}
        </div>

        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Export Laporan
              </h2>
              <p className="text-sm font-medium text-slate-500">
                Download rekap cuti dan izin dalam format CSV.
              </p>
            </div>

            <button
              onClick={exportCsv}
              disabled={loading}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50"
            >
              Download Laporan
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}