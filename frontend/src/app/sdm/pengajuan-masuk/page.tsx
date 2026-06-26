"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Toast } from "@/components/ui/Toast";
import { API_BASE_URL } from "@/lib/api";

type LampiranItem = {
  id?: number;
  nama_file?: string | null;
  path_file?: string | null;
};

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
  lampiran: LampiranItem[];
  created_at: string;
  catatan_kaur?: string | null;
  catatan_kabag?: string | null;
  catatan_direktur?: string | null;
  rejected_reason_kaur?: string | null;
  rejected_reason_kabag?: string | null;
  rejected_reason_direktur?: string | null;
  surat_cuti_diterbitkan?: boolean;
  nomor_surat?: string | null;
  tanggal_surat?: string | null;
};

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
  pending:           "Pending KAUR",
  disetujui_kaur:    "Disetujui KAUR",
  pending_direktur:  "Pending Direktur",
  selesai:           "Selesai Otomatis",
  disetujui_final:   "Disetujui Final",
  ditolak_kaur:      "Ditolak KAUR",
  ditolak_kabag:     "Ditolak KABAG",
  ditolak_direktur:  "Ditolak Direktur",
};

const FILTER_OPTS: [string, string][] = [
  ["semua",            "Semua"],
  ["menunggu_surat",   "Menunggu Surat"],
  ["surat_diterbitkan","Surat Diterbitkan"],
  ["pending",          "Pending KAUR"],
  ["disetujui_kaur",   "Disetujui KAUR"],
  ["pending_direktur", "Pending Direktur"],
  ["selesai",          "Selesai Otomatis"],
  ["disetujui_final",  "Disetujui Final"],
  ["ditolak_kaur",     "Ditolak KAUR"],
  ["ditolak_kabag",    "Ditolak KABAG"],
  ["ditolak_direktur", "Ditolak Direktur"],
];

function isFinalApproved(item: MonitoringItem) {
  return item.kategori === "Cuti" && item.status === "disetujui_final";
}

function getLampiranUrl(lampiran: LampiranItem) {
  const rawPath = String(lampiran.path_file || "").replace(/\\/g, "/");
  if (!rawPath) return "";
  if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) return rawPath;
  return `${API_BASE_URL}${rawPath.startsWith("/") ? rawPath : `/${rawPath}`}`;
}

function getCatatanList(item: MonitoringItem) {
  return [
    { label: item.status === "selesai" || String(item.catatan_kaur || item.rejected_reason_kaur || "").includes("Auto-disetujui") ? "Sistem" : "KAUR", value: item.catatan_kaur    || item.rejected_reason_kaur    },
    { label: "KABAG",    value: item.catatan_kabag   || item.rejected_reason_kabag   },
    { label: "Direktur", value: item.catatan_direktur || item.rejected_reason_direktur },
  ].filter((n) => Boolean(n.value && String(n.value).trim()));
}

type TerbitkanModal = { open: boolean; item: MonitoringItem | null };

