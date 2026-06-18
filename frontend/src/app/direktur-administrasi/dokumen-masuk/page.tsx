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

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function getFileUrl(file: any) {
  const url = file.path_file || file.file_url || file.url || file.path || "";
  if (!url) return "#";
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

export default function DirekturDokumenMasukPage() {
  const router = useRouter();
  const [cuti, setCuti] = useState<any[]>([]);
  const [izin, setIzin] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    async function loadData() {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      setLoading(true);

      const [cutiRes, izinRes] = await Promise.all([
        fetch(`${API_BASE_URL}/cuti/direktur-administrasi/pending`, { headers, cache: "no-store" }),
        fetch(`${API_BASE_URL}/izin/direktur-administrasi/pending`, { headers, cache: "no-store" }),
      ]);

      setCuti(cutiRes.ok ? extractItems(await cutiRes.json().catch(() => null)) : []);
      setIzin(izinRes.ok ? extractItems(await izinRes.json().catch(() => null)) : []);
      setLoading(false);
    }
    loadData();
  }, []);

  const rows = useMemo(() => {
    const cutiRows = cuti.map((item) => ({
      id: item.id, kategori: "Cuti",
      nama: item.pegawai?.nama || "-", nip: item.pegawai?.nip || "-",
      unit: item.pegawai?.unit || "-", jenis: item.jenis_cuti || "-",
      periode: `${formatDate(item.tanggal_mulai)} - ${formatDate(item.tanggal_selesai)}`,
      status: item.status || "-",
      lampiran: item.lampiran || [],
    }));
    const izinRows = izin.map((item) => ({
      id: item.id, kategori: "Izin",
      nama: item.pegawai?.nama || "-", nip: item.pegawai?.nip || "-",
      unit: item.pegawai?.unit || "-", jenis: item.jenis_izin || "-",
      periode: `${formatDate(item.tanggal)}${item.jam_mulai ? `, ${item.jam_mulai}` : ""}`,
      status: item.status || "-",
      lampiran: item.lampiran || [],
    }));
    const q = keyword.toLowerCase();
    return [...cutiRows, ...izinRows].filter((i) =>
      i.nama.toLowerCase().includes(q) || i.nip.toLowerCase().includes(q) ||
      i.unit.toLowerCase().includes(q) || i.jenis.toLowerCase().includes(q)
    );
  }, [cuti, izin, keyword]);

  return (
    <main className="min-h-screen bg-transparent px-3 py-4 sm:px-6 sm:py-6 text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-8 shadow-sm">
          <button onClick={() => router.back()} className="mb-4 text-sm font-semibold text-slate-500 hover:text-slate-900">← Kembali</button>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-500">Direktur Administrasi</p>
          <h1 className="mt-1.5 text-3xl font-extrabold text-slate-900">Dokumen Masuk</h1>
          <p className="mt-1.5 text-sm text-slate-400">Dokumen pendukung dari pengajuan cuti dan izin Kabag sebelum Anda setujui.</p>
        </header>

        <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-slate-500">{rows.length} pengajuan masuk.</p>
            <input
              value={keyword} onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari nama, NIP, unit..."
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          {loading ? (
            <p className="text-sm text-slate-400 py-6 text-center">Memuat dokumen...</p>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-6 text-sm font-semibold text-slate-500 text-center">Belum ada dokumen masuk.</div>
          ) : (
            <div className="space-y-3">
              {rows.map((item) => (
                <div key={`${item.kategori}-${item.id}`} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:-translate-y-0.5 transition">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex gap-2 mb-2">
                        <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-bold">{item.kategori}</span>
                        <span className="rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-xs font-bold">{item.status}</span>
                      </div>
                      <p className="text-lg font-extrabold text-slate-900">{item.nama}</p>
                      <p className="text-sm text-slate-500">{item.nip} · {item.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">{item.jenis}</p>
                      <p className="text-sm text-slate-500">{item.periode}</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Lampiran</p>
                    {item.lampiran.length === 0 ? (
                      <p className="text-sm text-slate-400">Tidak ada lampiran.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {item.lampiran.map((file: any, idx: number) => (
                          <a key={idx} href={getFileUrl(file)} target="_blank" rel="noreferrer"
                            className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100 transition">
                            {file.nama_file || file.name || `Dokumen ${idx + 1}`}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
