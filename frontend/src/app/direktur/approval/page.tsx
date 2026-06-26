"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

type JenisPengajuan = "Cuti" | "Izin";

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

export default function DirekturApprovalPage() {
  const router = useRouter();
  const [cutiList, setCutiList] = useState<any[]>([]);
  const [izinList, setIzinList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kategori, setKategori] = useState<"semua" | JenisPengajuan>("semua");
  const [keyword, setKeyword] = useState("");
  const [modal, setModal] = useState<{ id: number; jenis: JenisPengajuan; action: "approve" | "reject" } | null>(null);
  const [catatan, setCatatan] = useState("");
  const [alasan, setAlasan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  async function loadData() {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    setLoading(true);

    const [cutiRes, izinRes] = await Promise.all([
      fetch(`${API_BASE_URL}/cuti/direktur/pending`, { headers, cache: "no-store" }),
      fetch(`${API_BASE_URL}/izin/direktur/pending`, { headers, cache: "no-store" }),
    ]);

    setCutiList(cutiRes.ok ? extractItems(await cutiRes.json().catch(() => null)) : []);
    setIzinList(izinRes.ok ? extractItems(await izinRes.json().catch(() => null)) : []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const rows = useMemo(() => {
    const cuti = cutiList.map((i) => ({ ...i, _jenis: "Cuti" as JenisPengajuan }));
    const izin = izinList.map((i) => ({ ...i, _jenis: "Izin" as JenisPengajuan }));
    const all = [...cuti, ...izin];
    return all
      .filter((i) => kategori === "semua" || i._jenis === kategori)
      .filter((i) => {
        const q = keyword.toLowerCase();
        const nama = (i.pegawai?.nama || "").toLowerCase();
        const nip = (i.pegawai?.nip || "").toLowerCase();
        return nama.includes(q) || nip.includes(q);
      });
  }, [cutiList, izinList, kategori, keyword]);

  async function handleAction() {
    if (!modal) return;
    const nip = localStorage.getItem("nip");
    if (!nip) { setToast("NIP tidak ditemukan, login ulang."); return; }

    const token = localStorage.getItem("token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const entity = modal.jenis === "Cuti" ? "cuti" : "izin";
    const action = modal.action === "approve" ? "approve" : "reject";
    const url = `${API_BASE_URL}/${entity}/${modal.id}/${action}-direktur`;

    const body = modal.action === "approve"
      ? { nip, catatan: catatan.trim() || undefined }
      : { nip, alasan: alasan.trim() };

    if (modal.action === "reject" && !alasan.trim()) {
      setToast("Alasan penolakan wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(url, { method: "PATCH", headers, body: JSON.stringify(body) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Gagal memproses");
      setToast(modal.action === "approve" ? "Berhasil disetujui." : "Berhasil ditolak.");
      setModal(null);
      setCatatan(""); setAlasan("");
      await loadData();
    } catch (err: any) {
      setToast(err.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="min-h-screen bg-transparent px-3 py-4 sm:px-6 sm:py-6 text-slate-900"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xl">
          {toast}
          <button onClick={() => setToast("")} className="ml-4 text-slate-400 hover:text-white">×</button>
        </div>
      )}

      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-8 shadow-sm">
          <button onClick={() => router.back()} className="mb-4 text-sm font-semibold text-slate-500 hover:text-slate-900">← Kembali</button>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-500">Direktur</p>
          <h1 className="mt-1.5 text-3xl font-extrabold text-slate-900">Persetujuan Pengajuan</h1>
          <p className="mt-1.5 text-sm text-slate-400">Pengajuan cuti dan izin dari Kepala Bagian yang memerlukan keputusan Anda.</p>
        </header>

        <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-5">
            <div className="flex gap-2">
              {(["semua", "Cuti", "Izin"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setKategori(k)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${kategori === k ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {k === "semua" ? "Semua" : k}
                </button>
              ))}
            </div>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari nama atau NIP..."
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          {loading ? (
            <p className="text-sm font-semibold text-slate-400 py-6 text-center">Memuat data...</p>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-sm font-semibold text-slate-500 text-center">
              Tidak ada pengajuan yang menunggu persetujuan.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((item) => (
                <div
                  key={`${item._jenis}-${item.id}`}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:-translate-y-0.5 transition"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-xs font-bold">{item._jenis}</span>
                        <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-bold">{item.status}</span>
                      </div>
                      <p className="text-lg font-extrabold text-slate-900">{item.pegawai?.nama || "-"}</p>
                      <p className="text-sm text-slate-500 mt-1">{item.pegawai?.nip} · {item.pegawai?.jabatan} · {item.pegawai?.unit}</p>
                      <p className="text-sm font-semibold text-slate-700 mt-2">
                        {item.jenis_cuti || item.jenis_izin || "-"}
                        {item.tanggal_mulai && ` · ${formatDate(item.tanggal_mulai)} – ${formatDate(item.tanggal_selesai)}`}
                        {item.tanggal && ` · ${formatDate(item.tanggal)}`}
                      </p>
                      {item.alasan && <p className="text-sm text-slate-500 mt-1 italic">"{item.alasan}"</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setModal({ id: item.id, jenis: item._jenis, action: "approve" }); setCatatan(""); }}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition"
                      >
                        Setujui
                      </button>
                      <button
                        onClick={() => { setModal({ id: item.id, jenis: item._jenis, action: "reject" }); setAlasan(""); }}
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 transition"
                      >
                        Tolak
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      {modal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <h3 className="text-xl font-extrabold text-slate-900 mb-2">
              {modal.action === "approve" ? "Konfirmasi Persetujuan" : "Konfirmasi Penolakan"}
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              {modal.action === "approve"
                ? "Anda akan menyetujui pengajuan ini sebagai keputusan final."
                : "Anda akan menolak pengajuan ini. Wajib mengisi alasan."}
            </p>
            {modal.action === "approve" ? (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Catatan (opsional)</label>
                <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3}
                  placeholder="Catatan untuk pegawai..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Alasan Penolakan *</label>
                <textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={3}
                  placeholder="Tuliskan alasan penolakan..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-400" />
              </div>
            )}
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => { setModal(null); setCatatan(""); setAlasan(""); }}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                Batal
              </button>
              <button onClick={handleAction} disabled={submitting}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-60 ${
                  modal.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                }`}>
                {submitting ? "Memproses..." : modal.action === "approve" ? "Ya, Setujui" : "Ya, Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
