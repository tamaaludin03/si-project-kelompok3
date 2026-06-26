"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

function extractItems(p: any): any[] {
  if (Array.isArray(p?.data?.items)) return p.data.items;
  if (Array.isArray(p?.items)) return p.items;
  if (Array.isArray(p?.data)) return p.data;
  if (Array.isArray(p)) return p;
  return [];
}

function fmt(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

type ModalState = { id: number; action: "approve" | "reject" } | null;

export default function DirekturApprovalCutiPage() {
  const router = useRouter();
  const [list, setList]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [keyword, setKeyword]   = useState("");
  const [modal, setModal]       = useState<ModalState>(null);
  const [catatan, setCatatan]   = useState("");
  const [alasan, setAlasan]     = useState("");
  const [submitting, setSub]    = useState(false);
  const [toast, setToast]       = useState("");

  function authHeaders(): HeadersInit {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function load() {
    setLoading(true);
    const res  = await fetch(`${API_BASE_URL}/cuti/direktur/pending`, { headers: authHeaders(), cache: "no-store" });
    setList(res.ok ? extractItems(await res.json().catch(() => null)) : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const rows = useMemo(() =>
    list.filter((i) => {
      const q = keyword.toLowerCase();
      return !q || [(i.pegawai?.nama || ""), (i.pegawai?.nip || ""), (i.pegawai?.unit || "")]
        .some((v) => v.toLowerCase().includes(q));
    }),
    [list, keyword]
  );

  async function handleAction() {
    if (!modal) return;
    const nip = localStorage.getItem("nip");
    if (!nip) { setToast("NIP tidak ditemukan, login ulang."); return; }
    if (modal.action === "reject" && !alasan.trim()) { setToast("Alasan penolakan wajib diisi."); return; }

    const action = modal.action === "approve" ? "approve-direktur" : "reject-direktur";
    const body = modal.action === "approve"
      ? { nip, catatan: catatan.trim() || undefined }
      : { nip, alasan: alasan.trim() };

    setSub(true);
    try {
      const res = await fetch(`${API_BASE_URL}/cuti/${modal.id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Gagal memproses.");
      setToast(modal.action === "approve" ? "Berhasil disetujui." : "Berhasil ditolak.");
      setModal(null); setCatatan(""); setAlasan("");
      await load();
    } catch (e: any) {
      setToast(e.message || "Terjadi kesalahan.");
    } finally {
      setSub(false);
    }
  }

  return (
    <main className="min-h-screen bg-transparent px-3 py-4 sm:px-6 sm:py-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xl">
          {toast}
          <button onClick={() => setToast("")} className="text-slate-400 hover:text-white">×</button>
        </div>
      )}

      <div className="mx-auto max-w-5xl space-y-5">
        {/* Header */}
        <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
          <button onClick={() => router.back()}
            className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-400 transition hover:text-slate-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            Kembali
          </button>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-500">Direktur</p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">Approval Cuti</h1>
          <p className="mt-1.5 text-sm text-slate-400">Pengajuan cuti dari Kepala Bagian yang memerlukan keputusan Anda.</p>
        </section>

        {/* Search */}
        <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari nama, NIP, atau unit..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:bg-white" />
          </div>
        </section>

        {/* List */}
        {loading ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            <p className="mt-3 text-sm text-slate-400">Memuat data pengajuan cuti...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              {list.length === 0 ? "Tidak ada pengajuan cuti yang menunggu persetujuan." : "Tidak ada hasil yang sesuai."}
            </p>
          </div>
        ) : (
          <>
            <p className="px-1 text-xs font-semibold text-slate-400">{rows.length} pengajuan menunggu persetujuan</p>
            <div className="space-y-3">
              {rows.map((item) => (
                <div key={item.id} className={`rounded-3xl border bg-white shadow-sm ${item.is_urgent ? "border-amber-200" : "border-slate-100"}`}>
                  <div className={`flex flex-wrap items-start justify-between gap-3 rounded-t-3xl px-6 py-4 ${item.is_urgent ? "bg-amber-50/60" : "bg-slate-50/60"}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 font-extrabold text-violet-700">
                        {(item.pegawai?.nama || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">{item.pegawai?.nama || "-"}</p>
                        <p className="text-xs text-slate-500">NIP {item.pegawai?.nip} · {item.pegawai?.jabatan} · {item.pegawai?.unit}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {item.is_urgent && <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-700">⚡ Mendesak</span>}
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-700">Cuti</span>
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">{item.status}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Jenis Cuti</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{item.jenis_cuti ? "Cuti " + item.jenis_cuti.replace(/_/g," ").replace(/\b\w/g,(c:string)=>c.toUpperCase()) : "-"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Periode</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{fmt(item.tanggal_mulai)} – {fmt(item.tanggal_selesai)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Alasan</p>
                      <p className="mt-1 text-sm text-slate-600 line-clamp-2">{item.alasan || "-"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 border-t border-slate-100 px-6 py-4">
                    <button onClick={() => { setModal({ id: item.id, action: "approve" }); setCatatan(""); }}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 active:scale-95">
                      Setujui
                    </button>
                    <button onClick={() => { setModal({ id: item.id, action: "reject" }); setAlasan(""); }}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100 active:scale-95">
                      Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">
              {modal.action === "approve" ? "Konfirmasi Persetujuan" : "Konfirmasi Penolakan"}
            </h3>
            <p className="text-sm text-slate-400 mb-5">
              {modal.action === "approve" ? "Anda akan menyetujui pengajuan cuti ini." : "Anda akan menolak pengajuan cuti ini. Wajib mengisi alasan."}
            </p>
            {modal.action === "approve" ? (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Catatan (opsional)</label>
                <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3}
                  placeholder="Catatan untuk pegawai..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Alasan Penolakan *</label>
                <textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={3}
                  placeholder="Tuliskan alasan penolakan..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-rose-400" />
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setModal(null); setCatatan(""); setAlasan(""); }}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                Batal
              </button>
              <button onClick={handleAction} disabled={submitting}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-60 ${
                  modal.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
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
