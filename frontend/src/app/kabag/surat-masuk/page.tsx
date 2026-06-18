"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

type LampiranItem = {
  id?: number; nama_file?: string | null; path_file?: string | null;
  tipe_file?: string | null; ukuran_file?: number | null;
};

type Row = {
  id: number; kategori: "Cuti" | "Izin";
  nama: string; nip: string; jabatan: string; unit: string;
  jenis: string; periode: string; alasan: string; status: string;
  lampiran: LampiranItem[];
};

function extractItems(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (s.includes("tolak") || s.includes("reject"))  return "border-rose-200 bg-rose-50 text-rose-700";
  if (s.includes("approve") || s.includes("setuju")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function statusLabel(status: string) {
  const s = status.toLowerCase();
  if (s.includes("tolak") || s.includes("reject"))  return "Ditolak";
  if (s.includes("approve") || s.includes("setuju")) return "Disetujui";
  return "Menunggu";
}

function formatJenis(value?: string) {
  if (!value) return "-";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getLampiran(item: any): LampiranItem[] {
  return item.lampiran || item.lampirans || item.cutiLampiran || item.izinLampiran ||
    item.cuti_lampiran || item.izin_lampiran || item.CutiLampiran || item.IzinLampiran ||
    item.attachments || item.files || [];
}

function getLampiranUrl(lampiran: LampiranItem): string {
  const rawPath = String(lampiran.path_file || "").replace(/\\/g, "/");
  if (!rawPath) return "";
  if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) return rawPath;
  const normalized = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  return `${API_BASE_URL}${normalized}`;
}

export default function KabagSuratMasukPage() {
  const router = useRouter();
  const [cuti, setCuti]       = useState<any[]>([]);
  const [izin, setIzin]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [kategori, setKategori] = useState<"semua" | "Cuti" | "Izin">("semua");

  async function safeFetch(urls: string[]) {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    for (const url of urls) {
      try {
        const res  = await fetch(url, { headers, cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (res.ok) return extractItems(json);
      } catch { continue; }
    }
    return [];
  }

  async function loadData() {
    setLoading(true);
    const [cutiData, izinData] = await Promise.all([
      safeFetch([`${API_BASE_URL}/cuti/kabag/pending`, `${API_BASE_URL}/cuti/kabag/surat-masuk`, `${API_BASE_URL}/cuti/kabag/masuk`]),
      safeFetch([`${API_BASE_URL}/izin/kabag/pending`, `${API_BASE_URL}/izin/kabag/surat-masuk`, `${API_BASE_URL}/izin/kabag/masuk`]),
    ]);
    setCuti(cutiData); setIzin(izinData); setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const rows = useMemo<Row[]>(() => {
    const cutiRows: Row[] = cuti.map((item) => ({
      id: item.id, kategori: "Cuti",
      nama: item.pegawai?.nama || item.nama || "-",
      nip: item.pegawai?.nip || item.nip || "-",
      jabatan: item.pegawai?.jabatan || item.jabatan || "-",
      unit: item.pegawai?.unit || item.unit || "-",
      jenis: item.jenis_cuti || item.jenis || "-",
      periode: `${formatDate(item.tanggal_mulai)} – ${formatDate(item.tanggal_selesai)}`,
      alasan: item.alasan || "-",
      status: item.status || "Menunggu",
      lampiran: getLampiran(item),
    }));
    const izinRows: Row[] = izin.map((item) => ({
      id: item.id, kategori: "Izin",
      nama: item.pegawai?.nama || item.nama || "-",
      nip: item.pegawai?.nip || item.nip || "-",
      jabatan: item.pegawai?.jabatan || item.jabatan || "-",
      unit: item.pegawai?.unit || item.unit || "-",
      jenis: item.jenis_izin || item.jenis || "-",
      periode: `${formatDate(item.tanggal || item.tanggal_mulai)}${item.jam_mulai ? `, ${item.jam_mulai}` : ""}`,
      alasan: item.alasan || "-",
      status: item.status || "Menunggu",
      lampiran: getLampiran(item),
    }));
    return [...cutiRows, ...izinRows]
      .filter((r) => kategori === "semua" || r.kategori === kategori)
      .filter((r) => {
        const q = keyword.toLowerCase();
        return !q || [r.nama, r.nip, r.unit, r.jabatan, r.jenis, r.status].some((v) => v.toLowerCase().includes(q));
      });
  }, [cuti, izin, kategori, keyword]);

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="min-h-screen bg-transparent">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      <div className="mx-auto max-w-6xl space-y-5 px-3 py-4 sm:px-6 sm:py-8">

        {/* Header */}
        <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button onClick={() => router.back()}
                className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-400 transition hover:text-slate-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                Kembali
              </button>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-500">Kepala Bagian</p>
              <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">Surat Masuk</h1>
              <p className="mt-1.5 text-sm text-slate-400">
                Pengajuan cuti dan izin yang telah diverifikasi Kepala Unit dan masuk ke antrian Anda.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-2xl border border-violet-100 bg-violet-50 px-3.5 py-1.5 text-xs font-bold text-violet-700">
                {cuti.length + izin.length} surat
              </span>
              <button onClick={loadData}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-95">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                Muat Ulang
              </button>
            </div>
          </div>
        </section>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Surat", value: cuti.length + izin.length, color: "violet" },
            { label: "Cuti",        value: cuti.length,               color: "violet" },
            { label: "Izin",        value: izin.length,               color: "emerald" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-3xl border border-${color}-100 bg-${color}-50/60 p-5 shadow-sm`}>
              <p className={`text-[11px] font-bold uppercase tracking-wide text-${color}-600`}>{label}</p>
              <p className={`mt-2 text-3xl font-extrabold text-${color}-800`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {(["semua", "Cuti", "Izin"] as const).map((k) => (
                <button key={k} onClick={() => setKategori(k)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${kategori === k ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {k === "semua" ? "Semua" : k}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
                placeholder="Cari nama, NIP, unit..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 focus:bg-white" />
            </div>
          </div>
        </section>

        {/* List */}
        {loading ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
            <p className="mt-3 text-sm text-slate-400">Memuat surat masuk...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Belum ada surat masuk.</p>
          </div>
        ) : (
          <>
            <p className="px-1 text-xs font-semibold text-slate-400">Menampilkan {rows.length} surat</p>
            <div className="space-y-3">
              {rows.map((item) => (
                <div key={`${item.kategori}-${item.id}`}
                  className="rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md">
                  {/* Card header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 rounded-t-3xl bg-slate-50/60 px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-extrabold ${item.kategori === "Cuti" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {(item.nama || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">{item.nama}</p>
                        <p className="text-xs text-slate-500">NIP {item.nip} &nbsp;·&nbsp; {item.jabatan}</p>
                        <p className="text-xs text-slate-400">Unit: {item.unit}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${item.kategori === "Cuti" ? "border-violet-200 bg-violet-50 text-violet-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                        {item.kategori}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${statusClass(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Jenis</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{formatJenis(item.jenis)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Periode / Waktu</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{item.periode}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Alasan</p>
                      <p className="mt-1 text-sm text-slate-600 line-clamp-2">{item.alasan}</p>
                    </div>
                  </div>

                  {/* Lampiran */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-6 py-4">
                    {item.lampiran.length === 0 ? (
                      <span className="text-xs text-slate-400">Tidak ada lampiran</span>
                    ) : item.lampiran.map((file, index) => {
                      const fileUrl = getLampiranUrl(file);
                      return (
                        <a key={file.id ?? index} href={fileUrl || "#"} target="_blank" rel="noreferrer"
                          onClick={(e) => { if (!fileUrl) { e.preventDefault(); alert("URL dokumen tidak ditemukan."); } }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100">
                          📎 {file.nama_file || `Dokumen ${index + 1}`}
                        </a>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
