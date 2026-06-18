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

function statusClass(status: string) {
  const v = status.toLowerCase();
  if (v.includes("tolak") || v.includes("reject")) return "border-red-200 bg-red-50 text-red-700";
  if (v.includes("setuju") || v.includes("approve") || v.includes("final")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function DirekturRiwayatApprovalPage() {
  const router = useRouter();
  const [cuti, setCuti] = useState<any[]>([]);
  const [izin, setIzin] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kategori, setKategori] = useState<"semua" | "Cuti" | "Izin">("semua");
  const [keyword, setKeyword] = useState("");

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

  const rows = useMemo(() => {
    const cutiRows = cuti.map((item) => ({
      id: item.id, kategori: "Cuti" as const,
      nama: item.pegawai?.nama || "-", nip: item.pegawai?.nip || "-",
      unit: item.pegawai?.unit || "-", jabatan: item.pegawai?.jabatan || "-",
      jenis: item.jenis_cuti || "-",
      periode: `${formatDate(item.tanggal_mulai)} - ${formatDate(item.tanggal_selesai)}`,
      status: item.status || "-",
      catatan: item.catatan_direktur || "Tidak ada catatan.",
      updatedAt: item.updated_at || item.created_at || "",
    }));
    const izinRows = izin.map((item) => ({
      id: item.id, kategori: "Izin" as const,
      nama: item.pegawai?.nama || "-", nip: item.pegawai?.nip || "-",
      unit: item.pegawai?.unit || "-", jabatan: item.pegawai?.jabatan || "-",
      jenis: item.jenis_izin || "-",
      periode: `${formatDate(item.tanggal)}${item.jam_mulai ? `, ${item.jam_mulai}` : ""}`,
      status: item.status || "-",
      catatan: item.catatan_direktur || "Tidak ada catatan.",
      updatedAt: item.updated_at || item.created_at || "",
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
    <main className="min-h-screen bg-transparent px-3 py-4 sm:px-6 sm:py-6 text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-8 shadow-sm">
          <button onClick={() => router.back()} className="mb-4 text-sm font-semibold text-slate-500 hover:text-slate-900">← Kembali</button>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-500">Direktur</p>
          <h1 className="mt-1.5 text-3xl font-extrabold text-slate-900">Riwayat Keputusan</h1>
          <p className="mt-1.5 text-sm text-slate-400">Riwayat keputusan yang telah Anda proses.</p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {[["Total Riwayat", rows.length, "slate"], ["Disetujui", totalApproved, "emerald"], ["Ditolak", totalRejected, "red"]].map(([label, val, color]) => (
            <div key={label as string} className={`rounded-3xl border p-6 shadow-sm border-${color}-100 bg-${color}-50/60`}>
              <p className={`text-xs font-bold uppercase tracking-wide text-${color}-600`}>{label}</p>
              <p className={`mt-2 text-4xl font-extrabold text-${color}-800`}>{val}</p>
            </div>
          ))}
        </div>

        <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-5">
            <div className="flex gap-2">
              {(["semua", "Cuti", "Izin"] as const).map((k) => (
                <button key={k} onClick={() => setKategori(k)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${kategori === k ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {k === "semua" ? "Semua" : k}
                </button>
              ))}
            </div>
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari nama, NIP..."
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
          </div>

          {loading ? <p className="text-sm text-slate-400 py-6 text-center">Memuat riwayat...</p>
            : rows.length === 0 ? <div className="rounded-2xl bg-slate-50 p-6 text-sm font-semibold text-slate-500 text-center">Belum ada riwayat approval.</div>
            : (
              <div className="space-y-3">
                {rows.map((item) => (
                  <div key={`${item.kategori}-${item.id}`} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:-translate-y-0.5 transition">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-bold">{item.kategori}</span>
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(item.status)}`}>{item.status}</span>
                        </div>
                        <p className="text-lg font-extrabold text-slate-900">{item.nama}</p>
                        <p className="text-sm text-slate-500">{item.nip} · {item.jabatan} · {item.unit}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-800">{item.jenis}</p>
                        <p className="text-sm text-slate-500">{item.periode}</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl bg-indigo-50/60 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 mb-1">Catatan Anda</p>
                      <p className="text-sm font-semibold text-slate-700">{item.catatan}</p>
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
