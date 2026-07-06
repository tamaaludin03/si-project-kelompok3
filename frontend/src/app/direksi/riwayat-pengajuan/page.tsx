"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

function extractItems(payload: any): any[] {
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function statusClass(status: string) {
  const v = status.toLowerCase();
  if (v.includes("tolak") || v.includes("reject")) return "border-rose-200 bg-rose-50 text-rose-700";
  if (v.includes("setuju") || v.includes("approve") || v.includes("final")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function DireksiRiwayatPengajuanPage() {
  const [cuti, setCuti] = useState<any[]>([]);
  const [izin, setIzin] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kategori, setKategori] = useState<"semua" | "Cuti" | "Izin">("semua");
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const [cutiRes, izinRes] = await Promise.all([
        fetch(`${API_BASE_URL}/cuti/sdm/monitoring`, { cache: "no-store" }),
        fetch(`${API_BASE_URL}/izin/sdm/monitoring`, { cache: "no-store" }),
      ]);

      const cutiAll = cutiRes.ok ? extractItems(await cutiRes.json().catch(() => null)) : [];
      const izinAll = izinRes.ok ? extractItems(await izinRes.json().catch(() => null)) : [];

      setCuti(cutiAll.filter((i: any) => i.status_direksi));
      setIzin(izinAll.filter((i: any) => i.status_direksi));
      setLoading(false);
    }
    loadData();
  }, []);

  const rows = useMemo(() => {
    const cutiRows = cuti.map((item) => ({
      id: item.id, kategori: "Cuti" as const,
      nama: item.pegawai?.nama || "-", nip: item.pegawai?.nip || "-",
      unit: item.pegawai?.unit || "-", jabatan: item.pegawai?.jabatan || "-",
      jenis: item.jenis_cuti || "-",
      periode: `${formatDate(item.tanggal_mulai)} - ${formatDate(item.tanggal_selesai)}`,
      status: item.status || "-",
      catatan: item.rejected_reason_direksi || item.catatan_direksi || "Tidak ada catatan.",
      updatedAt: item.approved_at_direksi || item.updated_at || item.created_at || "",
    }));
    const izinRows = izin.map((item) => ({
      id: item.id, kategori: "Izin" as const,
      nama: item.pegawai?.nama || "-", nip: item.pegawai?.nip || "-",
      unit: item.pegawai?.unit || "-", jabatan: item.pegawai?.jabatan || "-",
      jenis: item.jenis_izin || "-",
      periode: `${formatDate(item.tanggal)}${item.jam_mulai ? `, ${item.jam_mulai}` : ""}`,
      status: item.status || "-",
      catatan: item.rejected_reason_direksi || item.catatan_direksi || "Tidak ada catatan.",
      updatedAt: item.approved_at_direksi || item.updated_at || item.created_at || "",
    }));
    const q = keyword.toLowerCase();
    return [...cutiRows, ...izinRows]
      .filter((i) => kategori === "semua" || i.kategori === kategori)
      .filter((i) => i.nama.toLowerCase().includes(q) || i.nip.toLowerCase().includes(q) || i.jenis.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [cuti, izin, kategori, keyword]);

  const totalApproved = rows.filter((i) => i.status.toLowerCase().includes("final") || i.status.toLowerCase().includes("setuju")).length;
  const totalRejected = rows.filter((i) => i.status.toLowerCase().includes("tolak")).length;

  return (
    <main className="min-h-screen space-y-5 bg-transparent p-3 sm:p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Direktur Utama</p>
        <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">Riwayat Pengajuan</h1>
        <p className="mt-1 text-sm text-slate-400">Riwayat pengajuan cuti dan izin yang sudah Anda putuskan.</p>
      </section>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Total Riwayat</p>
          <p className="mt-2 text-[2rem] font-black leading-none text-slate-800">{rows.length}</p>
        </div>
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">Disetujui</p>
          <p className="mt-2 text-[2rem] font-black leading-none text-emerald-700">{totalApproved}</p>
        </div>
        <div className="rounded-3xl border border-rose-100 bg-rose-50/60 p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-rose-600">Ditolak</p>
          <p className="mt-2 text-[2rem] font-black leading-none text-rose-700">{totalRejected}</p>
        </div>
      </div>

      {/* Filter & List */}
      <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            {(["semua", "Cuti", "Izin"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKategori(k)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  kategori === k ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {k === "semua" ? "Semua" : k}
              </button>
            ))}
          </div>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Cari nama, NIP, jenis..."
            className="w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-400/10"
          />
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 py-12 text-center text-sm text-slate-400">
              Belum ada riwayat pengajuan yang Anda putuskan.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((item) => (
                <div key={`${item.kategori}-${item.id}`} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-colors hover:bg-violet-50/30">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          item.kategori === "Cuti" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"
                        }`}>{item.kategori}</span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusClass(item.status)}`}>{item.status}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-bold text-slate-900">{item.nama}</p>
                      <p className="text-xs text-slate-400">NIP {item.nip} · {item.jabatan} · {item.unit}</p>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="text-sm font-bold text-slate-800">{item.jenis}</p>
                      <p className="text-xs text-slate-500">{item.periode}</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl bg-violet-50/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">Catatan Anda</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-700">{item.catatan}</p>
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
