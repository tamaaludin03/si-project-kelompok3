"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "@/lib/api";

type MonitoringItem = {
  id: number;
  kategori: "Cuti" | "Izin";
  nama: string;
  nip: string;
  jabatan: string;
  jenis: string;
  tanggal: string;
  status: string;
  alasan: string;
  created_at: string;
  surat_cuti_diterbitkan?: boolean;
  nomor_surat?: string | null;
  tanggal_surat?: string | null;
};

const BULAN_LABELS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (s.includes("final") || s.includes("setujui") || s === "selesai") return "bg-emerald-100 text-emerald-700";
  if (s.includes("tolak")) return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

const STATUS_LABEL: Record<string, string> = {
  pending:          "Pending KAUR",
  disetujui_kaur:   "Disetujui KAUR",
  pending_direktur: "Pending Direktur",
  selesai:          "Selesai Otomatis",
  disetujui_final:  "Disetujui Final",
  ditolak_kaur:     "Ditolak KAUR",
  ditolak_kabag:    "Ditolak KABAG",
  ditolak_direktur: "Ditolak Direktur",
};

export default function LaporanPage() {
  const now = new Date();
  const [allItems, setAllItems] = useState<MonitoringItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [bulan, setBulan]       = useState(now.getMonth() + 1);
  const [tahun, setTahun]       = useState(now.getFullYear());

  async function loadData() {
    setLoading(true);
    try {
      const [cutiRes, izinRes] = await Promise.all([
        fetch(`${API_BASE_URL}/cuti/sdm/monitoring`),
        fetch(`${API_BASE_URL}/izin/sdm/monitoring`),
      ]);
      const cutiData = await cutiRes.json().catch(() => null);
      const izinData = await izinRes.json().catch(() => null);

      const cutiItems: MonitoringItem[] = cutiData?.data?.items?.map((item: any) => ({
        id: item.id, kategori: "Cuti" as const,
        nama: item.pegawai?.nama || "-", nip: item.pegawai?.nip || "-",
        jabatan: item.pegawai?.jabatan || "-", jenis: item.jenis_cuti,
        tanggal: `${formatDate(item.tanggal_mulai)} – ${formatDate(item.tanggal_selesai)}`,
        status: item.status, alasan: item.alasan || "-",
        created_at: item.created_at,
        surat_cuti_diterbitkan: Boolean(item.surat_cuti_diterbitkan),
        nomor_surat: item.nomor_surat || null,
        tanggal_surat: item.tanggal_surat || null,
      })) || [];

      const izinItems: MonitoringItem[] = izinData?.data?.items?.map((item: any) => ({
        id: item.id, kategori: "Izin" as const,
        nama: item.pegawai?.nama || "-", nip: item.pegawai?.nip || "-",
        jabatan: item.pegawai?.jabatan || "-", jenis: item.jenis_izin,
        tanggal: formatDate(item.tanggal),
        status: item.status, alasan: item.alasan || "-",
        created_at: item.created_at,
      })) || [];

      setAllItems(
        [...cutiItems, ...izinItems].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() =>
    allItems.filter((item) => {
      const d = new Date(item.created_at);
      return d.getMonth() + 1 === bulan && d.getFullYear() === tahun;
    }),
  [allItems, bulan, tahun]);

  const stats = useMemo(() => ({
    total:   filtered.length,
    cuti:    filtered.filter((i) => i.kategori === "Cuti").length,
    izin:    filtered.filter((i) => i.kategori === "Izin").length,
    selesai: filtered.filter((i) =>
      ["disetujui_final", "selesai"].includes(i.status) || i.surat_cuti_diterbitkan === true
    ).length,
    ditolak: filtered.filter((i) => i.status.includes("ditolak")).length,
    pending: filtered.filter((i) =>
      ["pending", "disetujui_kaur", "pending_direktur"].includes(i.status)
    ).length,
  }), [filtered]);

  function exportExcel() {
    const rows = filtered.map((item, i) => ({
      No: i + 1, Kategori: item.kategori, Nama: item.nama, NIP: item.nip,
      Jabatan: item.jabatan, Jenis: item.jenis, Tanggal: item.tanggal,
      Status: STATUS_LABEL[item.status] || item.status,
      "Tanggal Pengajuan": formatDate(item.created_at),
      "Nomor Surat": item.nomor_surat || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, `Laporan-SDM-${BULAN_LABELS[bulan - 1]}-${tahun}.xlsx`);
  }

  const tahunOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .sdm-wrap, .sdm-wrap * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
      `}</style>

      <main className="sdm-wrap min-h-screen bg-transparent p-3 sm:p-6 space-y-4">
        {/* Header */}
        <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">SDM</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight">Laporan</h1>
          <p className="mt-1 text-sm text-slate-400">
            Rekap pengajuan cuti dan izin per periode. Filter berdasarkan bulan dan tahun, lalu export ke Excel.
          </p>
        </section>

        {/* Filter + export */}
        <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-100">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bulan</label>
              <select
                value={bulan}
                onChange={(e) => setBulan(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-400 cursor-pointer"
              >
                {BULAN_LABELS.map((label, i) => (
                  <option key={i + 1} value={i + 1}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tahun</label>
              <select
                value={tahun}
                onChange={(e) => setTahun(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-400 cursor-pointer"
              >
                {tahunOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              onClick={exportExcel}
              disabled={filtered.length === 0}
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 active:scale-95 disabled:opacity-40"
            >
              ⬇ Export Excel — {BULAN_LABELS[bulan - 1]} {tahun}
            </button>
          </div>

          {/* Summary cards */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Total",    value: stats.total,   cls: "bg-violet-50 text-violet-600 border-violet-100" },
              { label: "Cuti",     value: stats.cuti,    cls: "bg-violet-50 text-violet-600 border-violet-100" },
              { label: "Izin",     value: stats.izin,    cls: "bg-violet-50 text-violet-600 border-violet-100" },
              { label: "Selesai",  value: stats.selesai, cls: "bg-violet-50 text-violet-600 border-violet-100" },
              { label: "Menunggu", value: stats.pending, cls: "bg-amber-50 text-amber-500 border-amber-100"   },
              { label: "Ditolak",  value: stats.ditolak, cls: "bg-rose-50 text-red-500 border-rose-100"       },
            ].map(({ label, value, cls }) => (
              <div key={label} className={`rounded-2xl border p-4 text-center ${cls}`}>
                <p className="text-3xl font-extrabold">{value}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Table */}
        <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              Rincian Pengajuan — {BULAN_LABELS[bulan - 1]} {tahun}
            </h2>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
              {filtered.length} pengajuan
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["No", "Pegawai", "Kategori", "Jenis", "Tanggal", "Tgl Pengajuan", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">Memuat data…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                      Tidak ada pengajuan pada {BULAN_LABELS[bulan - 1]} {tahun}.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item, i) => (
                    <tr key={`${item.kategori}-${item.id}`} className="hover:bg-violet-50/30">
                      <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800">{item.nama}</p>
                        <p className="text-xs text-slate-400">{item.nip} · {item.jabatan}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          item.kategori === "Cuti" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"
                        }`}>
                          {item.kategori}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{item.jenis}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">{item.tanggal}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">{formatDate(item.created_at)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusClass(item.status)}`}>
                          {STATUS_LABEL[item.status] || item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
