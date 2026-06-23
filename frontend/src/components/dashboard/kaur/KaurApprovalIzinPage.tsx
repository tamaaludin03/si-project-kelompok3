"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

type IzinItem = {
  id: number;
  jenis_izin: string;
  tanggal: string;
  jam_mulai?: string | null;
  jam_selesai?: string | null;
  alasan?: string | null;
  status: string;
  is_urgent?: boolean;
  created_at: string;
  pegawai?: { nip?: string; nama?: string; jabatan?: string; unit?: string };
  lampiran?: { id?: number; nama_file?: string; path_file?: string }[];
};

function extractItems(payload: any): IzinItem[] {
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function statusClass(status?: string) {
  const v = (status || "").toLowerCase();
  if (v.includes("tolak") || v.includes("reject"))  return "border-rose-200 bg-rose-50 text-rose-700";
  if (v.includes("setuju") || v.includes("approve")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function statusLabel(status?: string) {
  const v = (status || "").toLowerCase();
  if (v.includes("tolak") || v.includes("reject"))  return "Ditolak";
  if (v.includes("setuju") || v.includes("approve")) return "Disetujui";
  return "Menunggu";
}

function formatJenis(value?: string) {
  if (!value) return "-";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getLampiranUrl(file?: any) {
  const raw = file?.path_file || file?.file_url || file?.url || "";
  if (!raw) return "#";
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("/")) return `${API_BASE_URL}${raw}`;
  return `${API_BASE_URL}/${raw}`;
}

const JENIS_FINAL_KAUR = ["pulang_awal", "keluar_jam_kerja", "terlambat", "tidak_apel"];

export default function KaurApprovalIzinPage() {
  const [items, setItems]           = useState<IzinItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [message, setMessage]       = useState("");
  const [msgType, setMsgType]       = useState<"error" | "success" | "info">("info");
  const [search, setSearch]         = useState("");
  const [modal, setModal]           = useState<{ open: boolean; type: "approve" | "reject"; item: IzinItem | null }>({ open: false, type: "approve", item: null });
  const [note, setNote]             = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const nip   = localStorage.getItem("nip") || "";
      const nipQuery = nip ? `?nip=${encodeURIComponent(nip)}` : "";
      const res   = await fetch(`${API_BASE_URL}/izin/kaur/pending${nipQuery}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setMessage("Gagal memuat data pengajuan izin."); setMsgType("error"); return; }
      setItems(extractItems(data));
      setMessage("");
    } catch {
      setMessage("Terjadi kesalahan. Silakan muat ulang halaman."); setMsgType("error");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    loadData();
    const t = window.setInterval(loadData, 300_000);
    return () => window.clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const pg = item.pegawai || {};
      return !q || [pg.nama, pg.nip, pg.jabatan, pg.unit, item.jenis_izin, item.alasan]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [items, search]);

  function openModal(type: "approve" | "reject", item: IzinItem) {
    setModal({ open: true, type, item }); setNote(""); setMessage("");
  }
  function closeModal() {
    if (submitting) return;
    setModal({ open: false, type: "approve", item: null }); setNote("");
  }

  async function submitDecision() {
    if (!modal.item) return;
    const trimmedNote = note.trim();
    if (!trimmedNote) {
      setMessage(modal.type === "approve" ? "Catatan persetujuan wajib diisi." : "Alasan penolakan wajib diisi.");
      setMsgType("error"); return;
    }
    try {
      setSubmitting(true); setMessage("");
      const token    = localStorage.getItem("token");
      const actorNip = localStorage.getItem("nip") || "";
      if (!actorNip) { setMessage("Data akun tidak ditemukan. Silakan login ulang."); setMsgType("error"); return; }
      const endpoint = modal.type === "approve"
        ? `${API_BASE_URL}/izin/${modal.item.id}/approve-kaur`
        : `${API_BASE_URL}/izin/${modal.item.id}/reject-kaur`;
      const body = modal.type === "approve"
        ? { nip: actorNip, catatan_kaur: trimmedNote, catatan: trimmedNote, note: trimmedNote }
        : { nip: actorNip, rejected_reason_kaur: trimmedNote, alasan: trimmedNote, reason: trimmedNote };
      const res  = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) { setMessage(json?.message || "Gagal memproses keputusan."); setMsgType("error"); return; }
      setMessage(modal.type === "approve" ? "Izin berhasil disetujui." : "Izin berhasil ditolak.");
      setMsgType("success");
      setItems((prev) => prev.filter((i) => i.id !== modal.item!.id));
      closeModal();
    } catch {
      setMessage("Terjadi kesalahan saat memproses keputusan."); setMsgType("error");
    } finally { setSubmitting(false); }
  }

  const msgCls = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    error:   "bg-rose-50 border-rose-200 text-rose-800",
    info:    "bg-amber-50 border-amber-200 text-amber-800",
  }[msgType];

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="min-h-screen bg-transparent">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      <div className="mx-auto max-w-6xl space-y-5 px-3 py-4 sm:px-6 sm:py-8">

        {/* Header */}
        <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-500">Kepala Unit</p>
              <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">Persetujuan Izin</h1>
              <p className="mt-1.5 text-sm text-slate-400">Pengajuan izin dari pegawai unit kerja Anda yang menunggu keputusan.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-2xl border border-violet-100 bg-violet-50 px-3.5 py-1.5 text-xs font-bold text-violet-700">
                {items.length} pengajuan
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

        {/* Search */}
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} type="text"
              placeholder="Cari nama, NIP, jabatan, unit, jenis izin..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 focus:bg-white" />
          </div>
        </section>

        {message && (
          <div className={`rounded-2xl border px-5 py-3.5 text-sm font-semibold ${msgCls}`}>{message}</div>
        )}

        {/* Content */}
        {loading ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
            <p className="mt-3 text-sm text-slate-400">Memuat data pengajuan izin...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Tidak ada pengajuan izin yang perlu diproses.</p>
          </div>
        ) : (
          <>
            <p className="px-1 text-xs font-semibold text-slate-400">Menampilkan {filtered.length} pengajuan</p>
            <div className="space-y-3">
              {filtered.map((item) => {
                const isFinalKaur = JENIS_FINAL_KAUR.includes(item.jenis_izin);
                const waktu = [formatDate(item.tanggal), item.jam_mulai, item.jam_selesai ? `– ${item.jam_selesai}` : ""].filter(Boolean).join(" ");
                const lampiran = item.lampiran || [];
                return (
                  <div key={item.id}
                    className={`rounded-3xl border bg-white shadow-sm transition hover:shadow-md ${item.is_urgent ? "border-amber-200" : "border-slate-100"}`}>
                    {/* Card header */}
                    <div className={`flex flex-wrap items-start justify-between gap-3 rounded-t-3xl px-3 py-3 sm:px-6 sm:py-4 ${item.is_urgent ? "bg-amber-50/60" : "bg-slate-50/60"}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-base font-extrabold text-emerald-700">
                          {(item.pegawai?.nama || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-slate-900">{item.pegawai?.nama || "-"}</p>
                          <p className="text-xs text-slate-500">NIP {item.pegawai?.nip || "-"} &nbsp;·&nbsp; {item.pegawai?.jabatan || "-"}</p>
                          <p className="text-xs text-slate-400">Unit: {item.pegawai?.unit || "-"}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.is_urgent && (
                          <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-700">⚡ Mendesak</span>
                        )}
                        {isFinalKaur ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">Persetujuan Final</span>
                        ) : (
                          <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-700">→ Kepala Bagian</span>
                        )}
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${statusClass(item.status)}`}>
                          {statusLabel(item.status)}
                        </span>
                      </div>
                    </div>
                    {/* Card body */}
                    <div className="grid grid-cols-1 gap-4 px-3 py-4 sm:px-6 sm:py-5 sm:grid-cols-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Jenis Izin</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{formatJenis(item.jenis_izin)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Waktu</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{waktu}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Alasan</p>
                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">{item.alasan || "-"}</p>
                      </div>
                    </div>
                    {/* Card footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-3 py-3 sm:px-6 sm:py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {lampiran.length === 0 ? (
                          <span className="text-xs text-slate-400">Tidak ada lampiran</span>
                        ) : lampiran.map((f, i) => {
                          const label = f.nama_file || `Lampiran ${i + 1}`;
                          return (
                            <a key={f.id || i} href={getLampiranUrl(f)} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100">
                              📎 {label.length > 20 ? label.slice(0, 20) + "…" : label}
                            </a>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => openModal("reject", item)}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100 active:scale-95">
                          Tolak
                        </button>
                        <button onClick={() => openModal("approve", item)}
                          className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95">
                          Setujui
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {modal.open && modal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-500">
              {modal.type === "approve" ? "Konfirmasi Persetujuan" : "Konfirmasi Penolakan"}
            </p>
            <h3 className="mt-1.5 text-xl font-extrabold text-slate-900">
              {modal.type === "approve" ? "Setujui Pengajuan Izin" : "Tolak Pengajuan Izin"}
            </h3>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-extrabold text-emerald-700">
                {(modal.item.pegawai?.nama || "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{modal.item.pegawai?.nama || "-"}</p>
                <p className="text-xs text-slate-500">
                  {formatJenis(modal.item.jenis_izin)} &nbsp;·&nbsp; {formatDate(modal.item.tanggal)}
                  {modal.item.jam_mulai ? ` · ${modal.item.jam_mulai}` : ""}
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-1.5">
              <label className="text-sm font-bold text-slate-700">
                {modal.type === "approve" ? "Catatan Persetujuan" : "Alasan Penolakan"}
                <span className="ml-1 text-rose-500">*</span>
              </label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4}
                placeholder={modal.type === "approve"
                  ? "Contoh: Disetujui, pengajuan sesuai ketentuan unit."
                  : "Contoh: Ditolak karena jadwal unit sedang penuh."}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />
              {message && <p className="text-xs font-semibold text-rose-600">{message}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeModal} disabled={submitting}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60">
                Batal
              </button>
              <button onClick={submitDecision} disabled={submitting}
                className={`rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-60 ${modal.type === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}>
                {submitting ? "Memproses..." : modal.type === "approve" ? "Setujui" : "Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