export default function PengajuanMasukPage() {
  const [items, setItems] = useState<MonitoringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("semua");
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [terbitkanModal, setTerbitkanModal] = useState<TerbitkanModal>({ open: false, item: null });
  const [nomorSuratInput, setNomorSuratInput] = useState("");
  const [terbitkanError, setTerbitkanError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

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
        lampiran: item.lampiran || [], created_at: item.created_at,
        catatan_kaur: item.catatan_kaur || null,
        catatan_kabag: item.catatan_kabag || null,
        catatan_direktur: item.catatan_direktur || null,
        rejected_reason_kaur: item.rejected_reason_kaur || null,
        rejected_reason_kabag: item.rejected_reason_kabag || null,
        rejected_reason_direktur: item.rejected_reason_direktur || null,
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
        lampiran: item.lampiran || [], created_at: item.created_at,
        catatan_kaur: item.catatan_kaur || null,
        catatan_kabag: item.catatan_kabag || null,
        catatan_direktur: null,
        rejected_reason_kaur: item.rejected_reason_kaur || null,
        rejected_reason_kabag: item.rejected_reason_kabag || null,
        rejected_reason_direktur: null,
      })) || [];

      setItems(
        [...cutiItems, ...izinItems].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    } catch {
      // silent — data stays empty on error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filteredItems = useMemo(() => {
    if (filter === "semua")             return items;
    if (filter === "surat_diterbitkan") return items.filter((i) => i.surat_cuti_diterbitkan);
    if (filter === "menunggu_surat")    return items.filter((i) => isFinalApproved(i) && !i.surat_cuti_diterbitkan);
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  function openTerbitkanModal(item: MonitoringItem) {
    setNomorSuratInput(item.nomor_surat || "");
    setTerbitkanError("");
    setTerbitkanModal({ open: true, item });
  }

  function closeTerbitkanModal() {
    setTerbitkanModal({ open: false, item: null });
    setNomorSuratInput("");
    setTerbitkanError("");
  }

  async function handleTerbitkanSurat() {
    const item = terbitkanModal.item;
    if (!item) return;
    const nip = localStorage.getItem("nip") || "";
    if (!nip) { setTerbitkanError("NIP SDM tidak ditemukan. Silakan login ulang."); return; }
    try {
      setPublishingId(item.id);
      const res = await fetch(`${API_BASE_URL}/cuti/${item.id}/terbitkan-surat`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nip, nomor_surat: nomorSuratInput.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Gagal menerbitkan surat.");
      closeTerbitkanModal();
      setToast({ msg: "Surat berhasil diterbitkan!", type: "success" });
      await loadData();
    } catch (err: any) {
      setTerbitkanError(err.message || "Gagal menerbitkan surat.");
    } finally {
      setPublishingId(null);
    }
  }

  function exportExcel() {
    const rows = filteredItems.map((item, i) => ({
      No: i + 1, Kategori: item.kategori, Nama: item.nama, NIP: item.nip,
      Jabatan: item.jabatan, Jenis: item.jenis, Tanggal: item.tanggal, Status: item.status,
      "Status Surat": item.kategori === "Cuti" ? (item.surat_cuti_diterbitkan ? "Diterbitkan" : "Belum") : "-",
      "Nomor Surat": item.nomor_surat || "-",
      "Tanggal Surat": formatDate(item.tanggal_surat),
      Alasan: item.alasan,
      "Catatan KAUR": item.catatan_kaur || item.rejected_reason_kaur || "-",
      "Catatan KABAG": item.catatan_kabag || item.rejected_reason_kabag || "-",
      "Catatan Direktur": item.catatan_direktur || item.rejected_reason_direktur || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monitoring Pengajuan");
    XLSX.writeFile(wb, `Monitoring-Pengajuan-SDM-${Date.now()}.xlsx`);
  }

  const menungguSurat = items.filter((i) => isFinalApproved(i) && !i.surat_cuti_diterbitkan).length;
  const suratTerbit   = items.filter((i) => i.surat_cuti_diterbitkan).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .sdm-wrap, .sdm-wrap * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
      `}</style>

      <main className="sdm-wrap min-h-screen bg-transparent p-3 sm:p-6 space-y-4">
        {/* Header */}
        <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">SDM</p>
              <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight">Pengajuan Masuk</h1>
              <p className="mt-1 text-sm text-slate-400">
                Semua pengajuan cuti dan izin pegawai. SDM dapat menerbitkan surat cuti yang sudah disetujui final.
              </p>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-600 transition hover:bg-violet-100 active:scale-95"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Refresh
            </button>
          </div>

          {/* Quick stats */}
          {!loading && (
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                { label: "Total Pengajuan", value: items.length, cls: "bg-violet-50 text-violet-700" },
                { label: "Menunggu Surat",  value: menungguSurat, cls: "bg-amber-50 text-amber-700" },
                { label: "Surat Terbit",    value: suratTerbit, cls: "bg-emerald-50 text-emerald-700" },
              ].map(({ label, value, cls }) => (
                <div key={label} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${cls}`}>
                  <span className="text-xl font-extrabold">{value}</span>
                  <span className="text-xs font-medium opacity-80">{label}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Table section */}
        <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-100 space-y-4">
          {/* Filter chips + export */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTS.map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    filter === val
                      ? "bg-violet-700 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={exportExcel}
              className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-700 active:scale-95"
            >
              ⬇ Download Excel
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap" style={{ boxShadow: "2px 0 5px -2px rgba(0,0,0,0.08)" }}>Pegawai</th>
                  {["Kategori", "Jenis", "Tanggal", "Status", "Surat Cuti", "Catatan Approval", "Lampiran", "Aksi"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">Memuat data…</td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">Tidak ada data.</td></tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={`${item.kategori}-${item.id}`} className="transition-colors hover:bg-violet-50/40">
                      <td className="sticky left-0 z-10 bg-white px-4 py-3.5" style={{ boxShadow: "2px 0 5px -2px rgba(0,0,0,0.08)" }}>
                        <p className="font-semibold text-slate-800">{item.nama}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{item.nip}</p>
                        <p className="text-xs text-slate-400">{item.jabatan}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          item.kategori === "Cuti" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"
                        }`}>
                          {item.kategori}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{item.jenis}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">{item.tanggal}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusClass(item.status)}`}>
                          {STATUS_LABEL[item.status] || item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {item.kategori !== "Cuti" ? (
                          <span className="text-slate-300">—</span>
                        ) : item.surat_cuti_diterbitkan ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">Sudah terbit</span>
                            <p className="text-xs text-slate-400">{item.nomor_surat || "-"}</p>
                            <p className="text-xs text-slate-400">{formatDate(item.tanggal_surat)}</p>
                          </div>
                        ) : isFinalApproved(item) ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">Menunggu SDM</span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">Belum final</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {getCatatanList(item).length === 0 ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <div className="max-w-[200px] space-y-1.5">
                            {getCatatanList(item).map((note) => (
                              <div key={note.label} className="rounded-lg border border-violet-100 bg-violet-50/60 px-2.5 py-1.5">
                                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-violet-500">{note.label}</p>
                                <p className="mt-0.5 text-[11px] font-medium text-slate-700">{note.value}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {item.lampiran.length === 0 ? (
                          <span className="text-xs text-slate-300">0 file</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {item.lampiran.map((file, fi) => (
                              <a
                                key={`${item.kategori}-${item.id}-${file.id || fi}`}
                                href={getLampiranUrl(file) || "#"}
                                target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-violet-100 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-600 transition hover:bg-violet-100"
                              >
                                📎 {file.nama_file || `File ${fi + 1}`}
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {item.kategori === "Cuti" && isFinalApproved(item) && !item.surat_cuti_diterbitkan && (
                          <button
                            onClick={() => openTerbitkanModal(item)}
                            disabled={publishingId === item.id}
                            className="rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-violet-700 disabled:opacity-60 active:scale-95"
                          >
                            {publishingId === item.id ? "Memproses…" : "Terbitkan Surat"}
                          </button>
                        )}
                        {item.kategori === "Cuti" && item.surat_cuti_diterbitkan && (
                          <button
                            onClick={() => window.open(`${API_BASE_URL}/cuti/${item.id}/pdf`, "_blank")}
                            className="rounded-lg bg-violet-700 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-violet-800 active:scale-95"
                          >
                            Download Surat
                          </button>
                        )}
                        {item.kategori !== "Cuti" && <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          duration={2500}
          position="top-right"
          onDismiss={() => setToast(null)}
        />
      )}

      {/* ── Modal Terbitkan Surat ── */}
      {terbitkanModal.open && terbitkanModal.item && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-7 py-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-500">SDM</p>
                <h3 className="mt-0.5 text-xl font-extrabold text-slate-900">Terbitkan Surat Cuti</h3>
              </div>
              <button
                onClick={closeTerbitkanModal}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 px-7 py-5">
              {/* Info pegawai & jenis cuti (read-only) */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Info Pengajuan</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Nama Pegawai", terbitkanModal.item.nama],
                    ["Jenis Cuti",   terbitkanModal.item.jenis],
                    ["Tanggal",      terbitkanModal.item.tanggal],
                    ["NIP",          terbitkanModal.item.nip],
                  ].map(([label, val]) => (
                    <div key={String(label)}>
                      <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
                      <p className="mt-0.5 font-semibold text-slate-800">{val || "-"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Input nomor surat */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Nomor Surat
                </label>
                <input
                  type="text"
                  value={nomorSuratInput}
                  onChange={(e) => { setNomorSuratInput(e.target.value); setTerbitkanError(""); }}
                  placeholder="Kosongkan untuk generate otomatis"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              {/* Error */}
              {terbitkanError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
                  {terbitkanError}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={closeTerbitkanModal}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-95"
                >
                  Batal
                </button>
                <button
                  onClick={handleTerbitkanSurat}
                  disabled={publishingId === terbitkanModal.item.id}
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-60 active:scale-95"
                >
                  {publishingId === terbitkanModal.item.id ? "Memproses…" : "Terbitkan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
